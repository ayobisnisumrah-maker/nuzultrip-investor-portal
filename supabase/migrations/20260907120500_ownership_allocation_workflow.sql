grant select, insert, update on table public.ownership_holdings to authenticated;

drop policy if exists ownership_holdings_select_admin on public.ownership_holdings;
create policy ownership_holdings_select_admin on public.ownership_holdings
for select to authenticated
using (
  app.has_permission('ownership.view')
  or app.has_permission('profit_distributions.view')
);

drop policy if exists ownership_holdings_insert_admin on public.ownership_holdings;
create policy ownership_holdings_insert_admin on public.ownership_holdings
for insert to authenticated
with check (app.has_permission('ownership.create'));

drop policy if exists ownership_holdings_update_admin on public.ownership_holdings;
create policy ownership_holdings_update_admin on public.ownership_holdings
for update to authenticated
using (app.has_permission('ownership.update') or app.has_permission('ownership.delete'))
with check (app.has_permission('ownership.update') or app.has_permission('ownership.delete'));

create or replace function app.allocate_ownership_holding(
  p_offering_id uuid,
  p_investor_id uuid,
  p_units integer,
  p_acquisition_reference text default null,
  p_notes text default null
) returns public.ownership_holdings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_offering public.ownership_offerings%rowtype;
  v_investor public.investors%rowtype;
  v_allocated_units integer;
  v_ownership_bps integer;
  v_holding public.ownership_holdings%rowtype;
begin
  if v_actor is null or not app.has_permission('ownership.create') then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;

  if p_units is null or p_units <= 0 then
    raise exception 'Jumlah unit harus lebih dari 0.' using errcode = '22023';
  end if;

  select * into v_offering
  from public.ownership_offerings
  where id = p_offering_id
  for update;

  if not found then
    raise exception 'Penawaran kepemilikan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_offering.status <> 'open' then
    raise exception 'Unit hanya dapat dialokasikan dari penawaran berstatus aktif.' using errcode = '22023';
  end if;

  select * into v_investor
  from public.investors
  where id = p_investor_id;

  if not found then
    raise exception 'Investor tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_investor.status not in ('approved', 'active') then
    raise exception 'Investor harus berstatus disetujui atau aktif.' using errcode = '22023';
  end if;

  select coalesce(sum(h.units), 0)::integer into v_allocated_units
  from public.ownership_holdings h
  where h.offering_id = p_offering_id
    and h.status in ('reserved', 'active');

  if v_allocated_units + p_units > v_offering.total_units then
    raise exception 'Alokasi melebihi sisa unit penawaran.' using errcode = '22023';
  end if;

  v_ownership_bps := p_units * v_offering.unit_ownership_bps;

  if v_ownership_bps <= 0 or v_ownership_bps > v_offering.total_offered_bps then
    raise exception 'Porsi kepemilikan hasil alokasi tidak valid.' using errcode = '22023';
  end if;

  if (
    select coalesce(sum(h.ownership_bps), 0)
    from public.ownership_holdings h
    where h.offering_id = p_offering_id
      and h.status in ('reserved', 'active')
  ) + v_ownership_bps > v_offering.total_offered_bps then
    raise exception 'Alokasi melebihi porsi kepemilikan yang ditawarkan.' using errcode = '22023';
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
  ) values (
    p_offering_id,
    p_investor_id,
    p_units,
    v_ownership_bps,
    now(),
    now() + make_interval(months => v_offering.transfer_lock_months),
    'active',
    nullif(btrim(p_acquisition_reference), ''),
    nullif(btrim(p_notes), ''),
    v_actor,
    v_actor
  ) returning * into v_holding;

  return v_holding;
end;
$$;

revoke all on function app.allocate_ownership_holding(uuid, uuid, integer, text, text) from public;
grant execute on function app.allocate_ownership_holding(uuid, uuid, integer, text, text) to authenticated;
