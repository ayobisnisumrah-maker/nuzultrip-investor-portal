-- =============================================================================
-- Reconcile profit-distribution ownership cutoff with completed inheritance.
--
-- ownership_holdings remains the current ownership source of truth. Historical
-- ownership at a financial-period cutoff is reconstructed from completed
-- ownership movements: share transfers and inheritance completions.
-- =============================================================================

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
    raise exception 'Anda tidak memiliki izin untuk memperbarui distribusi laba.' using errcode='42501';
  end if;

  select * into v_distribution
  from public.profit_distributions
  where id = p_distribution_id
  for update;

  if v_distribution.id is null then
    raise exception 'Distribusi laba tidak ditemukan.' using errcode='P0002';
  end if;

  if v_distribution.status not in ('draft','review') then
    raise exception 'Alokasi hanya dapat dibuat ulang saat distribusi berstatus Draf atau Ditinjau.' using errcode='42501';
  end if;

  if exists (
    select 1
    from public.profit_distribution_allocations
    where distribution_id = p_distribution_id
      and status in ('payable','paid')
  ) then
    raise exception 'Alokasi yang sudah menjadi kewajiban pembayaran tidak dapat dibuat ulang.' using errcode='42501';
  end if;

  select * into v_offering
  from public.ownership_offerings
  where id = v_distribution.offering_id
  for share;

  if v_offering.id is null then
    raise exception 'Penawaran kepemilikan tidak ditemukan.' using errcode='P0002';
  end if;

  if v_offering.unit_ownership_bps <= 0 then
    raise exception 'Basis kepemilikan per unit pada penawaran tidak valid.' using errcode='23514';
  end if;

  v_cutoff := ((v_distribution.period_end + 1)::timestamp at time zone 'UTC');
  v_pool := round(
    (v_distribution.profit_amount * v_distribution.investor_pool_bps / 10000.0)::numeric,
    2
  );

  -- A transferred source holding must have a completed movement record. Both
  -- sale/transfer and inheritance are valid completion sources.
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
      and not exists (
        select 1
        from public.ownership_inheritance i
        where i.holding_id = h.id
          and i.status = 'completed'
          and i.completed_at is not null
      )
  ) then
    raise exception 'Riwayat kepemilikan tidak dapat direkonstruksi karena holding yang dialihkan tidak memiliki transaksi penyelesaian.'
      using errcode='23514';
  end if;

  -- Keep the ownership snapshot stable while allocations are rebuilt.
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

  perform 1
  from public.ownership_inheritance i
  join public.ownership_holdings h on h.id = i.holding_id
  where h.offering_id = v_distribution.offering_id
    and i.status = 'completed'
  for share of i;

  with movements as (
    select
      'transfer'::text as movement_kind,
      t.id,
      t.holding_id,
      t.units,
      t.completed_at
    from public.ownership_transfers t
    join public.ownership_holdings h on h.id = t.holding_id
    where h.offering_id = v_distribution.offering_id
      and t.status = 'completed'
      and t.completed_at is not null

    union all

    select
      'inheritance'::text as movement_kind,
      i.id,
      i.holding_id,
      i.units,
      i.completed_at
    from public.ownership_inheritance i
    join public.ownership_holdings h on h.id = i.holding_id
    where h.offering_id = v_distribution.offering_id
      and i.status = 'completed'
      and i.completed_at is not null
  ), sequenced as (
    select
      m.*,
      row_number() over (
        partition by m.holding_id
        order by m.completed_at desc, m.movement_kind desc, m.id desc
      ) as reverse_sequence
    from movements m
  ), historical as (
    select
      h.id as holding_id,
      h.investor_id,
      h.status as holding_status,
      h.ownership_bps
        + coalesce(sum(
            case
              when m.completed_at >= v_cutoff
               and not (h.status = 'transferred' and m.reverse_sequence = 1)
              then m.units * v_offering.unit_ownership_bps
              else 0
            end
          ), 0)::integer as ownership_bps_at_cutoff,
      max(m.completed_at) filter (where m.reverse_sequence = 1) as final_movement_at
    from public.ownership_holdings h
    left join sequenced m on m.holding_id = h.id
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
        or final_movement_at is null
        or final_movement_at >= v_cutoff
      )
  )
  select coalesce(sum(ownership_bps_at_cutoff), 0)::integer
  into v_total_historical_bps
  from eligible;

  if v_pool > 0 and v_total_historical_bps <= 0 then
    raise exception 'Tidak ada kepemilikan yang memenuhi cutoff distribusi.' using errcode='23514';
  end if;

  if v_total_historical_bps > v_distribution.investor_pool_bps then
    raise exception
      'Kepemilikan historis (% bps) melebihi porsi investor pada distribusi (% bps).',
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
    with movements as (
      select
        'transfer'::text as movement_kind,
        t.id,
        t.holding_id,
        t.units,
        t.completed_at
      from public.ownership_transfers t
      join public.ownership_holdings h on h.id = t.holding_id
      where h.offering_id = v_distribution.offering_id
        and t.status = 'completed'
        and t.completed_at is not null

      union all

      select
        'inheritance'::text as movement_kind,
        i.id,
        i.holding_id,
        i.units,
        i.completed_at
      from public.ownership_inheritance i
      join public.ownership_holdings h on h.id = i.holding_id
      where h.offering_id = v_distribution.offering_id
        and i.status = 'completed'
        and i.completed_at is not null
    ), sequenced as (
      select
        m.*,
        row_number() over (
          partition by m.holding_id
          order by m.completed_at desc, m.movement_kind desc, m.id desc
        ) as reverse_sequence
      from movements m
    ), historical as (
      select
        h.id as holding_id,
        h.investor_id,
        h.status as holding_status,
        h.ownership_bps
          + coalesce(sum(
              case
                when m.completed_at >= v_cutoff
                 and not (h.status = 'transferred' and m.reverse_sequence = 1)
                then m.units * v_offering.unit_ownership_bps
                else 0
              end
            ), 0)::integer as ownership_bps_at_cutoff,
        max(m.completed_at) filter (where m.reverse_sequence = 1) as final_movement_at
      from public.ownership_holdings h
      left join sequenced m on m.holding_id = h.id
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
        or h.final_movement_at is null
        or h.final_movement_at >= v_cutoff
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
