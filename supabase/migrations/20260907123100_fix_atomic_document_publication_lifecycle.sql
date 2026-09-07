create or replace function app.transition_document_publication(
  p_document_id uuid,
  p_target public.publication_status
)
returns table (
  document_id uuid,
  title text,
  previous_status public.publication_status,
  status public.publication_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.documents%rowtype;
  v_version public.document_versions%rowtype;
  v_required_permission text;
begin
  v_required_permission := case p_target
    when 'review' then 'documents.review'
    when 'approved' then 'documents.approve'
    when 'published' then 'documents.publish'
    when 'archived' then 'documents.archive'
    when 'draft' then 'documents.update'
    else null
  end;

  if v_required_permission is null or not app.has_permission(v_required_permission) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;

  select d.* into v_document
  from public.documents d
  where d.id = p_document_id
  for update;

  if not found then
    raise exception 'Dokumen tidak ditemukan.' using errcode = 'P0002';
  end if;

  if not (
    (v_document.status = 'draft' and p_target = 'review') or
    (v_document.status = 'review' and p_target in ('approved', 'draft')) or
    (v_document.status = 'approved' and p_target in ('published', 'draft')) or
    (v_document.status = 'published' and p_target = 'archived')
  ) then
    raise exception 'Transisi status dokumen tidak valid: % -> %.', v_document.status, p_target
      using errcode = '22023';
  end if;

  if p_target <> 'archived' then
    if v_document.current_version_id is null then
      raise exception 'Dokumen belum memiliki versi aktif.' using errcode = '22023';
    end if;

    select dv.* into v_version
    from public.document_versions dv
    where dv.id = v_document.current_version_id
      and dv.document_id = v_document.id
    for update;

    if not found then
      raise exception 'Versi aktif dokumen tidak ditemukan.' using errcode = 'P0002';
    end if;
  end if;

  if p_target = 'published' then
    if v_version.status <> 'approved' then
      raise exception 'Versi aktif dokumen harus disetujui sebelum diterbitkan.' using errcode = '22023';
    end if;

    update public.document_versions dv
    set status = 'published'
    where dv.id = v_version.id;

    update public.documents d
    set status = 'published',
        published_version_id = v_version.id
    where d.id = v_document.id;
  elsif p_target = 'archived' then
    update public.documents d
    set status = 'archived', archived_at = now()
    where d.id = v_document.id;
  else
    update public.document_versions dv
    set status = p_target
    where dv.id = v_version.id;

    update public.documents d
    set status = p_target,
        archived_at = null
    where d.id = v_document.id;
  end if;

  return query
  select v_document.id, v_document.title, v_document.status, p_target;
end;
$$;

revoke all on function app.transition_document_publication(uuid, public.publication_status) from public;
grant execute on function app.transition_document_publication(uuid, public.publication_status) to authenticated;
