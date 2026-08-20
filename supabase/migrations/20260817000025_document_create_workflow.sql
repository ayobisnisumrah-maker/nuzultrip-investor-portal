-- =============================================================================
-- Atomic document creation
--
-- Creates a document and its initial draft version atomically.
-- Authorization is explicitly enforced inside the function because the final
-- current_version_id update would otherwise require documents.update.
-- =============================================================================

create or replace function app.create_document_with_draft(
  p_title text,
  p_slug text,
  p_kind public.document_kind,
  p_summary text default null,
  p_visibility public.visibility default 'internal'
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
  version_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_version_id uuid;
  v_admin_id uuid;
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
    created_by
  )
  values (
    v_document_id,
    trim(p_title),
    1,
    'draft',
    '{}'::jsonb,
    v_admin_id
  )
  returning id into v_version_id;

  update public.documents
  set current_version_id = v_version_id
  where id = v_document_id;

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
    v.version_number
  from public.documents d
  join public.document_versions v
    on v.id = d.current_version_id
  where d.id = v_document_id;
end;
$$;

revoke all on function app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility
) from public;

grant execute on function app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility
) to authenticated;
