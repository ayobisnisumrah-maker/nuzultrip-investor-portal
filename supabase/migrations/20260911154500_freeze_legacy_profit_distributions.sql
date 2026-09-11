-- Preserve historical profit distributions that predate the authoritative
-- financial-report snapshot linkage while preventing any new bypass.
--
-- Existing NULL snapshot rows are intentionally NOT rewritten. The NOT VALID
-- constraint keeps them queryable/auditable, but every new INSERT and every
-- subsequent UPDATE must satisfy the snapshot requirement.

alter table public.profit_distributions
  add constraint profit_distributions_require_financial_snapshot
  check (financial_report_version_id is not null)
  not valid;

create or replace function app.guard_profit_distribution_snapshot_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_period_start date;
  v_period_end date;
  v_period_status public.period_status;
  v_report_status public.publication_status;
  v_version_status public.publication_status;
  v_expected_revenue numeric(20,2);
  v_expected_expenses numeric(20,2);
  v_expected_profit numeric(20,2);
  v_expected_pool numeric(20,2);
  v_snapshot_changed boolean;
  v_economics_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.financial_report_version_id is null then
      raise exception 'Profit distribution requires an authoritative financial report snapshot.'
        using errcode = '23514';
    end if;

    if new.status <> 'draft' then
      raise exception 'New profit distributions must start in draft status.'
        using errcode = '23514';
    end if;

    v_snapshot_changed := true;
    v_economics_changed := true;
  else
    v_snapshot_changed :=
      new.financial_report_version_id is distinct from old.financial_report_version_id;

    v_economics_changed :=
      new.offering_id is distinct from old.offering_id
      or new.period_start is distinct from old.period_start
      or new.period_end is distinct from old.period_end
      or new.revenue_amount is distinct from old.revenue_amount
      or new.opex_amount is distinct from old.opex_amount
      or new.profit_amount is distinct from old.profit_amount
      or new.company_share_bps is distinct from old.company_share_bps
      or new.investor_pool_bps is distinct from old.investor_pool_bps
      or new.investor_pool_amount is distinct from old.investor_pool_amount;

    -- Historical rows that have no authoritative source remain visible but are
    -- frozen. The only permitted structural repair is assigning a snapshot that
    -- passes every reconciliation check below in the same update.
    if old.financial_report_version_id is null
       and new.financial_report_version_id is null
       and (
         new.status is distinct from old.status
         or v_economics_changed
       ) then
      raise exception
        'Legacy profit distribution without an authoritative financial snapshot is frozen until exact reconciliation is possible.'
        using errcode = '23514';
    end if;

    if old.financial_report_version_id is not null
       and v_snapshot_changed then
      raise exception 'Financial report snapshot reference is immutable once assigned.'
        using errcode = '23514';
    end if;
  end if;

  -- Notes and bookkeeping-only updates on already-linked rows do not need to
  -- re-scan the snapshot. Lifecycle/economic/source changes do.
  if tg_op = 'UPDATE'
     and new.financial_report_version_id is not null
     and not v_snapshot_changed
     and not v_economics_changed
     and new.status is not distinct from old.status then
    return new;
  end if;

  if new.financial_report_version_id is null then
    -- The NOT VALID check constraint keeps pre-existing NULL rows readable, but
    -- no new/updated row is allowed to remain unresolved.
    raise exception 'Profit distribution requires an authoritative financial report snapshot.'
      using errcode = '23514';
  end if;

  select
    fp.starts_on,
    fp.ends_on,
    fp.status,
    fr.status,
    fv.status
  into
    v_period_start,
    v_period_end,
    v_period_status,
    v_report_status,
    v_version_status
  from public.financial_report_versions fv
  join public.financial_reports fr
    on fr.id = fv.financial_report_id
  join public.financial_periods fp
    on fp.id = fr.financial_period_id
  where fv.id = new.financial_report_version_id
    and fr.status = 'published'
    and fr.published_version_id = fv.id;

  if v_period_start is null
     or v_report_status <> 'published'
     or v_version_status <> 'published' then
    raise exception 'Financial report version must be the currently published snapshot.'
      using errcode = '23514';
  end if;

  if v_period_status not in ('closed', 'locked') then
    raise exception 'Financial period must be closed before profit distribution reconciliation.'
      using errcode = '23514';
  end if;

  if new.period_start is distinct from v_period_start
     or new.period_end is distinct from v_period_end then
    raise exception
      'Profit distribution period must exactly match its financial report snapshot period.'
      using errcode = '23514';
  end if;

  select
    coalesce(sum(amount) filter (where statement = 'income' and category = 'revenue'), 0),
    coalesce(sum(amount) filter (where statement = 'income' and category = 'expense'), 0)
  into v_expected_revenue, v_expected_expenses
  from public.financial_line_items
  where financial_report_version_id = new.financial_report_version_id;

  v_expected_profit := greatest(v_expected_revenue - v_expected_expenses, 0);
  v_expected_pool := v_expected_profit * new.investor_pool_bps / 10000.0;

  if new.revenue_amount <> v_expected_revenue
     or new.opex_amount <> v_expected_expenses
     or new.profit_amount <> v_expected_profit
     or new.investor_pool_amount <> v_expected_pool then
    raise exception
      'Profit distribution no longer reconciles with its financial report snapshot.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Reuse the existing guard function so generated API/database types do not gain
-- a new RPC surface. The broader event list closes direct-table bypasses.
drop trigger if exists profit_distributions_guard_snapshot_transition
  on public.profit_distributions;

create trigger profit_distributions_guard_snapshot_transition
before insert or update of
  status,
  offering_id,
  financial_report_version_id,
  period_start,
  period_end,
  revenue_amount,
  opex_amount,
  profit_amount,
  company_share_bps,
  investor_pool_bps,
  investor_pool_amount
on public.profit_distributions
for each row
execute function app.guard_profit_distribution_snapshot_transition();