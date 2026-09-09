-- Investor operational data must not remain readable after access is revoked.
-- app.current_investor_id() is the authoritative lifecycle gate and returns
-- an investor id only for active accounts whose investor status is approved/active.

create or replace function app.participates_in_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = p_thread_id
      and tp.user_id = (select auth.uid())
      and (
        app.current_investor_id() is not null
        or app.has_permission('messages.view')
      )
  );
$$;

-- Thread participant metadata is operational messaging data.
drop policy if exists thread_participants_select_own on public.thread_participants;
create policy thread_participants_select_own
on public.thread_participants
for select
to authenticated
using (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
);

-- Read receipts follow the same lifecycle gate.
drop policy if exists message_reads_select_own on public.message_reads;
create policy message_reads_select_own
on public.message_reads
for select
to authenticated
using (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
);

drop policy if exists message_reads_update_own on public.message_reads;
create policy message_reads_update_own
on public.message_reads
for update
to authenticated
using (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
)
with check (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
);

drop policy if exists message_reads_insert_own on public.message_reads;
create policy message_reads_insert_own
on public.message_reads
for insert
to authenticated
with check (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
  and exists (
    select 1
    from public.messages m
    where m.id = message_reads.message_id
      and (
        app.participates_in_thread(m.thread_id)
        or app.has_permission('messages.view')
      )
  )
);

-- Notifications can contain operational/investment information.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using (
  recipient_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.is_admin()
  )
);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications
for update
to authenticated
using (
  recipient_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.is_admin()
  )
)
with check (
  recipient_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.is_admin()
  )
);

-- Folder ownership alone is insufficient after lifecycle access is revoked.
drop policy if exists payment_proofs_investor_select_own on storage.objects;
create policy payment_proofs_investor_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profit-distribution-proofs'
  and app.current_investor_id() is not null
  and (storage.foldername(name))[1] = app.current_investor_id()::text
);

-- Share-sale rows are exposed through SECURITY DEFINER RPCs, so the RPCs must
-- enforce the authoritative lifecycle boundary themselves.
create or replace function app.list_my_ownership_sales()
returns setof public.ownership_transfers
language sql
stable
security definer
set search_path = ''
as $$
  select ot.*
  from public.ownership_transfers ot
  where ot.transfer_kind = 'sale'
    and ot.from_investor_id = app.current_investor_id()
  order by ot.requested_at desc;
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
  v_investor_id uuid;
  v_holding public.ownership_holdings;
  v_reserved_units integer;
  v_available_units integer;
  v_transfer_id uuid;
begin
  v_investor_id := app.current_investor_id();

  if v_investor_id is null then
    raise exception 'Investor tidak memiliki akses untuk mengajukan penjualan saham.'
      using errcode = '42501';
  end if;

  if p_units is null or p_units <= 0 then
    raise exception 'Jumlah unit yang dijual harus lebih besar dari 0.' using errcode = '22023';
  end if;

  if p_requested_unit_price is null or p_requested_unit_price <= 0 then
    raise exception 'Harga penawaran per unit harus lebih besar dari 0.' using errcode = '22023';
  end if;

  select h.*
  into v_holding
  from public.ownership_holdings h
  where h.id = p_holding_id
  for update;

  if not found then
    raise exception 'Kepemilikan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_holding.investor_id <> v_investor_id then
    raise exception 'Anda tidak berhak menjual kepemilikan ini.' using errcode = '42501';
  end if;

  if v_holding.status <> 'active' then
    raise exception 'Hanya kepemilikan aktif yang dapat dijual.' using errcode = '22023';
  end if;

  if v_holding.transfer_eligible_at > now() then
    raise exception 'Kepemilikan ini belum memenuhi tanggal minimum transfer.' using errcode = '22023';
  end if;

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
    raise exception 'Jumlah unit melebihi unit yang tersedia untuk dijual. Tersedia: % unit.',
      v_available_units using errcode = '22023';
  end if;

  insert into public.ownership_transfers (
    holding_id, from_investor_id, to_investor_id, units, requested_at,
    eligible_at, status, notes, transfer_kind, requested_unit_price
  ) values (
    v_holding.id, v_investor_id, null, p_units, now(),
    v_holding.transfer_eligible_at, 'pending',
    nullif(btrim(coalesce(p_notes, '')), ''), 'sale', p_requested_unit_price
  ) returning id into v_transfer_id;

  return v_transfer_id;
end;
$$;

create or replace function app.cancel_ownership_sale_request(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_investor_id uuid;
  v_transfer public.ownership_transfers;
begin
  v_investor_id := app.current_investor_id();

  if v_investor_id is null then
    raise exception 'Investor tidak memiliki akses untuk membatalkan permintaan ini.'
      using errcode = '42501';
  end if;

  select t.*
  into v_transfer
  from public.ownership_transfers t
  where t.id = p_transfer_id
  for update;

  if not found then
    raise exception 'Permintaan penjualan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_transfer.transfer_kind <> 'sale'
     or v_transfer.from_investor_id <> v_investor_id then
    raise exception 'Anda tidak berhak membatalkan permintaan ini.' using errcode = '42501';
  end if;

  if v_transfer.status <> 'pending' then
    raise exception 'Hanya permintaan yang masih menunggu persetujuan yang dapat dibatalkan.'
      using errcode = '22023';
  end if;

  update public.ownership_transfers
  set status = 'cancelled', updated_at = now()
  where id = p_transfer_id;
end;
$$;