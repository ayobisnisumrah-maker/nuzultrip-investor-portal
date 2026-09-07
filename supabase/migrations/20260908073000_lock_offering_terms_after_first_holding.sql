-- Once an ownership offering has produced a holding, its economic contract must
-- remain stable. Holdings snapshot ownership BPS, while other surfaces continue
-- to read offering-level price/cadence metadata; changing those terms later
-- would make historical and current records disagree.
create or replace function app.guard_ownership_offering_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.ownership_holdings h
    where h.offering_id = old.id
  ) and (
    new.total_offered_bps is distinct from old.total_offered_bps
    or new.unit_ownership_bps is distinct from old.unit_ownership_bps
    or new.unit_price is distinct from old.unit_price
    or new.total_units is distinct from old.total_units
    or new.distribution_cadence_months is distinct from old.distribution_cadence_months
    or new.transfer_lock_months is distinct from old.transfer_lock_months
  ) then
    raise exception 'Ownership offering economic terms cannot change after the first holding exists.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists ownership_offerings_guard_terms on public.ownership_offerings;
create trigger ownership_offerings_guard_terms
before update on public.ownership_offerings
for each row execute function app.guard_ownership_offering_terms();

revoke all on function app.guard_ownership_offering_terms() from public, anon, authenticated;
