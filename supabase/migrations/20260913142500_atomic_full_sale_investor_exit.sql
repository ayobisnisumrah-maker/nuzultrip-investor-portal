-- Full ownership sale exit hardening.
--
-- Keep the existing sale completion as the canonical cap-table transaction, but
-- make a full exit also downgrade the seller lifecycle and close investor-admin
-- communication atomically. Historical records remain intact.

create or replace function app.complete_ownership_sale(p_transfer_id uuid)
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
  v_seller_fully_exited boolean;
begin
  if not app.has_permission('ownership_transfers.complete') then
    raise exception 'Anda tidak memiliki izin untuk menyelesaikan penjualan saham.'
      using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  select t.* into v_transfer
  from public.ownership_transfers t
  where t.id = p_transfer_id
  for update;

  if not found then
    raise exception 'Permintaan penjualan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_transfer.transfer_kind <> 'sale' then
    raise exception 'Permintaan ini bukan transaksi penjualan saham.' using errcode = '22023';
  end if;
  if v_transfer.status <> 'processing' then
    raise exception 'Hanya penjualan berstatus processing yang dapat diselesaikan.' using errcode = '22023';
  end if;
  if v_transfer.to_investor_id is null then
    raise exception 'Investor pembeli belum ditentukan.' using errcode = '22023';
  end if;
  if v_transfer.agreed_unit_price is null or v_transfer.agreed_unit_price <= 0 then
    raise exception 'Harga final transaksi belum valid.' using errcode = '22023';
  end if;

  select h.* into v_source
  from public.ownership_holdings h
  where h.id = v_transfer.holding_id
  for update;

  if not found then
    raise exception 'Holding sumber tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_source.investor_id <> v_transfer.from_investor_id then
    raise exception 'Pemilik holding tidak sesuai dengan penjual pada transaksi.' using errcode = '22023';
  end if;
  if v_source.status <> 'active' then
    raise exception 'Holding sumber tidak lagi aktif.' using errcode = '22023';
  end if;
  if v_source.units < v_transfer.units then
    raise exception 'Unit pada holding sumber tidak mencukupi untuk menyelesaikan transaksi.' using errcode = '22023';
  end if;

  select o.* into v_offering
  from public.ownership_offerings o
  where o.id = v_source.offering_id
  for update;

  if not found then
    raise exception 'Penawaran kepemilikan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_offering.unit_ownership_bps <= 0 then
    raise exception 'Konfigurasi porsi kepemilikan per unit tidak valid.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.investors i
    where i.id = v_transfer.to_investor_id
      and i.status in ('approved', 'active')
  ) then
    raise exception 'Investor pembeli tidak lagi berstatus aktif/approved.' using errcode = '22023';
  end if;

  v_transferred_bps := v_transfer.units * v_offering.unit_ownership_bps;
  v_remaining_units := v_source.units - v_transfer.units;
  v_remaining_bps := v_source.ownership_bps - v_transferred_bps;

  if v_transferred_bps <= 0 or v_remaining_units < 0 or v_remaining_bps < 0 then
    raise exception 'Perhitungan kepemilikan hasil transfer tidak valid.' using errcode = '22023';
  end if;

  if v_remaining_units > 0 then
    if v_remaining_bps <= 0 then
      raise exception 'Sisa porsi kepemilikan tidak valid.' using errcode = '22023';
    end if;
    update public.ownership_holdings
    set units = v_remaining_units,
        ownership_bps = v_remaining_bps,
        updated_by = v_admin_id,
        updated_at = now()
    where id = v_source.id;
  else
    update public.ownership_holdings
    set status = 'transferred',
        updated_by = v_admin_id,
        updated_at = now()
    where id = v_source.id;
  end if;

  v_buyer_transfer_eligible_at := now() + make_interval(months => v_offering.transfer_lock_months);

  insert into public.ownership_holdings (
    offering_id, investor_id, units, ownership_bps, acquisition_at,
    transfer_eligible_at, status, acquisition_reference, notes, created_by, updated_by
  ) values (
    v_source.offering_id, v_transfer.to_investor_id, v_transfer.units,
    v_transferred_bps, now(), v_buyer_transfer_eligible_at, 'active',
    'SALE-' || v_transfer.id::text,
    'Akuisisi melalui transaksi penjualan kepemilikan.', v_admin_id, v_admin_id
  ) returning id into v_buyer_holding_id;

  update public.ownership_transfers
  set status = 'completed', completed_at = now(), completed_by = v_admin_id, updated_at = now()
  where id = v_transfer.id;

  select not exists (
    select 1
    from public.ownership_holdings h
    where h.investor_id = v_transfer.from_investor_id
      and h.status = 'active'
      and h.units > 0
  ) into v_seller_fully_exited;

  if v_seller_fully_exited then
    -- `active -> inactive` is already a legal investor lifecycle transition.
    update public.investors
    set status = 'inactive', updated_at = now()
    where id = v_transfer.from_investor_id
      and status = 'active';

    -- Preserve conversation history but prevent any new investor communication.
    update public.message_threads
    set is_closed = true,
        closed_at = coalesce(closed_at, now()),
        closed_by = coalesce(closed_by, v_admin_id),
        updated_at = now()
    where investor_id = v_transfer.from_investor_id
      and thread_kind = 'investor_admin'
      and not is_closed;
  end if;

  -- A previously inactive buyer becomes an active owner when a legal acquisition
  -- creates an active holding. Approved buyers are left approved so the existing
  -- activation workflow may finish any remaining onboarding requirement.
  update public.investors
  set status = 'active', updated_at = now()
  where id = v_transfer.to_investor_id
    and status = 'inactive';

  return v_buyer_holding_id;
end;
$$;

revoke all on function app.complete_ownership_sale(uuid) from public, anon, authenticated;
grant execute on function app.complete_ownership_sale(uuid) to authenticated, service_role;