-- Rebuild profit-distribution allocations from ownership as it existed at the
-- inclusive end of the financial period, not from mutable current holdings.
--
-- Share-sale completion preserves enough lineage to reconstruct historical
-- ownership:
-- - a partial sale reduces the seller holding and creates a buyer holding;
-- - a full sale keeps the seller holding snapshot but marks it transferred;
-- - every completed sale records completed_at and units;
-- - the buyer holding acquisition_at is the sale completion time.
--
-- The cutoff is the instant immediately after period_end in UTC. Financial
-- periods are DATE values; using an explicit UTC boundary avoids session-timezone
-- dependent allocation results.

create or replace function app.regenerate_profit_distribution_allocations(
  p_distribution_id uuid
)
returns setof public.profit_distribution_allocations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_distribution public.profit_distributions%rowtype;
  v_offering public.ownership_offerings%rowtype;
  v_pool numeric(20,2);
  v_cutoff timestamptz;
  v_total_historical_bps integer;
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

  select * into v_offering
  from public.ownership_offerings
  where id = v_distribution.offering_id
  for share;

  if v_offering.id is null then
    raise exception 'Ownership offering not found.' using errcode='P0002';
  end if;

  if v_offering.unit_ownership_bps <= 0 then
    raise exception 'Ownership offering has an invalid unit ownership basis.' using errcode='23514';
  end if;

  v_cutoff := ((v_distribution.period_end + 1)::timestamp at time zone 'UTC');
  v_pool := round(
    (v_distribution.profit_amount * v_distribution.investor_pool_bps / 10000.0)::numeric,
    2
  );

  -- A transferred lot without completion history cannot be placed reliably on
  -- either side of the financial cutoff. Fail closed instead of paying the
  -- current owner or prior owner by guesswork.
  if exists (
    select 1
    from public.ownership_holdings h
    where h.offering_id = v_distribution.offering_id
      and h.status = 'transferred'
      and h.acquisition_at < v_cutoff
      and not exists (
        select 1
        from public.ownership_transfers t
        where t.holding_id = h.id
          and t.status = 'completed'
          and t.completed_at is not null
      )
  ) then
    raise exception 'Historical ownership cannot be reconstructed for a transferred holding without completion history.'
      using errcode='23514';
  end if;

  -- Lock all relevant holding/transfer rows so the snapshot cannot change while
  -- allocation rows are being regenerated.
  perform 1
  from public.ownership_holdings h
  where h.offering_id = v_distribution.offering_id
  for share;

  perform 1
  from public.ownership_transfers t
  join public.ownership_holdings h on h.id = t.holding_id
  where h.offering_id = v_distribution.offering_id
    and t.status = 'completed'
  for share of t;

  with completed as (
    select
      t.id,
      t.holding_id,
      t.units,
      t.completed_at,
      row_number() over (
        partition by t.holding_id
        order by t.completed_at desc, t.id desc
      ) as reverse_sequence
    from public.ownership_transfers t
    join public.ownership_holdings h on h.id = t.holding_id
    where h.offering_id = v_distribution.offering_id
      and t.status = 'completed'
      and t.completed_at is not null
  ), historical as (
    select
      h.id as holding_id,
      h.investor_id,
      h.status as holding_status,
      h.ownership_bps
        + coalesce(sum(
            case
              when c.completed_at >= v_cutoff
               and not (h.status = 'transferred' and c.reverse_sequence = 1)
              then c.units * v_offering.unit_ownership_bps
              else 0
            end
          ), 0)::integer as ownership_bps_at_cutoff,
      max(c.completed_at) filter (where c.reverse_sequence = 1) as final_transfer_at
    from public.ownership_holdings h
    left join completed c on c.holding_id = h.id
    where h.offering_id = v_distribution.offering_id
      and h.status in ('active','transferred')
      and h.acquisition_at < v_cutoff
    group by h.id, h.investor_id, h.ownership_bps, h.status
  ), eligible as (
    select *
    from historical
    where ownership_bps_at_cutoff > 0
      and (
        holding_status = 'active'
        or final_transfer_at is null
        or final_transfer_at >= v_cutoff
      )
  )
  select coalesce(sum(ownership_bps_at_cutoff), 0)::integer
  into v_total_historical_bps
  from eligible;

  if v_pool > 0 and v_total_historical_bps <= 0 then
    raise exception 'No ownership holdings existed at the distribution cutoff.' using errcode='23514';
  end if;

  if v_total_historical_bps > v_distribution.investor_pool_bps then
    raise exception
      'Historical investor ownership (% bps) exceeds distribution investor pool (% bps).',
      v_total_historical_bps,
      v_distribution.investor_pool_bps
      using errcode='23514';
  end if;

  delete from public.profit_distribution_allocations
  where distribution_id = p_distribution_id;

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
    with completed as (
      select
        t.id,
        t.holding_id,
        t.units,
        t.completed_at,
        row_number() over (
          partition by t.holding_id
          order by t.completed_at desc, t.id desc
        ) as reverse_sequence
      from public.ownership_transfers t
      join public.ownership_holdings h on h.id = t.holding_id
      where h.offering_id = v_distribution.offering_id
        and t.status = 'completed'
        and t.completed_at is not null
    ), historical as (
      select
        h.id as holding_id,
        h.investor_id,
        h.status as holding_status,
        h.ownership_bps
          + coalesce(sum(
              case
                when c.completed_at >= v_cutoff
                 and not (h.status = 'transferred' and c.reverse_sequence = 1)
                then c.units * v_offering.unit_ownership_bps
                else 0
              end
            ), 0)::integer as ownership_bps_at_cutoff,
        max(c.completed_at) filter (where c.reverse_sequence = 1) as final_transfer_at
      from public.ownership_holdings h
      left join completed c on c.holding_id = h.id
      where h.offering_id = v_distribution.offering_id
        and h.status in ('active','transferred')
        and h.acquisition_at < v_cutoff
      group by h.id, h.investor_id, h.ownership_bps, h.status
    )
    select
      p_distribution_id,
      h.holding_id,
      h.investor_id,
      h.ownership_bps_at_cutoff,
      round(
        h.ownership_bps_at_cutoff::numeric * 10000
          / v_distribution.investor_pool_bps
      )::integer,
      round(
        v_distribution.profit_amount * h.ownership_bps_at_cutoff / 10000.0,
        2
      ),
      'pending'
    from historical h
    where h.ownership_bps_at_cutoff > 0
      and (
        h.holding_status = 'active'
        or h.final_transfer_at is null
        or h.final_transfer_at >= v_cutoff
      )
    order by h.holding_id;
  end if;

  return query
  select *
  from public.profit_distribution_allocations
  where distribution_id = p_distribution_id
  order by created_at, id;
end;
$$;

revoke all on function app.regenerate_profit_distribution_allocations(uuid)
  from public, anon;
grant execute on function app.regenerate_profit_distribution_allocations(uuid)
  to authenticated;
