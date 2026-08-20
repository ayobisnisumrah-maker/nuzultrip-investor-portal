-- =============================================================================
-- Fix ambiguous visibility reference in document creation RPC
-- =============================================================================

create or replace function app.create_document_with_draft(
  p_title text,
  p_slug text,
  p_kind public.document_kind,
  p_summary text default null,
  p_visibility public.visibility default 'internal',
  p_file_asset_id uuid default null
)
returns table (
  document_id uuid,
  version_id uuid,
  title text,
  slug text,
  kind public.document_kind,
  summary text,
  visibility public.visibility,
  status public.publication_status,
  version_number integer,
  file_asset_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_version_id uuid;
  v_admin_id uuid;
  v_asset public.media_assets;
begin
  if not app.has_permission('documents.create') then
    raise exception 'Missing documents.create permission.'
      using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  if v_admin_id is null then
    raise exception 'Authenticated administrator required.'
      using errcode = '42501';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Document title is required.'
      using errcode = '22023';
  end if;

  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'Document slug is required.'
      using errcode = '22023';
  end if;

  if p_file_asset_id is not null then
    select ma.*
      into v_asset
    from public.media_assets as ma
    where ma.id = p_file_asset_id
      and ma.uploaded_by = v_admin_id
      and ma.finalized_at is not null
      and ma.visibility = 'restricted'
    for update;

    if v_asset.id is null then
      raise exception 'File asset tidak ditemukan atau tidak dapat digunakan.'
        using errcode = '42501';
    end if;

    if exists (
      select 1
      from public.document_versions as dv
      where dv.file_asset_id = p_file_asset_id
    ) then
      raise exception 'File asset sudah digunakan oleh versi dokumen lain.'
        using errcode = '23505';
    end if;
  end if;

  insert into public.documents (
    title,
    slug,
    kind,
    summary,
    visibility,
    status,
    owner_admin_id
  )
  values (
    trim(p_title),
    trim(p_slug),
    p_kind,
    nullif(trim(p_summary), ''),
    p_visibility,
    'draft',
    v_admin_id
  )
  returning id into v_document_id;

  insert into public.document_versions (
    document_id,
    title,
    version_number,
    status,
    content,
    file_asset_id,
    created_by
  )
  values (
    v_document_id,
    trim(p_title),
    1,
    'draft',
    '{}'::jsonb,
    p_file_asset_id,
    v_admin_id
  )
  returning id into v_version_id;

  update public.documents as d
  set current_version_id = v_version_id
  where d.id = v_document_id;

  return query
  select
    d.id,
    v.id,
    d.title,
    d.slug,
    d.kind,
    d.summary,
    d.visibility,
    d.status,
    v.version_number,
    v.file_asset_id
  from public.documents as d
  join public.document_versions as v
    on v.id = d.current_version_id
  where d.id = v_document_id;
end;
$$;

revoke all on function app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility,
  uuid
) from public, anon;

grant execute on function app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility,
  uuid
) to authenticated, service_role;

comment on function app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility,
  uuid
) is
  'Atomically creates a draft document and initial version, optionally attaching a finalized media asset owned by the current administrator.';
