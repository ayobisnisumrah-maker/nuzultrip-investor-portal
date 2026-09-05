-- =============================================================================
-- Portal live revision workflow
--
-- A previously published page may return to draft without going offline.
-- `published_at`, section `published_version_id`, and section `is_visible` keep
-- representing the public snapshot until the replacement revision is approved
-- and published atomically.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Editing guard
--
-- New section versions are only valid while the owning page is in draft. This
-- closes the old loophole where the UI could still save content in review or
-- approved state.
-- -----------------------------------------------------------------------------
create or replace function app.guard_portal_section_version_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page_status public.publication_status;
begin
  select p.status
  into v_page_status
  from public.portal_sections s
  join public.portal_pages p on p.id = s.page_id
  where s.id = new.section_id;

  if v_page_status is null then
    raise exception 'Portal page for section not found.' using errcode = 'P0002';
  end if;

  if v_page_status <> 'draft' then
    raise exception 'Portal content can only be edited while the page is in Draft.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists portal_section_versions_page_editable on public.portal_section_versions;
create trigger portal_section_versions_page_editable
  before insert on public.portal_section_versions
  for each row execute function app.guard_portal_section_version_insert();

-- -----------------------------------------------------------------------------
-- Visibility staging
--
-- `portal_sections.is_visible` remains the public snapshot during a live
-- revision. A requested visibility change is staged inside a new draft version
-- as `_is_visible`. The publication transaction applies it to the section row.
-- This avoids draft edits leaking onto the live portal.
-- -----------------------------------------------------------------------------
create or replace function app.stage_portal_section_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page_status public.publication_status;
  v_published_at timestamptz;
  v_content jsonb;
  v_next_version integer;
  v_version_id uuid;
begin
  if new.is_visible is not distinct from old.is_visible then
    return new;
  end if;

  -- Publication itself deliberately applies the staged snapshot.
  if current_setting('app.portal_apply_snapshot', true) = '1' then
    return new;
  end if;

  if not app.has_permission('portal.update') then
    raise exception 'Insufficient permission to change portal section visibility.'
      using errcode = '42501';
  end if;

  select p.status, p.published_at
  into v_page_status, v_published_at
  from public.portal_pages p
  where p.id = old.page_id;

  if v_page_status <> 'draft' then
    raise exception 'Portal visibility can only be edited while the page is in Draft.'
      using errcode = '23514';
  end if;

  -- Before first publication there is no live snapshot to protect.
  if v_published_at is null then
    return new;
  end if;

  if old.current_version_id is null then
    raise exception 'Portal section has no current version.' using errcode = '23514';
  end if;

  select v.content
  into v_content
  from public.portal_section_versions v
  where v.id = old.current_version_id;

  if v_content is null then
    raise exception 'Current portal section version not found.' using errcode = 'P0002';
  end if;

  select coalesce(max(v.version_number), 0) + 1
  into v_next_version
  from public.portal_section_versions v
  where v.section_id = old.id;

  insert into public.portal_section_versions (
    section_id,
    version_number,
    status,
    content,
    change_note
  )
  values (
    old.id,
    v_next_version,
    'draft',
    v_content || jsonb_build_object('_is_visible', new.is_visible),
    case when new.is_visible then 'Menampilkan bagian pada publikasi berikutnya.'
         else 'Menyembunyikan bagian pada publikasi berikutnya.' end
  )
  returning id into v_version_id;

  new.current_version_id := v_version_id;
  new.is_visible := old.is_visible;

  return new;
end;
$$;

drop trigger if exists portal_sections_stage_visibility on public.portal_sections;
create trigger portal_sections_stage_visibility
  before update of is_visible on public.portal_sections
  for each row execute function app.stage_portal_section_visibility();

-- -----------------------------------------------------------------------------
-- Publication lifecycle
-- -----------------------------------------------------------------------------
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
    raise exception 'Portal page not found.' using errcode = 'P0002';
  end if;

  if p_to_status = v_page.status then
    return query select v_page.id, v_page.title, v_page.status, v_page.status;
    return;
  end if;

  if not (
    (v_page.status = 'draft' and p_to_status = 'review') or
    (v_page.status = 'review' and p_to_status in ('approved', 'draft')) or
    (v_page.status = 'approved' and p_to_status in ('published', 'draft')) or
    (v_page.status = 'published' and p_to_status in ('draft', 'archived')) or
    (v_page.status = 'archived' and p_to_status = 'draft')
  ) then
    raise exception 'Invalid portal publication transition: % -> %.', v_page.status, p_to_status
      using errcode = '23514';
  end if;

  if p_to_status = 'review' then
    select count(*) into v_invalid_count
    from public.portal_sections s
    where s.page_id = v_page.id
      and s.current_version_id is null;

    if v_invalid_count > 0 then
      raise exception 'Every portal section must have a current version before review.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions v
    set status = 'review'
    from public.portal_sections s
    where s.id = v.section_id
      and s.page_id = v_page.id
      and s.current_version_id = v.id
      and v.status = 'draft';

  elsif p_to_status = 'approved' then
    select count(*) into v_invalid_count
    from public.portal_sections s
    join public.portal_section_versions v on v.id = s.current_version_id
    where s.page_id = v_page.id
      and v.status not in ('review', 'published');

    if v_invalid_count > 0 then
      raise exception 'Every changed portal section must be in review before approval.'
        using errcode = '23514';
    end if;

    update public.portal_section_versions v
    set status = 'approved', approved_by = v_actor, approved_at = now()
    from public.portal_sections s
    where s.id = v.section_id
      and s.page_id = v_page.id
      and s.current_version_id = v.id
      and v.status = 'review';

  elsif p_to_status = 'draft' then
    if v_page.status = 'archived' then
      -- Archived pages are offline. Preserve history, but make sections editable
      -- again without claiming that a public snapshot is active.
      update public.portal_sections s
      set status = 'draft', published_version_id = null
      where s.page_id = v_page.id;
    else
      -- Do not touch published_version_id or is_visible. They are the live
      -- snapshot while the replacement current versions return to draft.
      update public.portal_section_versions v
      set status = 'draft', approved_by = null, approved_at = null
      from public.portal_sections s
      where s.id = v.section_id
        and s.page_id = v_page.id
        and s.current_version_id = v.id
        and v.status in ('review', 'approved');
    end if;

  elsif p_to_status = 'published' then
    select count(*) into v_invalid_count
    from public.portal_sections s
    join public.portal_section_versions v on v.id = s.current_version_id
    where s.page_id = v_page.id
      and v.status not in ('approved', 'published');

    if v_invalid_count > 0 then
      raise exception 'Every changed portal section must be approved before publication.'
        using errcode = '23514';
    end if;

    -- Allow the publication transaction to apply staged visibility without the
    -- staging trigger turning it into another draft version.
    perform set_config('app.portal_apply_snapshot', '1', true);

    update public.portal_sections s
    set
      status = 'published',
      published_version_id = s.current_version_id,
      is_visible = coalesce(
        case
          when (v.content ->> '_is_visible') in ('true', 'false')
            then (v.content ->> '_is_visible')::boolean
          else null
        end,
        s.is_visible
      )
    from public.portal_section_versions v
    where s.page_id = v_page.id
      and s.current_version_id = v.id;

    update public.portal_section_versions v
    set
      content = v.content - '_is_visible',
      status = 'published',
      published_at = coalesce(v.published_at, now())
    from public.portal_sections s
    where s.id = v.section_id
      and s.page_id = v_page.id
      and s.current_version_id = v.id
      and v.status = 'approved';

  elsif p_to_status = 'archived' then
    update public.portal_sections s
    set status = 'archived'
    where s.page_id = v_page.id
      and s.status = 'published';
  end if;

  update public.portal_pages
  set
    status = p_to_status,
    -- Keep published_at throughout live revision. The public query treats a
    -- non-archived page with published_at as having a valid published snapshot.
    published_at = case
      when p_to_status = 'published' then coalesce(published_at, now())
      when p_to_status = 'archived' then null
      else published_at
    end
  where id = v_page.id;

  return query select v_page.id, v_page.title, v_page.status, p_to_status;
end;
$$;

revoke all on function app.transition_portal_page(uuid, public.publication_status) from public, anon;
grant usage on schema app to authenticated;
grant execute on function app.transition_portal_page(uuid, public.publication_status) to authenticated;

comment on function app.transition_portal_page(uuid, public.publication_status)
is 'Atomic live revision workflow: published content and visibility remain live until an approved replacement snapshot is published.';
