-- Verified investor identity lock, controlled profile change requests, and training accounts.
-- Legal holder identity is immutable after verification. Holder changes must use the
-- existing inheritance or share-sale/transfer lifecycle instead of editing identity.

alter table public.investors
  add column if not exists is_training boolean not null default false;

comment on column public.investors.is_training is
  'Training/demo account. Training investors are barred from canonical ownership and distribution records.';

create table public.investor_profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  requested_changes jsonb not null,
  reason text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.admins(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text,
  applied_by uuid references public.admins(id) on delete restrict,
  applied_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investor_profile_change_requests_changes_object
    check (jsonb_typeof(requested_changes) = 'object' and requested_changes <> '{}'::jsonb),
  constraint investor_profile_change_requests_reason_not_blank check (length(btrim(reason)) > 0),
  constraint investor_profile_change_requests_status_valid
    check (status in ('pending','approved','rejected','applied','cancelled')),
  constraint investor_profile_change_requests_review_consistent check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
    or (status in ('approved','rejected','applied') and reviewed_by is not null and reviewed_at is not null)
  ),
  constraint investor_profile_change_requests_apply_consistent check (
    status <> 'applied' or (applied_by is not null and applied_at is not null)
  )
);

create unique index investor_profile_change_requests_one_open_idx
  on public.investor_profile_change_requests(investor_id)
  where status in ('pending','approved');
create index investor_profile_change_requests_status_idx
  on public.investor_profile_change_requests(status, requested_at desc);

create trigger investor_profile_change_requests_set_updated_at
  before update on public.investor_profile_change_requests
  for each row execute function app.set_updated_at();

alter table public.investor_profile_change_requests enable row level security;
alter table public.investor_profile_change_requests force row level security;
revoke all on public.investor_profile_change_requests from anon, authenticated;
grant select on public.investor_profile_change_requests to authenticated;
grant all on public.investor_profile_change_requests to service_role;

create policy investor_profile_change_requests_read
  on public.investor_profile_change_requests for select to authenticated
  using (
    investor_id = app.current_user_id()
    or app.has_permission('investors.view')
    or app.has_permission('investors.update')
  );

create or replace function app.validate_investor_profile_change_payload(p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'Perubahan profil wajib berisi sedikitnya satu field.' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_changes)
  loop
    if v_key not in (
      'email', 'whatsapp_number', 'country', 'city', 'address',
      'organization_name', 'organization_role',
      'bank_name', 'bank_account_name', 'bank_account_number'
    ) then
      raise exception 'Field profil % tidak dapat diajukan untuk perubahan.', v_key using errcode = '22023';
    end if;
  end loop;

  if p_changes ? 'email' and (
    jsonb_typeof(p_changes->'email') <> 'string'
    or length(btrim(p_changes->>'email')) < 3
    or position('@' in p_changes->>'email') < 2
  ) then
    raise exception 'Alamat email perubahan tidak valid.' using errcode = '22023';
  end if;

  if p_changes ? 'country' and p_changes->'country' <> 'null'::jsonb
     and (jsonb_typeof(p_changes->'country') <> 'string' or btrim(p_changes->>'country') !~ '^[A-Z]{2}$') then
    raise exception 'Kode negara wajib dua huruf ISO kapital.' using errcode = '22023';
  end if;

  if p_changes ? 'whatsapp_number' and p_changes->'whatsapp_number' <> 'null'::jsonb
     and (jsonb_typeof(p_changes->'whatsapp_number') <> 'string' or length(btrim(p_changes->>'whatsapp_number')) < 6) then
    raise exception 'Nomor WhatsApp perubahan tidak valid.' using errcode = '22023';
  end if;

  if p_changes ? 'bank_account_number' and p_changes->'bank_account_number' <> 'null'::jsonb
     and (jsonb_typeof(p_changes->'bank_account_number') <> 'string' or btrim(p_changes->>'bank_account_number') !~ '^[0-9 .-]{4,40}$') then
    raise exception 'Nomor rekening perubahan tidak valid.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function app.validate_investor_profile_change_payload(jsonb) from public, anon, authenticated;

create or replace function app.guard_verified_investor_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id text := current_setting('app.investor_profile_change_request_id', true);
begin
  if old.status in ('approved','active','inactive') then
    -- Legal identity is permanently frozen after verification, even when the caller
    -- is an administrator or service-role operation. The holder may only change
    -- through inheritance or ownership transfer/share-sale.
    if new.legal_name is distinct from old.legal_name
       or new.identity_number_hash is distinct from old.identity_number_hash
       or new.ktp_storage_bucket is distinct from old.ktp_storage_bucket
       or new.ktp_storage_path is distinct from old.ktp_storage_path
       or new.ktp_original_file_name is distinct from old.ktp_original_file_name
       or new.ktp_mime_type is distinct from old.ktp_mime_type
       or new.ktp_file_size_bytes is distinct from old.ktp_file_size_bytes
       or new.ktp_uploaded_at is distinct from old.ktp_uploaded_at then
      raise exception 'Nama legal dan identitas investor terkunci setelah verifikasi. Gunakan waris atau transfer/jual saham untuk perubahan pemegang.'
        using errcode = '42501';
    end if;

    if new.whatsapp_number is distinct from old.whatsapp_number
       or new.country is distinct from old.country
       or new.city is distinct from old.city
       or new.address is distinct from old.address
       or new.organization_name is distinct from old.organization_name
       or new.organization_role is distinct from old.organization_role
       or new.bank_name is distinct from old.bank_name
       or new.bank_account_name is distinct from old.bank_account_name
       or new.bank_account_number is distinct from old.bank_account_number then
      if v_request_id is null or v_request_id = '' then
        raise exception 'Kontak, alamat, organisasi, dan rekening investor terverifikasi hanya dapat diubah melalui pengajuan perubahan yang disetujui.'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger investors_verified_profile_guard
  before update on public.investors
  for each row execute function app.guard_verified_investor_profile();

revoke all on function app.guard_verified_investor_profile() from public, anon, authenticated;

create or replace function app.guard_training_investor_canonical_data()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_investor_id uuid;
begin
  v_investor_id := case tg_table_name
    when 'ownership_holdings' then new.investor_id
    when 'profit_distribution_allocations' then new.investor_id
    else null
  end;

  if v_investor_id is not null and exists (
    select 1 from public.investors i where i.id = v_investor_id and i.is_training
  ) then
    raise exception 'Akun training tidak boleh masuk ke kepemilikan atau distribusi canonical.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger ownership_holdings_block_training
  before insert or update of investor_id on public.ownership_holdings
  for each row execute function app.guard_training_investor_canonical_data();
create trigger profit_distribution_allocations_block_training
  before insert or update of investor_id on public.profit_distribution_allocations
  for each row execute function app.guard_training_investor_canonical_data();

revoke all on function app.guard_training_investor_canonical_data() from public, anon, authenticated;

create or replace function app.guard_investor_training_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_training and not old.is_training then
    if exists (select 1 from public.ownership_holdings h where h.investor_id = new.id)
       or exists (select 1 from public.profit_distribution_allocations a where a.investor_id = new.id)
       or exists (select 1 from public.profit_distribution_payment_proofs p where p.investor_id = new.id)
       or exists (select 1 from public.ownership_transfers t where t.from_investor_id = new.id or t.to_investor_id = new.id)
       or exists (select 1 from public.ownership_inheritance x where x.current_investor_id = new.id or x.beneficiary_investor_id = new.id)
       or exists (select 1 from public.finance_invoices f where f.investor_id = new.id) then
      raise exception 'Bersihkan seluruh data canonical investor sebelum menandai akun sebagai training.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger investors_training_mode_guard
  before update of is_training on public.investors
  for each row execute function app.guard_investor_training_mode();
revoke all on function app.guard_investor_training_mode() from public, anon, authenticated;

create or replace function app.request_investor_profile_change(p_changes jsonb, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_investor public.investors%rowtype;
  v_id uuid;
begin
  select * into v_investor from public.investors where id = v_actor;
  if not found then
    raise exception 'Investor tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_investor.status not in ('approved','active','inactive') then
    raise exception 'Pengajuan perubahan tersedia setelah investor diverifikasi.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) = 0 then
    raise exception 'Alasan perubahan wajib diisi.' using errcode = '22023';
  end if;
  perform app.validate_investor_profile_change_payload(p_changes);

  insert into public.investor_profile_change_requests(investor_id, requested_changes, reason)
  values (v_actor, p_changes, btrim(p_reason))
  returning id into v_id;

  insert into public.audit_logs(actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (v_actor, app.current_actor_type(), 'investor.profile_change_requested', 'investor_profile_change_request', v_id,
          'Investor mengajukan perubahan data profil terverifikasi.', p_changes);
  return v_id;
end;
$$;

create or replace function app.cancel_investor_profile_change_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
begin
  update public.investor_profile_change_requests
  set status='cancelled', cancelled_at=now()
  where id=p_request_id and investor_id=v_actor and status='pending';
  if not found then raise exception 'Pengajuan tidak ditemukan atau tidak dapat dibatalkan.' using errcode='P0002'; end if;

  insert into public.audit_logs(actor_id, actor_type, action, entity_type, entity_id, summary)
  values (v_actor, app.current_actor_type(), 'investor.profile_change_cancelled', 'investor_profile_change_request', p_request_id,
          'Investor membatalkan pengajuan perubahan profil.');
end;
$$;

create or replace function app.review_investor_profile_change_request(p_request_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
begin
  if not app.has_permission('investors.update') then
    raise exception 'Missing permission: investors.update' using errcode='42501';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Keputusan harus approved atau rejected.' using errcode='22023';
  end if;
  if p_decision='rejected' and length(btrim(coalesce(p_note,'')))=0 then
    raise exception 'Alasan penolakan wajib diisi.' using errcode='22023';
  end if;

  update public.investor_profile_change_requests
  set status=p_decision, reviewed_by=v_actor, reviewed_at=now(), review_note=nullif(btrim(coalesce(p_note,'')),'')
  where id=p_request_id and status='pending';
  if not found then raise exception 'Pengajuan tidak ditemukan atau sudah ditinjau.' using errcode='P0002'; end if;

  insert into public.audit_logs(actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (v_actor, app.current_actor_type(), 'investor.profile_change_reviewed', 'investor_profile_change_request', p_request_id,
          'Admin meninjau pengajuan perubahan profil investor.', jsonb_build_object('decision',p_decision,'note',p_note));
end;
$$;

create or replace function app.apply_investor_profile_change_request(p_request_id uuid, p_email_applied boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_request public.investor_profile_change_requests%rowtype;
  v_changes jsonb;
  v_bank_name text;
  v_bank_account_name text;
  v_bank_account_number text;
begin
  if not app.has_permission('investors.update') then
    raise exception 'Missing permission: investors.update' using errcode='42501';
  end if;

  select * into v_request from public.investor_profile_change_requests where id=p_request_id for update;
  if not found or v_request.status <> 'approved' then
    raise exception 'Pengajuan harus berstatus approved sebelum diterapkan.' using errcode='42501';
  end if;
  v_changes := v_request.requested_changes;
  perform app.validate_investor_profile_change_payload(v_changes);

  if v_changes ? 'email' and not p_email_applied then
    raise exception 'Perubahan email harus diterapkan pada Auth sebelum profil difinalkan.' using errcode='42501';
  end if;

  select
    case when v_changes ? 'bank_name' then nullif(btrim(v_changes->>'bank_name'),'') else i.bank_name end,
    case when v_changes ? 'bank_account_name' then nullif(btrim(v_changes->>'bank_account_name'),'') else i.bank_account_name end,
    case when v_changes ? 'bank_account_number' then nullif(btrim(v_changes->>'bank_account_number'),'') else i.bank_account_number end
  into v_bank_name, v_bank_account_name, v_bank_account_number
  from public.investors i where i.id=v_request.investor_id;

  if num_nonnulls(v_bank_name, v_bank_account_name, v_bank_account_number) not in (0,3) then
    raise exception 'Nama bank, nama pemilik rekening, dan nomor rekening harus lengkap.' using errcode='22023';
  end if;

  perform set_config('app.investor_profile_change_request_id', p_request_id::text, true);
  update public.investors i set
    whatsapp_number = case when v_changes ? 'whatsapp_number' then nullif(btrim(v_changes->>'whatsapp_number'),'') else i.whatsapp_number end,
    country = case when v_changes ? 'country' then coalesce(nullif(btrim(v_changes->>'country'),''), i.country) else i.country end,
    city = case when v_changes ? 'city' then nullif(btrim(v_changes->>'city'),'') else i.city end,
    address = case when v_changes ? 'address' then nullif(btrim(v_changes->>'address'),'') else i.address end,
    organization_name = case when v_changes ? 'organization_name' then nullif(btrim(v_changes->>'organization_name'),'') else i.organization_name end,
    organization_role = case when v_changes ? 'organization_role' then nullif(btrim(v_changes->>'organization_role'),'') else i.organization_role end,
    bank_name = v_bank_name,
    bank_account_name = v_bank_account_name,
    bank_account_number = v_bank_account_number
  where i.id=v_request.investor_id;

  update public.investor_profile_change_requests
  set status='applied', applied_by=v_actor, applied_at=now()
  where id=p_request_id;

  insert into public.audit_logs(actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (v_actor, app.current_actor_type(), 'investor.profile_change_applied', 'investor_profile_change_request', p_request_id,
          'Perubahan profil investor terverifikasi diterapkan.', v_changes);
  return v_request.investor_id;
end;
$$;

revoke all on function app.request_investor_profile_change(jsonb,text) from public, anon;
revoke all on function app.cancel_investor_profile_change_request(uuid) from public, anon;
revoke all on function app.review_investor_profile_change_request(uuid,text,text) from public, anon;
revoke all on function app.apply_investor_profile_change_request(uuid,boolean) from public, anon;
grant execute on function app.request_investor_profile_change(jsonb,text) to authenticated;
grant execute on function app.cancel_investor_profile_change_request(uuid) to authenticated;
grant execute on function app.review_investor_profile_change_request(uuid,text,text) to authenticated;
grant execute on function app.apply_investor_profile_change_request(uuid,boolean) to authenticated;
