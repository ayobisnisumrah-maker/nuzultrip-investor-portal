-- Profit distributions must pay each investor according to the absolute company
-- ownership represented by the active holding, not according to that holding's
-- relative share of only the units that happen to have been sold so far.
--
-- Example: one 0.8% holding on a 40% offering receives 0.8% of distributable
-- profit, not 100% of the 40% investor pool.

create or replace function app.regenerate_profit_distribution_allocations(p_distribution_id uuid)
returns setof public.profit_distribution_allocations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_distribution public.profit_distributions%rowtype;
  v_total_active_bps integer;
  v_pool numeric;
begin
  if not app.has_permission('profit_distributions.update') then
    raise exception 'Missing permission: profit_distributions.update' using errcode='42501';
  end if;

  select * into v_distribution
  from public.profit_distributions
  where id = p_distribution_id
  for update;

  if v_distribution.id is null then
    raise exception 'Distribution not found.' using errcode='P0002';
  end if;

  if v_distribution.status not in ('draft','review') then
    raise exception 'Allocations can only be generated for draft or review distributions.' using errcode='42501';
  end if;

  if exists (
    select 1
    from public.profit_distribution_allocations
    where distribution_id = p_distribution_id
      and status in ('payable','paid')
  ) then
    raise exception 'Locked allocations already exist.' using errcode='42501';
  end if;

  perform 1
  from public.ownership_holdings
  where offering_id = v_distribution.offering_id
    and status = 'active'
  for share;

  select coalesce(sum(ownership_bps), 0)::integer
  into v_total_active_bps
  from public.ownership_holdings
  where offering_id = v_distribution.offering_id
    and status = 'active'
    and units > 0
    and ownership_bps > 0;

  if v_distribution.investor_pool_amount > 0 and v_total_active_bps <= 0 then
    raise exception 'No active ownership holdings are available for allocation.' using errcode='23514';
  end if;

  -- Active ownership must never represent more than the configured investor
  -- pool for this distribution. Blocking is safer than silently overpaying.
  if v_total_active_bps > v_distribution.investor_pool_bps then
    raise exception
      'Active investor ownership (% bps) exceeds distribution investor pool (% bps).',
      v_total_active_bps,
      v_distribution.investor_pool_bps
      using errcode='23514';
  end if;

  delete from public.profit_distribution_allocations
  where distribution_id = p_distribution_id;

  v_pool := v_distribution.profit_amount * v_distribution.investor_pool_bps / 10000.0;

  update public.profit_distributions
  set investor_pool_amount = v_pool,
      updated_by = auth.uid()
  where id = p_distribution_id;

  if v_pool > 0 then
    insert into public.profit_distribution_allocations(
      distribution_id,
      holding_id,
      investor_id,
      ownership_bps,
      investor_pool_share_bps,
      allocation_amount,
      status
    )
    select
      p_distribution_id,
      h.id,
      h.investor_id,
      h.ownership_bps,
      round(h.ownership_bps::numeric * 10000 / v_distribution.investor_pool_bps)::integer,
      v_distribution.profit_amount * h.ownership_bps / 10000.0,
      'pending'
    from public.ownership_holdings h
    where h.offering_id = v_distribution.offering_id
      and h.status = 'active'
      and h.units > 0
      and h.ownership_bps > 0
    order by h.id;
  end if;

  return query
  select *
  from public.profit_distribution_allocations
  where distribution_id = p_distribution_id
  order by created_at, id;
end;
$$;

grant execute on function app.regenerate_profit_distribution_allocations(uuid) to authenticated;
