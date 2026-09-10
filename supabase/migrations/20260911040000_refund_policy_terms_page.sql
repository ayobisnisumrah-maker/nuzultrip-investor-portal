-- Refund policy, two-page invoice terms, and secure finance recalculation.
-- Existing invoices remain compatible; new terms/refund settings are snapshotted
-- when an invoice is issued so later configuration changes do not rewrite history.

alter table public.finance_settings
  add column invoice_terms_body text,
  add column terms_letterhead_asset_id uuid references public.media_assets(id) on delete set null,
  add column refund_processing_days integer not null default 90,
  add column refund_day_basis text not null default 'business_days',
  add column refund_tiers jsonb not null default '[]'::jsonb,
  add constraint finance_settings_refund_processing_days_valid
    check (refund_processing_days between 1 and 365),
  add constraint finance_settings_refund_day_basis_valid
    check (refund_day_basis in ('business_days', 'calendar_days')),
  add constraint finance_settings_refund_tiers_array
    check (jsonb_typeof(refund_tiers) = 'array');

create index finance_settings_terms_letterhead_asset_id_idx
  on public.finance_settings(terms_letterhead_asset_id);

alter table public.finance_invoices
  add column departure_on date,
  add column terms_body_snapshot text,
  add column terms_letterhead_asset_id uuid references public.media_assets(id) on delete restrict,
  add column refund_policy_snapshot jsonb not null default '{}'::jsonb,
  add constraint finance_invoices_refund_policy_snapshot_object
    check (jsonb_typeof(refund_policy_snapshot) = 'object');

create index finance_invoices_departure_on_idx
  on public.finance_invoices(departure_on) where departure_on is not null;

-- Trigger helpers are not RPCs. Run the trigger helper with the function owner's
-- rights, while keeping the underlying recalculation helper unavailable to API
-- clients. This fixes refund/payment inserts failing with EXECUTE permission
-- denied on app.recalculate_finance_invoice().
create or replace function app.finance_child_recalculate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform app.recalculate_finance_invoice(old.invoice_id);
    return old;
  end if;
  perform app.recalculate_finance_invoice(new.invoice_id);
  return new;
end;
$$;

revoke all on function app.finance_child_recalculate() from public, anon, authenticated;

-- Terms, letterhead, and refund policy are copied into the invoice at issuance.
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
    ),
    company_snapshot = jsonb_build_object(
      'legalName', v_settings.company_legal_name,
      'address', v_settings.company_address,
      'taxId', v_settings.company_tax_id,
      'bankDetails', v_settings.bank_details,
      'paymentInstructions', v_settings.payment_instructions,
      'footer', v_settings.invoice_footer,
      'logoAssetId', v_settings.logo_asset_id,
      'stampAssetId', v_settings.stamp_asset_id,
      'signatureAssetId', v_settings.signature_asset_id
    )
  where id = p_invoice_id
    and status = 'draft'
    and grand_total > 0;

  if not found then
    raise exception 'Only a non-empty draft invoice can be issued' using errcode = '23514';
  end if;
end;
$$;

-- New legal snapshots are immutable after issuance. Departure date remains
-- separately editable (with an audited RPC below) until a refund exists.
create or replace function app.guard_final_finance_invoice()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status <> 'draft' and
    (
      new.customer_name,
      new.customer_email,
      new.customer_phone,
      new.customer_address,
      new.currency,
      new.subtotal,
      new.discount_total,
      new.tax_total,
      new.grand_total,
      new.terms_snapshot,
      new.terms_body_snapshot,
      new.terms_letterhead_asset_id,
      new.refund_policy_snapshot,
      new.company_snapshot,
      new.issued_on
    ) is distinct from (
      old.customer_name,
      old.customer_email,
      old.customer_phone,
      old.customer_address,
      old.currency,
      old.subtotal,
      old.discount_total,
      old.tax_total,
      old.grand_total,
      old.terms_snapshot,
      old.terms_body_snapshot,
      old.terms_letterhead_asset_id,
      old.refund_policy_snapshot,
      old.company_snapshot,
      old.issued_on
    )
  then
    raise exception 'Issued invoice financial/legal content is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function app.update_finance_policy_settings(
  p_terms_body text,
  p_terms_letterhead_asset_id uuid,
  p_refund_processing_days integer,
  p_refund_day_basis text,
  p_refund_tiers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Missing permission' using errcode = '42501';
  end if;

  if p_refund_processing_days not between 1 and 365 then
    raise exception 'Refund processing days must be between 1 and 365' using errcode = '22023';
  end if;
  if p_refund_day_basis not in ('business_days', 'calendar_days') then
    raise exception 'Invalid refund day basis' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_refund_tiers, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_refund_tiers, '[]'::jsonb)) > 20 then
    raise exception 'Refund tiers must be an array with at most 20 entries' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_refund_tiers, '[]'::jsonb))
      as x("minDaysBeforeDeparture" integer, "maxDaysBeforeDeparture" integer, "refundPercent" numeric)
    where x."minDaysBeforeDeparture" is null
       or x."minDaysBeforeDeparture" < 0
       or (x."maxDaysBeforeDeparture" is not null and x."maxDaysBeforeDeparture" < x."minDaysBeforeDeparture")
       or x."refundPercent" is null
       or x."refundPercent" < 0
       or x."refundPercent" > 100
  ) then
    raise exception 'Invalid refund tier' using errcode = '22023';
  end if;

  if p_terms_letterhead_asset_id is not null and not exists (
    select 1
    from public.media_assets a
    where a.id = p_terms_letterhead_asset_id
      and a.finalized_at is not null
      and a.mime_type in ('image/png', 'image/jpeg', 'image/webp')
  ) then
    raise exception 'Letterhead asset is not a finalized supported image' using errcode = '22023';
  end if;

  update public.finance_settings
  set
    invoice_terms_body = nullif(btrim(coalesce(p_terms_body, '')), ''),
    terms_letterhead_asset_id = p_terms_letterhead_asset_id,
    refund_processing_days = p_refund_processing_days,
    refund_day_basis = p_refund_day_basis,
    refund_tiers = coalesce(p_refund_tiers, '[]'::jsonb),
    updated_by = auth.uid()
  where singleton = true
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function app.update_finance_policy_settings(text, uuid, integer, text, jsonb)
  from public, anon;
grant execute on function app.update_finance_policy_settings(text, uuid, integer, text, jsonb)
  to authenticated;

create or replace function app.set_finance_invoice_departure(
  p_invoice_id uuid,
  p_departure_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.finance_invoice_status;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Missing permission' using errcode = '42501';
  end if;

  select status into v_status
  from public.finance_invoices
  where id = p_invoice_id
  for update;

  if v_status is null then
    raise exception 'Invoice not found' using errcode = 'P0002';
  end if;
  if v_status = 'void' then
    raise exception 'Void invoice cannot change departure date' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.finance_refunds
    where invoice_id = p_invoice_id
      and status in ('requested', 'approved', 'processed')
  ) then
    raise exception 'Departure date is locked after a refund request exists' using errcode = '23514';
  end if;

  update public.finance_invoices
  set departure_on = p_departure_on,
      updated_at = now()
  where id = p_invoice_id;
end;
$$;

revoke all on function app.set_finance_invoice_departure(uuid, date) from public, anon;
grant execute on function app.set_finance_invoice_departure(uuid, date) to authenticated;
