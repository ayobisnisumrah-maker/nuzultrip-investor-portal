-- Reconcile the legacy ownership-engine offering with the published Nuzultrip
-- Equity terms. This is intentionally defensive because economic configuration
-- must never be silently rewritten after allocations begin.
do $$
declare
  v_offering public.ownership_offerings%rowtype;
begin
  select * into v_offering
  from public.ownership_offerings
  where code = 'nuzultrip-ownership-2026'
  for update;

  -- Fresh/local environments may not contain the operational offering row.
  if not found then
    return;
  end if;

  -- Already reconciled: make the migration safely idempotent.
  if v_offering.total_offered_bps = 4000
     and v_offering.unit_ownership_bps = 80
     and v_offering.total_units = 50
     and v_offering.unit_price = 100000000
     and v_offering.distribution_cadence_months = 1 then
    return;
  end if;

  if exists (
    select 1
    from public.ownership_holdings h
    where h.offering_id = v_offering.id
  ) then
    raise exception 'Cannot reconcile Nuzultrip Equity offering after holdings exist.'
      using errcode = '23514';
  end if;

  -- Only rewrite the exact stale configuration observed in production. If an
  -- operator has already changed any commercial term, stop for manual review.
  if not (
    v_offering.total_offered_bps = 1000
    and v_offering.unit_ownership_bps = 10
    and v_offering.total_units = 100
    and v_offering.unit_price = 10000000
    and v_offering.distribution_cadence_months = 6
  ) then
    raise exception 'Nuzultrip Equity offering differs from the audited stale configuration; manual review required.'
      using errcode = '23514';
  end if;

  update public.ownership_offerings
  set
    total_offered_bps = 4000,
    unit_ownership_bps = 80,
    unit_price = 100000000,
    total_units = 50,
    distribution_cadence_months = 1,
    updated_at = now()
  where id = v_offering.id;
end;
$$;
