-- Dedicated invoice document assets and print metadata configuration.
-- Logo, stamp, and signature are private storage objects and are rendered only
-- through authenticated invoice print views.

alter table public.finance_settings
  add column if not exists company_email text,
  add column if not exists company_phone text,
  add column if not exists company_website text,
  add column if not exists signer_name text,
  add column if not exists signer_title text,
  add column if not exists show_stamp boolean not null default true,
  add column if not exists show_signature boolean not null default true,
  add column if not exists show_print_metadata boolean not null default true,
  add column if not exists show_draft_watermark boolean not null default true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finance-document-assets',
  'finance-document-assets',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Object access is limited to admins allowed to maintain financial reports.
drop policy if exists finance_document_assets_select on storage.objects;
create policy finance_document_assets_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'finance-document-assets'
    and app.has_permission('financial_reports.view')
  );

drop policy if exists finance_document_assets_insert on storage.objects;
create policy finance_document_assets_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'finance-document-assets'
    and app.has_permission('financial_reports.update')
  );

drop policy if exists finance_document_assets_update on storage.objects;
create policy finance_document_assets_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'finance-document-assets'
    and app.has_permission('financial_reports.update')
  )
  with check (
    bucket_id = 'finance-document-assets'
    and app.has_permission('financial_reports.update')
  );

drop policy if exists finance_document_assets_delete on storage.objects;
create policy finance_document_assets_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'finance-document-assets'
    and app.has_permission('financial_reports.update')
  );

-- media_assets remains the canonical registry for uploaded files.
grant insert, update, delete on table public.media_assets to authenticated;

drop policy if exists media_assets_insert_finance_document_assets on public.media_assets;
create policy media_assets_insert_finance_document_assets
  on public.media_assets for insert to authenticated
  with check (
    bucket = 'finance-document-assets'
    and visibility = 'internal'
    and uploaded_by = auth.uid()
    and app.has_permission('financial_reports.update')
  );

drop policy if exists media_assets_update_finance_document_assets on public.media_assets;
create policy media_assets_update_finance_document_assets
  on public.media_assets for update to authenticated
  using (
    bucket = 'finance-document-assets'
    and uploaded_by = auth.uid()
    and app.has_permission('financial_reports.update')
  )
  with check (
    bucket = 'finance-document-assets'
    and visibility = 'internal'
    and uploaded_by = auth.uid()
    and app.has_permission('financial_reports.update')
  );

drop policy if exists media_assets_delete_finance_document_assets on public.media_assets;
create policy media_assets_delete_finance_document_assets
  on public.media_assets for delete to authenticated
  using (
    bucket = 'finance-document-assets'
    and uploaded_by = auth.uid()
    and app.has_permission('financial_reports.update')
  );

drop policy if exists media_assets_select_finance_document_assets on public.media_assets;
create policy media_assets_select_finance_document_assets
  on public.media_assets for select to authenticated
  using (
    bucket = 'finance-document-assets'
    and app.has_permission('financial_reports.view')
  );

-- Snapshot all fields that define a printed invoice at creation time so later
-- settings changes do not rewrite historical invoices.
create or replace function app.create_finance_invoice(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_address text,
  p_due_on date,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_settings public.finance_settings%rowtype;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Missing permission' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 100 then
    raise exception 'Invoice requires 1-100 items' using errcode = '22023';
  end if;

  select * into v_settings from public.finance_settings where singleton = true;

  insert into public.finance_invoices(
    reference,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    due_on,
    currency,
    notes,
    terms_snapshot,
    company_snapshot,
    created_by
  )
  values(
    app.finance_reference(v_settings.invoice_prefix),
    btrim(p_customer_name),
    nullif(btrim(p_customer_email), ''),
    nullif(btrim(p_customer_phone), ''),
    nullif(btrim(p_customer_address), ''),
    p_due_on,
    v_settings.default_currency,
    nullif(btrim(p_notes), ''),
    v_settings.invoice_terms,
    jsonb_build_object(
      'legalName', v_settings.company_legal_name,
      'address', v_settings.company_address,
      'taxId', v_settings.company_tax_id,
      'email', v_settings.company_email,
      'phone', v_settings.company_phone,
      'website', v_settings.company_website,
      'bankDetails', v_settings.bank_details,
      'paymentInstructions', v_settings.payment_instructions,
      'footer', v_settings.invoice_footer,
      'logoAssetId', v_settings.logo_asset_id,
      'stampAssetId', v_settings.stamp_asset_id,
      'signatureAssetId', v_settings.signature_asset_id,
      'signerName', v_settings.signer_name,
      'signerTitle', v_settings.signer_title,
      'showStamp', v_settings.show_stamp,
      'showSignature', v_settings.show_signature,
      'showPrintMetadata', v_settings.show_print_metadata,
      'showDraftWatermark', v_settings.show_draft_watermark,
      'taxInvoiceEnabled', v_settings.tax_invoice_enabled
    ),
    auth.uid()
  )
  returning id into v_id;

  insert into public.finance_invoice_items(
    invoice_id,
    product_id,
    product_code_snapshot,
    name,
    description,
    quantity,
    unit_label,
    unit_price,
    discount_amount,
    tax_rate,
    position
  )
  select
    v_id,
    x.product_id,
    nullif(btrim(x.product_code), ''),
    btrim(x.name),
    nullif(btrim(x.description), ''),
    x.quantity,
    coalesce(nullif(btrim(x.unit_label), ''), 'pax'),
    x.unit_price,
    coalesce(x.discount_amount, 0),
    coalesce(x.tax_rate, 0),
    x.position
  from jsonb_to_recordset(p_items) x(
    product_id uuid,
    product_code text,
    name text,
    description text,
    quantity numeric,
    unit_label text,
    unit_price numeric,
    discount_amount numeric,
    tax_rate numeric,
    position integer
  );

  perform app.recalculate_finance_invoice(v_id);
  return v_id;
end;
$$;

revoke all on function app.create_finance_invoice(text,text,text,text,date,text,jsonb) from public, anon;
grant execute on function app.create_finance_invoice(text,text,text,text,date,text,jsonb) to authenticated;
