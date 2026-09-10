alter table public.finance_settings
  add column logo_asset_id uuid references public.media_assets(id) on delete set null,
  add column stamp_asset_id uuid references public.media_assets(id) on delete set null,
  add column signature_asset_id uuid references public.media_assets(id) on delete set null;

create index finance_settings_logo_asset_id_idx on public.finance_settings(logo_asset_id);
create index finance_settings_stamp_asset_id_idx on public.finance_settings(stamp_asset_id);
create index finance_settings_signature_asset_id_idx on public.finance_settings(signature_asset_id);

create or replace function app.create_finance_invoice(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_customer_address text, p_due_on date, p_notes text, p_items jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_settings public.finance_settings%rowtype;
begin
  if not app.has_permission('financial_reports.update') then raise exception 'Missing permission' using errcode='42501'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then
    raise exception 'Invoice requires 1-100 items' using errcode='22023'; end if;
  select * into v_settings from public.finance_settings where singleton=true;
  insert into public.finance_invoices(reference,customer_name,customer_email,customer_phone,customer_address,
    due_on,currency,notes,terms_snapshot,company_snapshot,created_by)
  values(app.finance_reference(v_settings.invoice_prefix),btrim(p_customer_name),nullif(btrim(p_customer_email),''),
    nullif(btrim(p_customer_phone),''),nullif(btrim(p_customer_address),''),p_due_on,v_settings.default_currency,
    nullif(btrim(p_notes),''),v_settings.invoice_terms,jsonb_build_object('legalName',v_settings.company_legal_name,
    'address',v_settings.company_address,'taxId',v_settings.company_tax_id,'bankDetails',v_settings.bank_details,
    'paymentInstructions',v_settings.payment_instructions,'footer',v_settings.invoice_footer,
    'logoAssetId',v_settings.logo_asset_id,'stampAssetId',v_settings.stamp_asset_id,
    'signatureAssetId',v_settings.signature_asset_id),auth.uid()) returning id into v_id;
  insert into public.finance_invoice_items(invoice_id,product_id,product_code_snapshot,name,description,quantity,
    unit_label,unit_price,discount_amount,tax_rate,position)
  select v_id,x.product_id,nullif(btrim(x.product_code),''),btrim(x.name),nullif(btrim(x.description),''),x.quantity,
    coalesce(nullif(btrim(x.unit_label),''),'pax'),x.unit_price,coalesce(x.discount_amount,0),coalesce(x.tax_rate,0),x.position
  from jsonb_to_recordset(p_items) x(product_id uuid,product_code text,name text,description text,quantity numeric,
    unit_label text,unit_price numeric,discount_amount numeric,tax_rate numeric,position integer);
  perform app.recalculate_finance_invoice(v_id); return v_id;
end; $$;

create or replace function app.issue_finance_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_settings public.finance_settings%rowtype;
begin
  if not app.has_permission('financial_reports.update') then raise exception 'Missing permission' using errcode='42501'; end if;
  select * into v_settings from public.finance_settings where singleton=true;
  update public.finance_invoices set status='issued',issued_on=current_date,issued_by=auth.uid(),updated_at=now(),
    terms_snapshot=v_settings.invoice_terms,
    company_snapshot=jsonb_build_object('legalName',v_settings.company_legal_name,'address',v_settings.company_address,
      'taxId',v_settings.company_tax_id,'bankDetails',v_settings.bank_details,
      'paymentInstructions',v_settings.payment_instructions,'footer',v_settings.invoice_footer,
      'logoAssetId',v_settings.logo_asset_id,'stampAssetId',v_settings.stamp_asset_id,
      'signatureAssetId',v_settings.signature_asset_id)
    where id=p_invoice_id and status='draft' and grand_total>0;
  if not found then raise exception 'Only a non-empty draft invoice can be issued' using errcode='23514'; end if;
end; $$;
