-- =============================================================================
-- Complete ownership inheritance workflow
-- Safe, additive, backward-compatible, and ownership-source-of-truth aligned.
-- =============================================================================

alter table public.ownership_inheritance
  add column if not exists beneficiary_investor_id uuid
    references public.investors(id) on delete restrict;

alter table public.ownership_inheritance
  add column if not exists completed_by uuid
    references public.admins(id) on delete set null;

create index if not exists ownership_inheritance_beneficiary_investor_idx
  on public.ownership_inheritance(beneficiary_investor_id);

insert into public.permissions (key, module, action, description)
values
  (
    'ownership_inheritance.reject',
    'ownership_inheritance',
    'reject',
    'Menolak pengajuan pewarisan kepemilikan.'
  ),
  (
    'ownership_inheritance.complete',
    'ownership_inheritance',
    'complete',
    'Menyelesaikan pewarisan kepemilikan dan memindahkan unit kepada investor penerima.'
  )
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select distinct existing.role_id, target.id
from public.role_permissions existing
join public.permissions source on source.id = existing.permission_id
cross join public.permissions target
where source.key = 'ownership_inheritance.approve'
  and target.key in (
    'ownership_inheritance.reject',
    'ownership_inheritance.complete'
  )
on conflict do nothing;

create or replace function app.create_ownership_inheritance_request(
  p_holding_id uuid,
  p_beneficiary_name text,
  p_beneficiary_email text default null,
  p_beneficiary_phone text default null,
  p_units integer default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app.current_user_id();
  v_holding public.ownership_holdings;
  v_units integer;
  v_reserved_units integer;
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Anda harus masuk sebagai investor.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.investors i
    where i.id = v_user_id
      and i.status in ('approved', 'active')
  ) then
    raise exception 'Investor tidak memiliki akses.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_beneficiary_name, ''))) < 2 then
    raise exception 'Nama pewaris wajib diisi minimal 2 karakter.' using errcode = '22023';
  end if;

  select h.*
  into v_holding
  from public.ownership_holdings h
  where h.id = p_holding_id
  for update;

  if not found then
    raise exception 'Kepemilikan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_holding.investor_id <> v_user_id then
    raise exception 'Kepemilikan tersebut bukan milik Anda.' using errcode = '42501';
  end if;

  if v_holding.status <> 'active' then
    raise exception 'Hanya kepemilikan aktif yang dapat diajukan untuk pewarisan.' using errcode = '22023';
  end if;

  v_units := coalesce(p_units, v_holding.units);

  if v_units <= 0 then
    raise exception 'Jumlah unit pewarisan harus lebih besar dari 0.' using errcode = '22023';
  end if;

  select coalesce(sum(oi.units), 0)::integer
  into v_reserved_units
  from public.ownership_inheritance oi
  where oi.holding_id = p_holding_id
    and oi.status in ('pending', 'approved');

  if v_units > (v_holding.units - v_reserved_units) then
    raise exception 'Jumlah unit pewarisan melebihi unit yang tersedia.' using errcode = '22023';
  end if;

  insert into public.ownership_inheritance (
    holding_id,
    current_investor_id,
    beneficiary_name,
    beneficiary_email,
    beneficiary_phone,
    units,
    status,
    notes
  )
  values (
    p_holding_id,
    v_user_id,
    btrim(p_beneficiary_name),
    nullif(btrim(coalesce(p_beneficiary_email, '')), ''),
    nullif(btrim(coalesce(p_beneficiary_phone, '')), ''),
    v_units,
    'pending',
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function app.list_my_ownership_inheritance()
returns setof public.ownership_inheritance
language sql
stable
security definer
set search_path = ''
as $$
  select oi.*
  from public.ownership_inheritance oi
  where oi.current_investor_id = app.current_user_id()
  order by oi.requested_at desc;
$$;

create or replace function app.cancel_ownership_inheritance_request(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app.current_user_id();
  v_request public.ownership_inheritance;
begin
  if v_user_id is null then
    raise exception 'Anda harus masuk sebagai investor.' using errcode = '42501';
  end if;

  select oi.*
  into v_request
  from public.ownership_inheritance oi
  where oi.id = p_request_id
  for update;

  if not found then
    raise exception 'Pengajuan pewarisan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_request.current_investor_id <> v_user_id then
    raise exception 'Anda tidak berhak membatalkan pengajuan ini.' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Hanya pengajuan yang masih menunggu persetujuan yang dapat dibatalkan.' using errcode = '22023';
  end if;

  update public.ownership_inheritance
  set status = 'cancelled', updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function app.list_admin_ownership_inheritance()
returns setof public.ownership_inheritance
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_permission('ownership_inheritance.view') then
    raise exception 'Anda tidak memiliki izin untuk melihat pewarisan kepemilikan.' using errcode = '42501';
  end if;

  return query
  select oi.*
  from public.ownership_inheritance oi
  order by oi.requested_at desc;
end;
$$;

create or replace function app.approve_ownership_inheritance(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := app.current_user_id();
  v_request public.ownership_inheritance;
begin
  if not app.has_permission('ownership_inheritance.approve') then
    raise exception 'Anda tidak memiliki izin untuk menyetujui pewarisan kepemilikan.' using errcode = '42501';
  end if;

  select oi.* into v_request
  from public.ownership_inheritance oi
  where oi.id = p_request_id
  for update;

  if not found then
    raise exception 'Pengajuan pewarisan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Hanya pengajuan berstatus menunggu persetujuan yang dapat disetujui.' using errcode = '22023';
  end if;

  update public.ownership_inheritance
  set
    status = 'approved',
    approved_at = now(),
    approved_by = v_admin_id,
    rejection_reason = null,
    updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function app.reject_ownership_inheritance(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.ownership_inheritance;
begin
  if not app.has_permission('ownership_inheritance.reject') then
    raise exception 'Anda tidak memiliki izin untuk menolak pewarisan kepemilikan.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Alasan penolakan wajib diisi.' using errcode = '22023';
  end if;

  select oi.* into v_request
  from public.ownership_inheritance oi
  where oi.id = p_request_id
  for update;

  if not found then
    raise exception 'Pengajuan pewarisan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_request.status not in ('pending', 'approved') then
    raise exception 'Pengajuan pada tahap ini tidak dapat ditolak.' using errcode = '22023';
  end if;

  update public.ownership_inheritance
  set
    status = 'rejected',
    rejection_reason = btrim(p_reason),
    updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function app.complete_ownership_inheritance(
  p_request_id uuid,
  p_beneficiary_investor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := app.current_user_id();
  v_request public.ownership_inheritance;
  v_source public.ownership_holdings;
  v_offering public.ownership_offerings;
  v_new_holding_id uuid;
  v_transferred_bps integer;
  v_remaining_units integer;
  v_remaining_bps integer;
begin
  if not app.has_permission('ownership_inheritance.complete') then
    raise exception 'Anda tidak memiliki izin untuk menyelesaikan pewarisan kepemilikan.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.investors i
    where i.id = p_beneficiary_investor_id
      and i.status in ('approved', 'active')
  ) then
    raise exception 'Investor penerima harus berstatus approved atau active.' using errcode = '22023';
  end if;

  select oi.* into v_request
  from public.ownership_inheritance oi
  where oi.id = p_request_id
  for update;

  if not found then
    raise exception 'Pengajuan pewarisan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'approved' then
    raise exception 'Hanya pengajuan yang telah disetujui yang dapat diselesaikan.' using errcode = '22023';
  end if;

  if v_request.current_investor_id = p_beneficiary_investor_id then
    raise exception 'Investor asal dan investor penerima tidak boleh sama.' using errcode = '22023';
  end if;

  select h.* into v_source
  from public.ownership_holdings h
  where h.id = v_request.holding_id
  for update;

  if not found then
    raise exception 'Holding sumber tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_source.status <> 'active'
     or v_source.investor_id <> v_request.current_investor_id then
    raise exception 'Holding sumber tidak lagi valid untuk penyelesaian pewarisan.' using errcode = '22023';
  end if;

  if v_source.units < v_request.units then
    raise exception 'Unit holding sumber tidak mencukupi.' using errcode = '22023';
  end if;

  select o.* into v_offering
  from public.ownership_offerings o
  where o.id = v_source.offering_id;

  if not found then
    raise exception 'Penawaran kepemilikan terkait tidak ditemukan.' using errcode = 'P0002';
  end if;

  v_transferred_bps := v_request.units * v_offering.unit_ownership_bps;
  v_remaining_units := v_source.units - v_request.units;
  v_remaining_bps := v_source.ownership_bps - v_transferred_bps;

  if v_transferred_bps <= 0 or v_transferred_bps > v_source.ownership_bps then
    raise exception 'Porsi kepemilikan hasil pewarisan tidak valid.' using errcode = '22023';
  end if;

  insert into public.ownership_holdings (
    offering_id,
    investor_id,
    units,
    ownership_bps,
    acquisition_at,
    transfer_eligible_at,
    status,
    acquisition_reference,
    notes,
    created_by,
    updated_by
  )
  values (
    v_source.offering_id,
    p_beneficiary_investor_id,
    v_request.units,
    v_transferred_bps,
    now(),
    greatest(now(), v_source.transfer_eligible_at),
    'active',
    'INH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    'Kepemilikan hasil penyelesaian pewarisan.',
    v_admin_id,
    v_admin_id
  )
  returning id into v_new_holding_id;

  if v_remaining_units = 0 then
    update public.ownership_holdings
    set
      units = v_source.units,
      ownership_bps = v_source.ownership_bps,
      status = 'transferred',
      updated_by = v_admin_id,
      updated_at = now()
    where id = v_source.id;
  else
    update public.ownership_holdings
    set
      units = v_remaining_units,
      ownership_bps = v_remaining_bps,
      updated_by = v_admin_id,
      updated_at = now()
    where id = v_source.id;
  end if;

  update public.ownership_inheritance
  set
    beneficiary_investor_id = p_beneficiary_investor_id,
    status = 'completed',
    completed_at = now(),
    completed_by = v_admin_id,
    updated_at = now()
  where id = p_request_id;

  return v_new_holding_id;
end;
$$;

revoke all on function app.create_ownership_inheritance_request(uuid,text,text,text,integer,text) from public;
revoke all on function app.list_my_ownership_inheritance() from public;
revoke all on function app.cancel_ownership_inheritance_request(uuid) from public;
revoke all on function app.list_admin_ownership_inheritance() from public;
revoke all on function app.approve_ownership_inheritance(uuid) from public;
revoke all on function app.reject_ownership_inheritance(uuid,text) from public;
revoke all on function app.complete_ownership_inheritance(uuid,uuid) from public;

grant execute on function app.create_ownership_inheritance_request(uuid,text,text,text,integer,text) to authenticated;
grant execute on function app.list_my_ownership_inheritance() to authenticated;
grant execute on function app.cancel_ownership_inheritance_request(uuid) to authenticated;
grant execute on function app.list_admin_ownership_inheritance() to authenticated;
grant execute on function app.approve_ownership_inheritance(uuid) to authenticated;
grant execute on function app.reject_ownership_inheritance(uuid,text) to authenticated;
grant execute on function app.complete_ownership_inheritance(uuid,uuid) to authenticated;

grant select on public.ownership_inheritance to authenticated;

drop policy if exists ownership_inheritance_investor_read on public.ownership_inheritance;
create policy ownership_inheritance_investor_read
on public.ownership_inheritance
for select
to authenticated
using (
  current_investor_id = app.current_user_id()
  or app.has_permission('ownership_inheritance.view')
);

create or replace function app.emit_ownership_inheritance_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.units is distinct from old.units
     or new.beneficiary_investor_id is distinct from old.beneficiary_investor_id then
    perform app.emit_event(
      app.topic_investor(new.current_investor_id),
      'ownership.changed',
      'ownership_inheritance',
      new.id,
      v_actor
    );

    if new.beneficiary_investor_id is not null
       and new.beneficiary_investor_id is distinct from new.current_investor_id then
      perform app.emit_event(
        app.topic_investor(new.beneficiary_investor_id),
        'ownership.changed',
        'ownership_inheritance',
        new.id,
        v_actor
      );
    end if;

    perform app.emit_event(
      app.topic_admin(),
      'ownership.changed',
      'ownership_inheritance',
      new.id,
      v_actor
    );
  end if;

  return null;
end;
$$;

drop trigger if exists ownership_inheritance_emit_events
  on public.ownership_inheritance;

create trigger ownership_inheritance_emit_events
after insert or update on public.ownership_inheritance
for each row execute function app.emit_ownership_inheritance_events();

revoke execute on function app.emit_ownership_inheritance_events() from public, anon, authenticated;
