-- =============================================================================
-- Repair portal restore -> resubmission lifecycle
--
-- 20260903110000 restored the page timestamp invariant but accidentally
-- replaced the archived -> draft version-copy logic introduced by
-- 20260901230217. A restored page could therefore keep a published immutable
-- version as its current version. Sending that draft page for review then
-- attempted to update the published row and failed in the immutability trigger.
-- =============================================================================

-- Repair existing draft pages first. Published history stays untouched; each
-- affected section receives a fresh editable current version.
with inconsistent_sections as (
  select
    section.id as section_id,
    version.content,
    version.created_by
  from public.portal_pages as page
  join public.portal_sections as section
    on section.page_id = page.id
  join public.portal_section_versions as version
    on version.id = section.current_version_id
  where page.status = 'draft'
    and version.status = 'published'
),
copied_versions as (
  insert into public.portal_section_versions (
    section_id,
    status,
    content,
    change_note,
    created_by
  )
  select
    section_id,
    'draft',
    content,
    'Recovered immutable published version after archive restore.',
    created_by
  from inconsistent_sections
  returning id, section_id
)
update public.portal_sections as section
set
  current_version_id = copied_versions.id,
  status = 'draft'
from copied_versions
where section.id = copied_versions.section_id;

-- A page whose container is draft cannot legitimately keep a review/approved
-- current version. These statuses are mutable, so return them to draft in
-- place while clearing approval metadata.
update public.portal_section_versions as version
set
  status = 'draft',
  approved_by = null,
  approved_at = null
from public.portal_sections as section
join public.portal_pages as page
  on page.id = section.page_id
where version.id = section.current_version_id
  and page.status = 'draft'
  and version.status in ('review', 'approved');

update public.portal_sections as section
set status = 'draft'
from public.portal_pages as page
where page.id = section.page_id
  and page.status = 'draft'
  and section.status <> 'draft';

create or replace function app.transition_portal_page(
  p_page_id uuid,
  p_to_status public.publication_status
)
returns table (
  page_id uuid,
  page_title text,
  previous_status public.publication_status,
  status public.publication_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.portal_pages%rowtype;
  v_actor uuid := app.current_user_id();
  v_permission text;
  v_invalid_count integer;
begin
  v_permission := case p_to_status
    when 'draft' then 'portal.update'
    when 'review' then 'portal.publish'
    when 'approved' then 'portal.publish'
    when 'published' then 'portal.publish'
    when 'archived' then 'portal.publish'
    else null
  end;

  if v_permission is null or not app.has_permission(v_permission) then
    raise exception 'Insufficient permission for portal transition to %.', p_to_status
      using errcode = '42501';
  end if;

  select *
  into v_page
  from public.portal_pages
  where id = p_page_id
  for update;

  if not found then
    raise exception 'Portal page not found.'
      using errcode = 'P0002';
  end if;

  if p_to_status = v_page.status then
    return query
    select v_page.id, v_page.title, v_page.status, v_page.status;
    return;
  end if;

  if not (
    (v_page.status = 'draft' and p_to_status = 'review')
    or (v_page.status = 'review' and p_to_status in ('approved', 'draft'))
    or (v_page.status = 'approved' and p_to_status in ('published', 'draft'))
    or (v_page.status = 'published' and p_to_status = 'archived')
    or (v_page.status = 'archived' and p_to_status = 'draft')
  ) then
    raise exception
      'Invalid portal publication transition: % -> %.',
      v_page.status,
      p_to_status
      using errcode = '23514';
  end if;

  if p_to_status = 'review' then
    select count(*)
    into v_invalid_count
    from public.portal_sections as section
    where section.page_id = v_page.id
      and section.is_visible
      and section.current_version_id is null;

    if v_invalid_count > 0 then
      raise exception
        'Every visible portal section must have a current version before review.'
        using errcode = '23514';
    end if;

    select count(*)
    into v_invalid_count
    from public.portal_sections as section
    join public.portal_section_versions as version
      on version.id = section.current_version_id
    where section.page_id = v_page.id
      and section.is_visible
      and version.status <> 'draft';

    if v_invalid_count > 0 then
      raise exception
        'Every visible current portal section must be draft before review.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions as version
    set status = 'review'
    from public.portal_sections as section
    where section.id = version.section_id
      and section.page_id = v_page.id
      and section.is_visible
      and section.current_version_id = version.id
      and version.status = 'draft';

  elsif p_to_status = 'approved' then
    select count(*)
    into v_invalid_count
    from public.portal_sections as section
    join public.portal_section_versions as version
      on version.id = section.current_version_id
    where section.page_id = v_page.id
      and section.is_visible
      and version.status <> 'review';

    if v_invalid_count > 0 then
      raise exception
        'Every visible current portal section must be in review before approval.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions as version
    set
      status = 'approved',
      approved_by = v_actor,
      approved_at = now()
    from public.portal_sections as section
    where section.id = version.section_id
      and section.page_id = v_page.id
      and section.is_visible
      and section.current_version_id = version.id;

  elsif p_to_status = 'draft' then
    if v_page.status = 'archived' then
      -- Keep published versions immutable and create editable copies. This is
      -- the behavior that the timestamp-only migration accidentally removed.
      with copied_versions as (
        insert into public.portal_section_versions (
          section_id,
          status,
          content,
          change_note,
          created_by
        )
        select
          section.id,
          'draft',
          version.content,
          'Restored from archived portal page.',
          v_actor
        from public.portal_sections as section
        join public.portal_section_versions as version
          on version.id = section.current_version_id
        where section.page_id = v_page.id
          and version.status = 'published'
        returning id, section_id
      )
      update public.portal_sections as section
      set
        current_version_id = copied_versions.id,
        status = 'draft'
      from copied_versions
      where section.id = copied_versions.section_id;

      update public.portal_sections
      set status = 'draft'
      where page_id = v_page.id
        and status = 'archived';
    else
      update public.portal_section_versions as version
      set
        status = 'draft',
        approved_by = null,
        approved_at = null
      from public.portal_sections as section
      where section.id = version.section_id
        and section.page_id = v_page.id
        and section.is_visible
        and section.current_version_id = version.id
        and version.status in ('review', 'approved');
    end if;

  elsif p_to_status = 'published' then
    select count(*)
    into v_invalid_count
    from public.portal_sections as section
    join public.portal_section_versions as version
      on version.id = section.current_version_id
    where section.page_id = v_page.id
      and section.is_visible
      and version.status <> 'approved';

    if v_invalid_count > 0 then
      raise exception
        'Every visible current portal section must be approved before publication.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions as version
    set
      status = 'published',
      published_at = coalesce(version.published_at, now())
    from public.portal_sections as section
    where section.id = version.section_id
      and section.page_id = v_page.id
      and section.is_visible
      and section.current_version_id = version.id;

    update public.portal_sections as section
    set
      status = 'published',
      published_version_id = section.current_version_id
    where section.page_id = v_page.id
      and section.is_visible;

  elsif p_to_status = 'archived' then
    update public.portal_sections as section
    set status = 'archived'
    where section.page_id = v_page.id
      and section.status = 'published';
  end if;

  update public.portal_pages
  set
    status = p_to_status,
    published_at = case
      when p_to_status = 'published' then coalesce(published_at, now())
      else null
    end
  where id = v_page.id;

  return query
  select v_page.id, v_page.title, v_page.status, p_to_status;
end;
$$;

revoke all on function app.transition_portal_page(
  uuid,
  public.publication_status
) from public, anon;

grant usage on schema app to authenticated;

grant execute on function app.transition_portal_page(
  uuid,
  public.publication_status
) to authenticated;

comment on function app.transition_portal_page(
  uuid,
  public.publication_status
)
is
'Atomically transitions portal pages, preserves immutable published history, and restores archived pages as editable draft copies.';
