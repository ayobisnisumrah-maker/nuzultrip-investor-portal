-- Preserve the company/branding snapshot captured when an invoice is created.
-- Issuing an invoice may snapshot issuance-specific terms/refund policy, but it must
-- not replace logo/stamp/signature/company identity with whatever happens to be in
-- finance_settings later. This keeps the document visually stable from draft to issue.

create or replace function app.issue_finance_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.finance_settings%rowtype;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Missing permission' using errcode = '42501';
  end if;

  select * into v_settings
  from public.finance_settings
  where singleton = true;

  update public.finance_invoices
  set
    status = 'issued',
    issued_on = current_date,
    issued_by = auth.uid(),
    updated_at = now(),
    terms_snapshot = v_settings.invoice_terms,
    terms_body_snapshot = v_settings.invoice_terms_body,
    terms_letterhead_asset_id = v_settings.terms_letterhead_asset_id,
    refund_policy_snapshot = jsonb_build_object(
      'processingDays', v_settings.refund_processing_days,
      'dayBasis', v_settings.refund_day_basis,
      'tiers', v_settings.refund_tiers
    )
  where id = p_invoice_id
    and status = 'draft'
    and grand_total > 0;

  if not found then
    raise exception 'Only a non-empty draft invoice can be issued' using errcode = '23514';
  end if;
end;
$$;
