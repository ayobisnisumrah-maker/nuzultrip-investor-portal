-- =============================================================================
-- Harden inheritance cross-module consistency.
-- Additive/backward-compatible; no existing business row is rewritten here.
-- =============================================================================

alter table public.ownership_inheritance
  add column if not exists beneficiary_holding_id uuid
    references public.ownership_holdings(id) on delete restrict,
  add column if not exists inherited_ownership_bps integer;

create index if not exists ownership_inheritance_beneficiary_holding_idx
  on public.ownership_inheritance(beneficiary_holding_id);

-- Inheritance and transfer/sale reserve from the same canonical holding.
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
  v_reserved_inheritance integer;
  v_reserved_transfer integer;
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Anda harus masuk sebagai investor.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.investors i
    where i.id=v_user_id and i.status in ('approved','active')
  ) then
    raise exception 'Investor tidak memiliki akses.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_beneficiary_name,''))) < 2 then
    raise exception 'Nama pewaris wajib diisi minimal 2 karakter.' using errcode='22023';
  end if;

  select h.* into v_holding
  from public.ownership_holdings h
  where h.id=p_holding_id
  for update;

  if not found then raise exception 'Kepemilikan tidak ditemukan.' using errcode='P0002'; end if;
  if v_holding.investor_id <> v_user_id then
    raise exception 'Kepemilikan tersebut bukan milik Anda.' using errcode='42501';
  end if;
  if v_holding.status <> 'active' then
    raise exception 'Hanya kepemilikan aktif yang dapat diajukan untuk pewarisan.' using errcode='22023';
  end if;

  v_units := coalesce(p_units,v_holding.units);
  if v_units <= 0 then
    raise exception 'Jumlah unit pewarisan harus lebih besar dari 0.' using errcode='22023';
  end if;

  select coalesce(sum(oi.units),0)::integer into v_reserved_inheritance
  from public.ownership_inheritance oi
  where oi.holding_id=p_holding_id and oi.status in ('pending','approved');

  select coalesce(sum(t.units),0)::integer into v_reserved_transfer
  from public.ownership_transfers t
  where t.holding_id=p_holding_id and t.status in ('pending','approved','processing');

  if v_units > (v_holding.units-v_reserved_inheritance-v_reserved_transfer) then
    raise exception 'Jumlah unit pewarisan melebihi unit yang tersedia karena ada proses transfer, penjualan, atau pewarisan aktif.' using errcode='22023';
  end if;

  insert into public.ownership_inheritance(
    holding_id,current_investor_id,beneficiary_name,beneficiary_email,
    beneficiary_phone,units,status,notes
  ) values (
    p_holding_id,v_user_id,btrim(p_beneficiary_name),
    nullif(btrim(coalesce(p_beneficiary_email,'')),''),
    nullif(btrim(coalesce(p_beneficiary_phone,'')),''),
    v_units,'pending',nullif(btrim(coalesce(p_notes,'')),'')
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function app.create_ownership_sale_request(
  p_holding_id uuid,
  p_units integer,
  p_requested_unit_price numeric,
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
  v_reserved_sale_units integer;
  v_reserved_inheritance_units integer;
  v_available_units integer;
  v_transfer_id uuid;
begin
  if v_user_id is null then
    raise exception 'Anda harus masuk sebagai investor.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.investors i
    where i.id=v_user_id and i.status in ('approved','active')
  ) then
    raise exception 'Investor tidak memiliki akses untuk mengajukan penjualan saham.' using errcode='42501';
  end if;
  if p_units is null or p_units <= 0 then
    raise exception 'Jumlah unit yang dijual harus lebih besar dari 0.' using errcode='22023';
  end if;
  if p_requested_unit_price is null or p_requested_unit_price <= 0 then
    raise exception 'Harga penawaran per unit harus lebih besar dari 0.' using errcode='22023';
  end if;

  select h.* into v_holding
  from public.ownership_holdings h
  where h.id=p_holding_id
  for update;

  if not found then raise exception 'Kepemilikan tidak ditemukan.' using errcode='P0002'; end if;
  if v_holding.investor_id <> v_user_id then
    raise exception 'Anda tidak berhak menjual kepemilikan ini.' using errcode='42501';
  end if;
  if v_holding.status <> 'active' then
    raise exception 'Hanya kepemilikan aktif yang dapat dijual.' using errcode='22023';
  end if;
  if v_holding.transfer_eligible_at > now() then
    raise exception 'Kepemilikan ini belum memenuhi tanggal minimum transfer.' using errcode='22023';
  end if;

  select coalesce(sum(t.units),0)::integer into v_reserved_sale_units
  from public.ownership_transfers t
  where t.holding_id=p_holding_id
    and t.transfer_kind='sale'
    and t.status in ('pending','approved','processing');

  select coalesce(sum(oi.units),0)::integer into v_reserved_inheritance_units
  from public.ownership_inheritance oi
  where oi.holding_id=p_holding_id and oi.status in ('pending','approved');

  v_available_units := v_holding.units-v_reserved_sale_units-v_reserved_inheritance_units;
  if v_available_units <= 0 then
    raise exception 'Seluruh unit pada kepemilikan ini sedang berada dalam proses penjualan, transfer, atau pewarisan.' using errcode='22023';
  end if;
  if p_units > v_available_units then
    raise exception 'Jumlah unit melebihi unit yang tersedia. Tersedia: % unit.',v_available_units using errcode='22023';
  end if;

  insert into public.ownership_transfers(
    holding_id,from_investor_id,to_investor_id,units,requested_at,
    eligible_at,status,notes,transfer_kind,requested_unit_price
  ) values (
    v_holding.id,v_user_id,null,p_units,now(),v_holding.transfer_eligible_at,
    'pending',nullif(btrim(coalesce(p_notes,'')),''),'sale',p_requested_unit_price
  ) returning id into v_transfer_id;

  return v_transfer_id;
end;
$$;

-- Persist completion lineage to the newly-created canonical holding.
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
    raise exception 'Anda tidak memiliki izin untuk menyelesaikan pewarisan kepemilikan.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.investors i
    where i.id=p_beneficiary_investor_id and i.status in ('approved','active')
  ) then
    raise exception 'Investor penerima harus berstatus approved atau active.' using errcode='22023';
  end if;

  select oi.* into v_request
  from public.ownership_inheritance oi
  where oi.id=p_request_id
  for update;

  if not found then raise exception 'Pengajuan pewarisan tidak ditemukan.' using errcode='P0002'; end if;
  if v_request.status <> 'approved' then
    raise exception 'Hanya pengajuan yang telah disetujui yang dapat diselesaikan.' using errcode='22023';
  end if;
  if v_request.current_investor_id=p_beneficiary_investor_id then
    raise exception 'Investor asal dan investor penerima tidak boleh sama.' using errcode='22023';
  end if;

  select h.* into v_source
  from public.ownership_holdings h
  where h.id=v_request.holding_id
  for update;

  if not found then raise exception 'Holding sumber tidak ditemukan.' using errcode='P0002'; end if;
  if v_source.status <> 'active' or v_source.investor_id <> v_request.current_investor_id then
    raise exception 'Holding sumber tidak lagi valid untuk penyelesaian pewarisan.' using errcode='22023';
  end if;
  if v_source.units < v_request.units then
    raise exception 'Unit holding sumber tidak mencukupi.' using errcode='22023';
  end if;

  select o.* into v_offering
  from public.ownership_offerings o
  where o.id=v_source.offering_id
  for share;
  if not found then raise exception 'Penawaran kepemilikan terkait tidak ditemukan.' using errcode='P0002'; end if;

  v_transferred_bps := v_request.units*v_offering.unit_ownership_bps;
  v_remaining_units := v_source.units-v_request.units;
  v_remaining_bps := v_source.ownership_bps-v_transferred_bps;

  if v_transferred_bps <= 0 or v_transferred_bps > v_source.ownership_bps then
    raise exception 'Porsi kepemilikan hasil pewarisan tidak valid.' using errcode='23514';
  end if;

  insert into public.ownership_holdings(
    offering_id,investor_id,units,ownership_bps,acquisition_at,
    transfer_eligible_at,status,acquisition_reference,notes,created_by,updated_by
  ) values (
    v_source.offering_id,p_beneficiary_investor_id,v_request.units,v_transferred_bps,now(),
    greatest(now(),v_source.transfer_eligible_at),'active',
    'INH-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
    'Kepemilikan hasil penyelesaian pewarisan.',v_admin_id,v_admin_id
  ) returning id into v_new_holding_id;

  if v_remaining_units=0 then
    update public.ownership_holdings
    set status='transferred',updated_by=v_admin_id,updated_at=now()
    where id=v_source.id;
  else
    if v_remaining_bps <= 0 then
      raise exception 'Sisa porsi kepemilikan tidak valid.' using errcode='23514';
    end if;
    update public.ownership_holdings
    set units=v_remaining_units,ownership_bps=v_remaining_bps,
        updated_by=v_admin_id,updated_at=now()
    where id=v_source.id;
  end if;

  update public.ownership_inheritance
  set beneficiary_investor_id=p_beneficiary_investor_id,
      beneficiary_holding_id=v_new_holding_id,
      inherited_ownership_bps=v_transferred_bps,
      status='completed',completed_at=now(),completed_by=v_admin_id,updated_at=now()
  where id=p_request_id;

  return v_new_holding_id;
end;
$$;

-- Database-level audit guarantees every RPC transition is recorded atomically.
create or replace function app.audit_ownership_inheritance_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_summary text;
begin
  if tg_op='INSERT' then
    v_action := 'ownership_inheritance.create';
    v_summary := 'Pengajuan pewarisan kepemilikan dibuat.';
  elsif new.status is not distinct from old.status then
    return null;
  else
    v_action := case new.status
      when 'cancelled' then 'ownership_inheritance.cancel'
      when 'approved' then 'ownership_inheritance.approve'
      when 'rejected' then 'ownership_inheritance.reject'
      when 'completed' then 'ownership_inheritance.complete'
      else 'ownership_inheritance.update'
    end;
    v_summary := case new.status
      when 'cancelled' then 'Pengajuan pewarisan kepemilikan dibatalkan.'
      when 'approved' then 'Pengajuan pewarisan kepemilikan disetujui.'
      when 'rejected' then 'Pengajuan pewarisan kepemilikan ditolak.'
      when 'completed' then 'Pewarisan kepemilikan diselesaikan dan cap table diperbarui.'
      else 'Status pengajuan pewarisan kepemilikan diperbarui.'
    end;
  end if;

  insert into public.audit_logs(
    actor_id,actor_type,action,entity_type,entity_id,summary,changes
  ) values (
    app.current_user_id(),app.current_actor_type(),v_action,'ownership_inheritance',new.id,v_summary,
    jsonb_build_object(
      'status_before',case when tg_op='INSERT' then null else old.status::text end,
      'status_after',new.status::text,
      'holding_id',new.holding_id,
      'units',new.units,
      'beneficiary_investor_id',new.beneficiary_investor_id,
      'beneficiary_holding_id',new.beneficiary_holding_id
    )
  );
  return null;
end;
$$;

drop trigger if exists ownership_inheritance_audit_lifecycle on public.ownership_inheritance;
create trigger ownership_inheritance_audit_lifecycle
after insert or update on public.ownership_inheritance
for each row execute function app.audit_ownership_inheritance_lifecycle();
revoke execute on function app.audit_ownership_inheritance_lifecycle() from public,anon,authenticated;

-- Status notifications use the canonical notifications/outbox/realtime pipeline.
create or replace function app.notify_ownership_inheritance_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then return null; end if;

  if new.status='approved' then
    insert into public.notifications(investor_id,kind,title,message,link)
    values(new.current_investor_id,'investment_updated','Pewarisan disetujui',
      'Pengajuan pewarisan kepemilikan Anda telah disetujui dan menunggu penyelesaian.',
      '/investor/ownership/inheritance');
  elsif new.status='rejected' then
    insert into public.notifications(investor_id,kind,title,message,link)
    values(new.current_investor_id,'investment_updated','Pewarisan ditolak',
      'Pengajuan pewarisan kepemilikan Anda ditolak. Lihat detail pengajuan untuk alasan penolakan.',
      '/investor/ownership/inheritance');
  elsif new.status='completed' then
    insert into public.notifications(investor_id,kind,title,message,link)
    values(new.current_investor_id,'investment_updated','Pewarisan selesai',
      'Pengajuan pewarisan kepemilikan Anda telah selesai dan cap table resmi telah diperbarui.',
      '/investor/ownership/inheritance');

    if new.beneficiary_investor_id is not null
       and new.beneficiary_investor_id is distinct from new.current_investor_id then
      insert into public.notifications(investor_id,kind,title,message,link)
      values(new.beneficiary_investor_id,'investment_updated','Kepemilikan diterima',
        'Kepemilikan hasil pewarisan telah tercatat pada akun investor Anda.',
        '/investor/ownership');
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists ownership_inheritance_notify_status on public.ownership_inheritance;
create trigger ownership_inheritance_notify_status
after update on public.ownership_inheritance
for each row execute function app.notify_ownership_inheritance_status();
revoke execute on function app.notify_ownership_inheritance_status() from public,anon,authenticated;
