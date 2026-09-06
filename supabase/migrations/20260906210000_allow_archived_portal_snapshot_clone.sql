-- Allow the lifecycle restore function to create an immutable draft clone of the
-- last published snapshot while an archived page is being restored.
-- Direct content edits remain forbidden unless the page itself is already Draft.

begin;

create or replace function app.guard_portal_section_version_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page_status public.publication_status;
  v_source_content jsonb;
begin
  select
    p.status,
    source.content
  into
    v_page_status,
    v_source_content
  from public.portal_sections s
  join public.portal_pages p on p.id = s.page_id
  left join public.portal_section_versions source
    on source.id = coalesce(s.published_version_id, s.current_version_id)
   and source.status = 'published'
  where s.id = new.section_id;

  if v_page_status is null then
    raise exception 'Portal page for section not found.' using errcode = 'P0002';
  end if;

  if v_page_status = 'draft' then
    return new;
  end if;

  -- Archived -> Draft restoration must first clone the exact last published
  -- snapshot. This exception cannot be used to modify content: the inserted
  -- payload must byte-for-byte match the immutable published JSON snapshot.
  if v_page_status = 'archived'
     and new.status = 'draft'
     and new.change_note = 'Restored from archived portal page.'
     and new.created_by = app.current_user_id()
     and v_source_content is not null
     and new.content = v_source_content then
    return new;
  end if;

  raise exception 'Portal content can only be edited while the page is in Draft.'
    using errcode = '23514';
end;
$$;

revoke all on function app.guard_portal_section_version_insert() from public, anon, authenticated;

commit;
