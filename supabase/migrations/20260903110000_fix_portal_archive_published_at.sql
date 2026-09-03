-- =============================================================================
-- Fix portal page lifecycle timestamp consistency
--
-- published_at may only exist while page status = published.
-- Therefore archive and draft transitions must clear published_at.
-- =============================================================================

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
    select
      v_page.id,
      v_page.title,
      v_page.status,
      v_page.status;
    return;
  end if;

  if not (
    (v_page.status = 'draft' and p_to_status = 'review')
    or
    (v_page.status = 'review' and p_to_status in ('approved', 'draft'))
    or
    (v_page.status = 'approved' and p_to_status in ('published', 'draft'))
    or
    (v_page.status = 'published' and p_to_status = 'archived')
    or
    (v_page.status = 'archived' and p_to_status = 'draft')
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
    from public.portal_sections s
    where s.page_id = v_page.id
      and s.is_visible
      and s.current_version_id is null;

    if v_invalid_count > 0 then
      raise exception
        'Every visible portal section must have a current version before review.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions v
    set status = 'review'
    from public.portal_sections s
    where s.id = v.section_id
      and s.page_id = v_page.id
      and s.is_visible
      and s.current_version_id = v.id;

  elsif p_to_status = 'approved' then

    select count(*)
    into v_invalid_count
    from public.portal_sections s
    join public.portal_section_versions v
      on v.id = s.current_version_id
    where s.page_id = v_page.id
      and s.is_visible
      and v.status <> 'review';

    if v_invalid_count > 0 then
      raise exception
        'Every visible current portal section must be in review before approval.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions v
    set
      status = 'approved',
      approved_by = v_actor,
      approved_at = now()
    from public.portal_sections s
    where s.id = v.section_id
      and s.page_id = v_page.id
      and s.is_visible
      and s.current_version_id = v.id;

  elsif p_to_status = 'draft' then

    if v_page.status = 'archived' then

      -- Restore archived sections as fresh editable draft versions.
      update public.portal_sections s
      set
        status = 'draft',
        published_version_id = null
      where s.page_id = v_page.id;

    else

      update public.portal_section_versions v
      set
        status = 'draft',
        approved_by = null,
        approved_at = null
      from public.portal_sections s
      where s.id = v.section_id
        and s.page_id = v_page.id
        and s.is_visible
        and s.current_version_id = v.id
        and v.status in ('review', 'approved');

    end if;

  elsif p_to_status = 'published' then

    select count(*)
    into v_invalid_count
    from public.portal_sections s
    join public.portal_section_versions v
      on v.id = s.current_version_id
    where s.page_id = v_page.id
      and s.is_visible
      and v.status <> 'approved';

    if v_invalid_count > 0 then
      raise exception
        'Every visible current portal section must be approved before publication.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions v
    set
      status = 'published',
      published_at = coalesce(v.published_at, now())
    from public.portal_sections s
    where s.id = v.section_id
      and s.page_id = v_page.id
      and s.is_visible
      and s.current_version_id = v.id;

    update public.portal_sections s
    set
      status = 'published',
      published_version_id = s.current_version_id
    where s.page_id = v_page.id
      and s.is_visible;

  elsif p_to_status = 'archived' then

    update public.portal_sections s
    set status = 'archived'
    where s.page_id = v_page.id
      and s.status = 'published';

  end if;

  -- IMPORTANT:
  -- published_at only exists while the page itself is published.
  update public.portal_pages
  set
    status = p_to_status,
    published_at = case
      when p_to_status = 'published'
        then coalesce(published_at, now())
      else null
    end
  where id = v_page.id;

  return query
  select
    v_page.id,
    v_page.title,
    v_page.status,
    p_to_status;
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
'Atomically transitions portal pages through the publication lifecycle with timestamp consistency.';
