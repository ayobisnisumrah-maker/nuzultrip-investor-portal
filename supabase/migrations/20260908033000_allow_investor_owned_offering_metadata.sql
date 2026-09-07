-- Investors need the offering name and reference unit price for holdings they own.
-- Keep the access boundary narrow: authenticated investors may read only offerings
-- referenced by one of their own holdings. Admin access remains governed by the
-- existing ownership_offerings.* permission policies.

grant select on table public.ownership_offerings to authenticated;

drop policy if exists ownership_offerings_select_owned_by_investor on public.ownership_offerings;
create policy ownership_offerings_select_owned_by_investor
on public.ownership_offerings
for select
to authenticated
using (
  exists (
    select 1
    from public.ownership_holdings h
    where h.offering_id = ownership_offerings.id
      and h.investor_id = app.current_investor_id()
  )
);
