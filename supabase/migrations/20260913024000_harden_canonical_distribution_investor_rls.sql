-- =============================================================================
-- Canonical investor reads for profit distributions.
--
-- Investors may only read distributions backed by the currently published
-- official financial-report version for a closed/locked period. The helper is
-- SECURITY DEFINER to evaluate the cross-table predicate without recursive RLS
-- between profit_distributions and profit_distribution_allocations.
-- =============================================================================

create or replace function private.investor_can_read_canonical_distribution(
  p_distribution_id uuid,
  p_investor_id uuid,
  p_allocation_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_investor_id is not null
    and p_investor_id = app.current_investor_id()
    and exists (
      select 1
      from public.profit_distributions d
      join public.financial_report_versions v
        on v.id = d.financial_report_version_id
      join public.financial_reports r
        on r.id = v.financial_report_id
       and r.published_version_id = v.id
      join public.financial_periods fp
        on fp.id = r.financial_period_id
      where (p_distribution_id is null or d.id = p_distribution_id)
        and d.status in (
          'payable'::public.profit_distribution_status,
          'paid'::public.profit_distribution_status
        )
        and d.financial_report_version_id is not null
        and v.status = 'published'::public.publication_status
        and r.status = 'published'::public.publication_status
        and fp.status in (
          'closed'::public.period_status,
          'locked'::public.period_status
        )
        and d.period_start = fp.starts_on
        and d.period_end = fp.ends_on
        and exists (
          select 1
          from public.profit_distribution_allocations own
          where own.distribution_id = d.id
            and own.investor_id = p_investor_id
            and own.status in ('payable', 'paid')
            and (p_allocation_id is null or own.id = p_allocation_id)
        )
    );
$$;

revoke all on function private.investor_can_read_canonical_distribution(uuid, uuid, uuid)
  from public, anon;
grant execute on function private.investor_can_read_canonical_distribution(uuid, uuid, uuid)
  to authenticated, service_role;

alter policy profit_distributions_select_self
  on public.profit_distributions
  using (
    private.investor_can_read_canonical_distribution(
      id,
      app.current_investor_id(),
      null::uuid
    )
  );

alter policy profit_distribution_allocations_select_self
  on public.profit_distribution_allocations
  using (
    investor_id = app.current_investor_id()
    and status in ('payable', 'paid')
    and private.investor_can_read_canonical_distribution(
      distribution_id,
      investor_id,
      id
    )
  );

alter policy profit_distribution_payment_proofs_select_self
  on public.profit_distribution_payment_proofs
  using (
    investor_id = app.current_investor_id()
    and private.investor_can_read_canonical_distribution(
      null::uuid,
      investor_id,
      allocation_id
    )
  );
