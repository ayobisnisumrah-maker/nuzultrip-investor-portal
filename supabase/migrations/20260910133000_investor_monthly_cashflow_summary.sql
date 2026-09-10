create or replace function app.investor_monthly_cashflow_summary(
  p_months integer default 6
)
returns table (
  month_start date,
  cash_in numeric,
  cash_out numeric,
  net_cashflow numeric,
  pax numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public, app
as $$
declare
  v_investor_id uuid := app.current_investor_id();
  v_months integer := greatest(1, least(coalesce(p_months, 6), 24));
  v_first_month date;
begin
  if v_investor_id is null or not exists (
    select 1
    from public.investors i
    where i.id = v_investor_id
      and i.status = 'active'
  ) then
    raise exception 'active investor required';
  end if;

  v_first_month := (
    date_trunc('month', current_date)::date
    - ((v_months - 1) * interval '1 month')
  )::date;

  return query
  with months as (
    select generate_series(
      v_first_month::timestamp,
      date_trunc('month', current_date),
      interval '1 month'
    )::date as month_start
  ),
  payment_totals as (
    select
      date_trunc('month', p.received_at)::date as month_start,
      sum(p.amount)::numeric as amount
    from public.finance_payments p
    where p.status = 'confirmed'
      and p.received_at >= v_first_month
    group by 1
  ),
  refund_totals as (
    select
      date_trunc('month', r.processed_at)::date as month_start,
      sum(r.amount)::numeric as amount
    from public.finance_refunds r
    where r.status = 'processed'
      and r.processed_at is not null
      and r.processed_at >= v_first_month
    group by 1
  ),
  expense_totals as (
    select
      date_trunc('month', e.expense_on)::date as month_start,
      sum(e.total_amount)::numeric as amount
    from public.finance_expenses e
    where e.status = 'recorded'
      and e.expense_on >= v_first_month
    group by 1
  ),
  pax_totals as (
    select
      date_trunc('month', i.issued_on)::date as month_start,
      sum(ii.quantity)::numeric as pax
    from public.finance_invoices i
    join public.finance_invoice_items ii on ii.invoice_id = i.id
    where i.status <> 'void'
      and i.issued_on >= v_first_month
      and lower(trim(ii.unit_label)) in ('pax', 'jamaah', 'orang', 'person')
    group by 1
  )
  select
    m.month_start,
    coalesce(p.amount, 0)::numeric as cash_in,
    (coalesce(r.amount, 0) + coalesce(e.amount, 0))::numeric as cash_out,
    (coalesce(p.amount, 0) - coalesce(r.amount, 0) - coalesce(e.amount, 0))::numeric as net_cashflow,
    coalesce(px.pax, 0)::numeric as pax
  from months m
  left join payment_totals p using (month_start)
  left join refund_totals r using (month_start)
  left join expense_totals e using (month_start)
  left join pax_totals px using (month_start)
  order by m.month_start desc;
end;
$$;

comment on function app.investor_monthly_cashflow_summary(integer) is
  'Investor-safe aggregate of confirmed cash receipts, processed refunds, recorded expenses, and issued pax/people quantities. Returns monthly totals only and intentionally exposes no transaction or counterparty detail.';

revoke execute on function app.investor_monthly_cashflow_summary(integer) from public, anon;
grant execute on function app.investor_monthly_cashflow_summary(integer) to authenticated;
