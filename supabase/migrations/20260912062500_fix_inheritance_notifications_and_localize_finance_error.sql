-- =============================================================================
-- Fix inheritance notifications and localize investor finance access errors.
-- Additive/backward-compatible; no production business rows are rewritten.
-- =============================================================================

alter type public.notification_kind add value if not exists 'ownership_updated';

create or replace function app.notify_ownership_inheritance_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return null;
  end if;

  if new.status = 'approved' then
    insert into public.notifications(
      recipient_id, kind, title, body, entity_type, entity_id, action_url, payload
    ) values (
      new.current_investor_id,
      'ownership_updated',
      'Pewarisan disetujui',
      'Pengajuan pewarisan kepemilikan Anda telah disetujui dan menunggu penyelesaian.',
      'ownership_inheritance',
      new.id,
      '/investor/ownership/inheritance',
      jsonb_build_object('status', new.status::text)
    );
  elsif new.status = 'rejected' then
    insert into public.notifications(
      recipient_id, kind, title, body, entity_type, entity_id, action_url, payload
    ) values (
      new.current_investor_id,
      'ownership_updated',
      'Pewarisan ditolak',
      'Pengajuan pewarisan kepemilikan Anda ditolak. Lihat detail pengajuan untuk alasan penolakan.',
      'ownership_inheritance',
      new.id,
      '/investor/ownership/inheritance',
      jsonb_build_object('status', new.status::text, 'rejection_reason', new.rejection_reason)
    );
  elsif new.status = 'completed' then
    insert into public.notifications(
      recipient_id, kind, title, body, entity_type, entity_id, action_url, payload
    ) values (
      new.current_investor_id,
      'ownership_updated',
      'Pewarisan selesai',
      'Pengajuan pewarisan kepemilikan Anda telah selesai dan cap table resmi telah diperbarui.',
      'ownership_inheritance',
      new.id,
      '/investor/ownership/inheritance',
      jsonb_build_object(
        'status', new.status::text,
        'beneficiary_investor_id', new.beneficiary_investor_id,
        'beneficiary_holding_id', new.beneficiary_holding_id
      )
    );

    if new.beneficiary_investor_id is not null
       and new.beneficiary_investor_id <> new.current_investor_id then
      insert into public.notifications(
        recipient_id, kind, title, body, entity_type, entity_id, action_url, payload
      ) values (
        new.beneficiary_investor_id,
        'ownership_updated',
        'Kepemilikan warisan diterima',
        'Kepemilikan hasil pewarisan telah tercatat pada cap table resmi Anda.',
        'ownership_inheritance',
        new.id,
        '/investor/ownership',
        jsonb_build_object(
          'status', new.status::text,
          'beneficiary_holding_id', new.beneficiary_holding_id
        )
      );
    end if;
  end if;

  return null;
end;
$$;

revoke execute on function app.notify_ownership_inheritance_status() from public, anon, authenticated;

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
    raise exception 'Investor aktif diperlukan untuk melihat ringkasan arus kas.' using errcode = '42501';
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

revoke execute on function app.investor_monthly_cashflow_summary(integer) from public, anon;
grant execute on function app.investor_monthly_cashflow_summary(integer) to authenticated;
