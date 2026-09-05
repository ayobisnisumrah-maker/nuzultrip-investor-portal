-- =============================================================================
-- Ownership share-sale transactional workflow
-- =============================================================================
--
-- Rules:
-- 1. Investor hanya dapat menjual holding miliknya sendiri.
-- 2. Holding harus active dan telah melewati transfer_eligible_at.
-- 3. Pending/approved/processing requests mereservasi unit secara logis.
-- 4. ownership_holdings TIDAK berubah sampai complete.
-- 5. Completion melakukan perpindahan ownership secara atomic.
-- =============================================================================


-- =============================================================================
-- 1. Additional RBAC permissions
-- =============================================================================

insert into public.permissions (
  key,
  module,
  action,
  description
)
values
  (
    'ownership_transfers.process',
    'ownership_transfers',
    'process',
    'Memproses transfer atau penjualan kepemilikan yang telah disetujui.'
  ),
  (
    'ownership_transfers.complete',
    'ownership_transfers',
    'complete',
    'Menyelesaikan transfer atau penjualan kepemilikan dan memindahkan unit.'
  )
on conflict (key) do nothing;


-- Berikan process/complete kepada role yang sudah memiliki hak approve.
insert into public.role_permissions (
  role_id,
  permission_id
)
select distinct
  existing.role_id,
  target.id
from public.role_permissions existing
join public.permissions source
  on source.id = existing.permission_id
cross join public.permissions target
where source.key = 'ownership_transfers.approve'
  and target.key in (
    'ownership_transfers.process',
    'ownership_transfers.complete'
  )
on conflict do nothing;


-- =============================================================================
-- 2. Investor: create share-sale request
-- =============================================================================

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
  v_user_id uuid;
  v_holding public.ownership_holdings;
  v_reserved_units integer;
  v_available_units integer;
  v_transfer_id uuid;
begin
  v_user_id := app.current_user_id();

  if v_user_id is null then
    raise exception 'Anda harus masuk sebagai investor.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.investors i
    where i.id = v_user_id
      and i.status in ('approved', 'active')
  ) then
    raise exception 'Investor tidak memiliki akses untuk mengajukan penjualan saham.'
      using errcode = '42501';
  end if;

  if p_units is null or p_units <= 0 then
    raise exception 'Jumlah unit yang dijual harus lebih besar dari 0.'
      using errcode = '22023';
  end if;

  if p_requested_unit_price is null or p_requested_unit_price <= 0 then
    raise exception 'Harga penawaran per unit harus lebih besar dari 0.'
      using errcode = '22023';
  end if;

  select h.*
  into v_holding
  from public.ownership_holdings h
  where h.id = p_holding_id
  for update;

  if not found then
    raise exception 'Kepemilikan tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_holding.investor_id <> v_user_id then
    raise exception 'Anda tidak berhak menjual kepemilikan ini.'
      using errcode = '42501';
  end if;

  if v_holding.status <> 'active' then
    raise exception 'Hanya kepemilikan aktif yang dapat dijual.'
      using errcode = '22023';
  end if;

  if v_holding.transfer_eligible_at > now() then
    raise exception 'Kepemilikan ini belum memenuhi tanggal minimum transfer.'
      using errcode = '22023';
  end if;

  -- Holding row lock membuat pemeriksaan ini aman terhadap concurrent requests.
  select coalesce(sum(t.units), 0)::integer
  into v_reserved_units
  from public.ownership_transfers t
  where t.holding_id = p_holding_id
    and t.transfer_kind = 'sale'
    and t.status in ('pending', 'approved', 'processing');

  v_available_units := v_holding.units - v_reserved_units;

  if v_available_units <= 0 then
    raise exception 'Seluruh unit pada kepemilikan ini sedang berada dalam proses penjualan.'
      using errcode = '22023';
  end if;

  if p_units > v_available_units then
    raise exception
      'Jumlah unit melebihi unit yang tersedia untuk dijual. Tersedia: % unit.',
      v_available_units
      using errcode = '22023';
  end if;

  insert into public.ownership_transfers (
    holding_id,
    from_investor_id,
    to_investor_id,
    units,
    requested_at,
    eligible_at,
    status,
    notes,
    transfer_kind,
    requested_unit_price
  )
  values (
    v_holding.id,
    v_user_id,
    null,
    p_units,
    now(),
    v_holding.transfer_eligible_at,
    'pending',
    nullif(btrim(coalesce(p_notes, '')), ''),
    'sale',
    p_requested_unit_price
  )
  returning id into v_transfer_id;

  return v_transfer_id;
end;
$$;


-- =============================================================================
-- 3. Investor: cancel pending request
-- =============================================================================

create or replace function app.cancel_ownership_sale_request(
  p_transfer_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_transfer public.ownership_transfers;
begin
  v_user_id := app.current_user_id();

  if v_user_id is null then
    raise exception 'Anda harus masuk sebagai investor.'
      using errcode = '42501';
  end if;

  select t.*
  into v_transfer
  from public.ownership_transfers t
  where t.id = p_transfer_id
  for update;

  if not found then
    raise exception 'Permintaan penjualan tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_transfer.transfer_kind <> 'sale'
     or v_transfer.from_investor_id <> v_user_id then
    raise exception 'Anda tidak berhak membatalkan permintaan ini.'
      using errcode = '42501';
  end if;

  if v_transfer.status <> 'pending' then
    raise exception 'Hanya permintaan yang masih menunggu persetujuan yang dapat dibatalkan.'
      using errcode = '22023';
  end if;

  update public.ownership_transfers
  set
    status = 'cancelled',
    updated_at = now()
  where id = p_transfer_id;
end;
$$;


-- =============================================================================
-- 4. Admin: approve
-- =============================================================================

create or replace function app.approve_ownership_sale(
  p_transfer_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_transfer public.ownership_transfers;
begin
  if not app.has_permission('ownership_transfers.approve') then
    raise exception 'Anda tidak memiliki izin untuk menyetujui penjualan saham.'
      using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  select t.*
  into v_transfer
  from public.ownership_transfers t
  where t.id = p_transfer_id
  for update;

  if not found then
    raise exception 'Permintaan penjualan tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_transfer.transfer_kind <> 'sale' then
    raise exception 'Permintaan ini bukan transaksi penjualan saham.'
      using errcode = '22023';
  end if;

  if v_transfer.status <> 'pending' then
    raise exception 'Hanya permintaan berstatus pending yang dapat disetujui.'
      using errcode = '22023';
  end if;

  update public.ownership_transfers
  set
    status = 'approved',
    approved_at = now(),
    approved_by = v_admin_id,
    rejection_reason = null,
    updated_at = now()
  where id = p_transfer_id;
end;
$$;


-- =============================================================================
-- 5. Admin: reject
-- =============================================================================

create or replace function app.reject_ownership_sale(
  p_transfer_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.ownership_transfers;
begin
  if not app.has_permission('ownership_transfers.reject') then
    raise exception 'Anda tidak memiliki izin untuk menolak penjualan saham.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Alasan penolakan wajib diisi.'
      using errcode = '22023';
  end if;

  select t.*
  into v_transfer
  from public.ownership_transfers t
  where t.id = p_transfer_id
  for update;

  if not found then
    raise exception 'Permintaan penjualan tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_transfer.transfer_kind <> 'sale' then
    raise exception 'Permintaan ini bukan transaksi penjualan saham.'
      using errcode = '22023';
  end if;

  if v_transfer.status not in ('pending', 'approved') then
    raise exception 'Permintaan pada tahap ini tidak dapat ditolak.'
      using errcode = '22023';
  end if;

  update public.ownership_transfers
  set
    status = 'rejected',
    rejection_reason = btrim(p_reason),
    updated_at = now()
  where id = p_transfer_id;
end;
$$;


-- =============================================================================
-- 6. Admin: move approved sale into processing
-- =============================================================================

create or replace function app.process_ownership_sale(
  p_transfer_id uuid,
  p_to_investor_id uuid,
  p_agreed_unit_price numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_transfer public.ownership_transfers;
begin
  if not app.has_permission('ownership_transfers.process') then
    raise exception 'Anda tidak memiliki izin untuk memproses penjualan saham.'
      using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  if p_to_investor_id is null then
    raise exception 'Investor pembeli wajib dipilih.'
      using errcode = '22023';
  end if;

  if p_agreed_unit_price is null or p_agreed_unit_price <= 0 then
    raise exception 'Harga final per unit harus lebih besar dari 0.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.investors i
    where i.id = p_to_investor_id
      and i.status in ('approved', 'active')
  ) then
    raise exception 'Investor pembeli harus berstatus approved atau active.'
      using errcode = '22023';
  end if;

  select t.*
  into v_transfer
  from public.ownership_transfers t
  where t.id = p_transfer_id
  for update;

  if not found then
    raise exception 'Permintaan penjualan tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_transfer.transfer_kind <> 'sale' then
    raise exception 'Permintaan ini bukan transaksi penjualan saham.'
      using errcode = '22023';
  end if;

  if v_transfer.status <> 'approved' then
    raise exception 'Hanya penjualan yang telah disetujui yang dapat diproses.'
      using errcode = '22023';
  end if;

  if v_transfer.from_investor_id = p_to_investor_id then
    raise exception 'Investor penjual dan pembeli tidak boleh sama.'
      using errcode = '22023';
  end if;

  update public.ownership_transfers
  set
    to_investor_id = p_to_investor_id,
    agreed_unit_price = p_agreed_unit_price,
    status = 'processing',
    processing_at = now(),
    processing_by = v_admin_id,
    updated_at = now()
  where id = p_transfer_id;
end;
$$;


-- =============================================================================
-- 7. Admin: atomic completion
-- =============================================================================

create or replace function app.complete_ownership_sale(
  p_transfer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_transfer public.ownership_transfers;
  v_source public.ownership_holdings;
  v_offering public.ownership_offerings;

  v_transferred_bps integer;
  v_remaining_units integer;
  v_remaining_bps integer;

  v_buyer_holding_id uuid;
  v_buyer_transfer_eligible_at timestamptz;
begin
  if not app.has_permission('ownership_transfers.complete') then
    raise exception 'Anda tidak memiliki izin untuk menyelesaikan penjualan saham.'
      using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  -- Lock transfer first.
  select t.*
  into v_transfer
  from public.ownership_transfers t
  where t.id = p_transfer_id
  for update;

  if not found then
    raise exception 'Permintaan penjualan tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_transfer.transfer_kind <> 'sale' then
    raise exception 'Permintaan ini bukan transaksi penjualan saham.'
      using errcode = '22023';
  end if;

  if v_transfer.status <> 'processing' then
    raise exception 'Hanya penjualan berstatus processing yang dapat diselesaikan.'
      using errcode = '22023';
  end if;

  if v_transfer.to_investor_id is null then
    raise exception 'Investor pembeli belum ditentukan.'
      using errcode = '22023';
  end if;

  if v_transfer.agreed_unit_price is null
     or v_transfer.agreed_unit_price <= 0 then
    raise exception 'Harga final transaksi belum valid.'
      using errcode = '22023';
  end if;

  -- Lock seller holding.
  select h.*
  into v_source
  from public.ownership_holdings h
  where h.id = v_transfer.holding_id
  for update;

  if not found then
    raise exception 'Holding sumber tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_source.investor_id <> v_transfer.from_investor_id then
    raise exception 'Pemilik holding tidak sesuai dengan penjual pada transaksi.'
      using errcode = '22023';
  end if;

  if v_source.status <> 'active' then
    raise exception 'Holding sumber tidak lagi aktif.'
      using errcode = '22023';
  end if;

  if v_source.units < v_transfer.units then
    raise exception 'Unit pada holding sumber tidak mencukupi untuk menyelesaikan transaksi.'
      using errcode = '22023';
  end if;

  -- Lock/read offering used for deterministic BPS.
  select o.*
  into v_offering
  from public.ownership_offerings o
  where o.id = v_source.offering_id
  for update;

  if not found then
    raise exception 'Penawaran kepemilikan tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_offering.unit_ownership_bps <= 0 then
    raise exception 'Konfigurasi porsi kepemilikan per unit tidak valid.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.investors i
    where i.id = v_transfer.to_investor_id
      and i.status in ('approved', 'active')
  ) then
    raise exception 'Investor pembeli tidak lagi berstatus aktif/approved.'
      using errcode = '22023';
  end if;

  v_transferred_bps :=
    v_transfer.units * v_offering.unit_ownership_bps;

  if v_transferred_bps <= 0 then
    raise exception 'Porsi kepemilikan hasil transfer tidak valid.'
      using errcode = '22023';
  end if;

  v_remaining_units :=
    v_source.units - v_transfer.units;

  v_remaining_bps :=
    v_source.ownership_bps - v_transferred_bps;

  if v_remaining_units < 0 or v_remaining_bps < 0 then
    raise exception 'Perhitungan sisa kepemilikan menghasilkan nilai negatif.'
      using errcode = '22023';
  end if;

  -- For a partial sale the source holding remains active.
  if v_remaining_units > 0 then
    if v_remaining_bps <= 0 then
      raise exception 'Sisa porsi kepemilikan tidak valid.'
        using errcode = '22023';
    end if;

    update public.ownership_holdings
    set
      units = v_remaining_units,
      ownership_bps = v_remaining_bps,
      updated_by = v_admin_id,
      updated_at = now()
    where id = v_source.id;

  -- Full sale keeps original unit snapshot but marks source as transferred.
  else
    update public.ownership_holdings
    set
      status = 'transferred',
      updated_by = v_admin_id,
      updated_at = now()
    where id = v_source.id;
  end if;

  -- Buyer gets a separate acquisition lot.
  -- This preserves acquisition/transfer-lock history.
  v_buyer_transfer_eligible_at :=
    now() + make_interval(months => v_offering.transfer_lock_months);

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
    v_transfer.to_investor_id,
    v_transfer.units,
    v_transferred_bps,
    now(),
    v_buyer_transfer_eligible_at,
    'active',
    'SALE-' || v_transfer.id::text,
    'Akuisisi melalui transaksi penjualan kepemilikan.',
    v_admin_id,
    v_admin_id
  )
  returning id into v_buyer_holding_id;

  update public.ownership_transfers
  set
    status = 'completed',
    completed_at = now(),
    completed_by = v_admin_id,
    updated_at = now()
  where id = v_transfer.id;

  return v_buyer_holding_id;
end;
$$;


-- =============================================================================
-- 8. RPC privileges
-- =============================================================================

revoke all on function app.create_ownership_sale_request(uuid, integer, numeric, text)
  from public, anon;

revoke all on function app.cancel_ownership_sale_request(uuid)
  from public, anon;

revoke all on function app.approve_ownership_sale(uuid)
  from public, anon;

revoke all on function app.reject_ownership_sale(uuid, text)
  from public, anon;

revoke all on function app.process_ownership_sale(uuid, uuid, numeric)
  from public, anon;

revoke all on function app.complete_ownership_sale(uuid)
  from public, anon;


grant execute on function app.create_ownership_sale_request(uuid, integer, numeric, text)
  to authenticated;

grant execute on function app.cancel_ownership_sale_request(uuid)
  to authenticated;

grant execute on function app.approve_ownership_sale(uuid)
  to authenticated;

grant execute on function app.reject_ownership_sale(uuid, text)
  to authenticated;

grant execute on function app.process_ownership_sale(uuid, uuid, numeric)
  to authenticated;

grant execute on function app.complete_ownership_sale(uuid)
  to authenticated;
