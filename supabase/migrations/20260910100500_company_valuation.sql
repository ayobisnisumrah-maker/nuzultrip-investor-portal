-- Company valuation belongs to the ownership offering business domain.
-- It is intentionally separate from unit_price so administrators can state the
-- approved company valuation while historical holdings keep their transaction values.

alter table public.ownership_offerings
  add column if not exists company_valuation numeric(18,2);

alter table public.ownership_offerings
  drop constraint if exists ownership_offerings_company_valuation_positive;

alter table public.ownership_offerings
  add constraint ownership_offerings_company_valuation_positive
  check (company_valuation is null or company_valuation > 0);

comment on column public.ownership_offerings.company_valuation is
  'Approved company valuation in IDR for this offering. Public display may derive compact labels from this value.';

-- Expose only the active public valuation, not the ownership offering table.
-- The function returns one safe scalar and keeps offering administration behind RLS.
create or replace function public.get_public_company_valuation()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select o.company_valuation
  from public.ownership_offerings o
  where o.status = 'open'
    and o.company_valuation is not null
    and (o.effective_from is null or o.effective_from <= now())
    and (o.effective_until is null or o.effective_until > now())
  order by o.effective_from desc nulls last, o.created_at desc
  limit 1;
$$;

revoke all on function public.get_public_company_valuation() from public;
grant execute on function public.get_public_company_valuation() to anon, authenticated;
