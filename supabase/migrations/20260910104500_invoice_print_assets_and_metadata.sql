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
