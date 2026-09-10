-- Profit distributions must use the same immutable financial snapshot that
-- investors see. Historical rows remain nullable, but every new distribution
-- and every distribution entering review must reference a published
-- report version from a closed financial period.

alter table public.profit_distributions
  add column if not exists financial_report_version_id uuid;

alter table public.profit_distributions
  add constraint profit_distributions_financial_report_version_fk
  foreign key (financial_report_version_id)
  references public.financial_report_versions(id)
  on delete restrict;

create index if not exists profit_distributions_financial_report_version_idx
  on public.profit_distributions(financial_report_version_id)
  where financial_report_version_id is not null;

comment on column public.profit_distributions.financial_report_version_id is
  'Immutable published financial report snapshot used to derive revenue, expenses, profit, and investor pool.';

revoke all on function app.create_profit_distribution(uuid,date,date,numeric,numeric,integer,integer,text)
  from public, anon, authenticated;
drop function app.create_profit_distribution(uuid,date,date,numeric,numeric,integer,integer,text);

create or replace function app.create_profit_distribution(
  p_offering_id uuid,
  p_financial_report_version_id uuid,
  p_company_share_bps integer default 6000,
  p_investor_pool_bps integer default 4000,
  p_notes text default null
)
returns public.profit_distributions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.profit_distributions%rowtype;
  v_period_id uuid;
  v_period_start date;
  v_period_end date;
  v_period_status public.period_status;
  v_report_status public.publication_status;
  v_version_status public.publication_status;
  v_revenue numeric(20,2);
  v_expenses numeric(20,2);
  v_profit numeric(20,2);
begin
  if not app.has_permission('profit_distributions.create') then
    raise exception 'Missing permission: profit_distributions.create' using errcode='42501';
  end if;
  if p_company_share_bps < 0 or p_investor_pool_bps < 0
     or p_company_share_bps + p_investor_pool_bps <> 10000 then
    raise exception 'Company and investor pool shares must total 10000 bps.' using errcode='23514';
  end if;

  perform 1 from public.ownership_offerings
  where id = p_offering_id and status <> 'archived'
  for share;
  if not found then
    raise exception 'Ownership offering not found or archived.' using errcode='P0002';
  end if;

  select fp.id, fp.starts_on, fp.ends_on, fp.status, fr.status, fv.status
    into v_period_id, v_period_start, v_period_end, v_period_status,
         v_report_status, v_version_status
  from public.financial_report_versions fv
  join public.financial_reports fr on fr.id = fv.financial_report_id
  join public.financial_periods fp on fp.id = fr.financial_period_id
  where fv.id = p_financial_report_version_id
    and fr.status = 'published'
    and fr.published_version_id = fv.id
  for share of fv, fr, fp;

  if v_period_id is null
     or v_report_status <> 'published'
     or v_version_status <> 'published' then
    raise exception 'Financial report version must be the published snapshot.' using errcode='23514';
  end if;
  if v_period_status not in ('closed','locked') then
    raise exception 'Financial period must be closed before profit distribution.' using errcode='23514';
  end if;

  select
    coalesce(sum(amount) filter (where statement='income' and category='revenue'), 0),
    coalesce(sum(amount) filter (where statement='income' and category='expense'), 0)
  into v_revenue, v_expenses
  from public.financial_line_items
  where financial_report_version_id = p_financial_report_version_id;

  v_profit := greatest(v_revenue - v_expenses, 0);

  if exists (
    select 1 from public.profit_distributions
    where offering_id = p_offering_id
      and status <> 'cancelled'
      and daterange(period_start, period_end, '[]')
          && daterange(v_period_start, v_period_end, '[]')
  ) then
    raise exception 'Distribution period overlaps an existing distribution for this offering.' using errcode='23505';
  end if;

  insert into public.profit_distributions(
    offering_id, financial_report_version_id, period_start, period_end,
    revenue_amount, opex_amount, profit_amount, company_share_bps,
    investor_pool_bps, investor_pool_amount, status, notes, created_by, updated_by
  ) values (
    p_offering_id, p_financial_report_version_id, v_period_start, v_period_end,
    v_revenue, v_expenses, v_profit, p_company_share_bps,
    p_investor_pool_bps, v_profit * p_investor_pool_bps / 10000.0,
    'draft', nullif(btrim(coalesce(p_notes,'')),''), auth.uid(), auth.uid()
  ) returning * into v_row;

  return v_row;
end;
$$;

revoke all on function app.create_profit_distribution(uuid,uuid,integer,integer,text)
  from public, anon;
grant execute on function app.create_profit_distribution(uuid,uuid,integer,integer,text)
  to authenticated;

-- Guard the lifecycle as well as creation so legacy/manual rows cannot be
-- published as investor liabilities without an authoritative snapshot.
create or replace function app.assert_profit_distribution_snapshot(
  p_distribution_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_distribution public.profit_distributions%rowtype;
  v_expected_revenue numeric(20,2);
  v_expected_expenses numeric(20,2);
begin
  select * into v_distribution
  from public.profit_distributions
  where id = p_distribution_id;

  if v_distribution.financial_report_version_id is null then
    raise exception 'Profit distribution requires a financial report snapshot.' using errcode='23514';
  end if;

  select
    coalesce(sum(amount) filter (where statement='income' and category='revenue'), 0),
    coalesce(sum(amount) filter (where statement='income' and category='expense'), 0)
  into v_expected_revenue, v_expected_expenses
  from public.financial_line_items
  where financial_report_version_id = v_distribution.financial_report_version_id;

  if v_distribution.revenue_amount <> v_expected_revenue
     or v_distribution.opex_amount <> v_expected_expenses
     or v_distribution.profit_amount <> greatest(v_expected_revenue-v_expected_expenses,0)
     or v_distribution.investor_pool_amount <>
        greatest(v_expected_revenue-v_expected_expenses,0) * v_distribution.investor_pool_bps / 10000.0 then
    raise exception 'Profit distribution no longer reconciles with its financial report snapshot.' using errcode='23514';
  end if;
end;
$$;

revoke all on function app.assert_profit_distribution_snapshot(uuid) from public, anon;
grant execute on function app.assert_profit_distribution_snapshot(uuid) to authenticated, service_role;

create or replace function app.guard_profit_distribution_snapshot_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('review','approved','payable','paid') then
    perform app.assert_profit_distribution_snapshot(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profit_distributions_guard_snapshot_transition
  on public.profit_distributions;
create trigger profit_distributions_guard_snapshot_transition
  before update of status on public.profit_distributions
  for each row execute function app.guard_profit_distribution_snapshot_transition();
