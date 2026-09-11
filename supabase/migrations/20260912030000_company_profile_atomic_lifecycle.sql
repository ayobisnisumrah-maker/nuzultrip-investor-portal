-- =============================================================================
-- Company profile version lifecycle
--
-- Keeps company profile draft creation and publication transitions atomic.
-- The canonical identity/logo editors remain separate; this lifecycle owns the
-- versioned narrative blocks and immutable published snapshots.
-- CI note: this comment intentionally creates a human-authored head after type generation.
-- =============================================================================

create or replace function app.save_company_profile_draft(
  p_profile_id uuid,
  p_blocks jsonb,
  p_change_note text default null
)
returns table (
  version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.company_profiles%rowtype;
  v_current public.company_profile_versions%rowtype;
  v_version public.company_profile_versions%rowtype;
begin
  if not app.has_permission('company_profile.update') then
    raise exception 'Insufficient permission to update company profile.' using errcode = '42501';
  end if;

  if p_blocks is null or jsonb_typeof(p_blocks) <> 'object' then
    raise exception 'Company profile blocks must be a JSON object.' using errcode = '23514';
  end if;

  select * into v_profile
  from public.company_profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Company profile not found.' using errcode = 'P0002';
  end if;

  if v_profile.status <> 'draft' then
    raise exception 'Company profile can only be edited while in draft.' using errcode = '23514';
  end if;

  if v_profile.current_version_id is not null then
    select * into v_current
    from public.company_profile_versions
    where id = v_profile.current_version_id;
  end if;

  insert into public.company_profile_versions (
    company_profile_id,
    version_number,
    status,
    identity,
    legal_information,
    history,
    vision,
    mission,
    leadership,
    business_overview,
    business_ecosystem,
    strategic_direction,
    milestones,
    achievements,
    statistics,
    contact,
    brand_assets,
    change_note,
    created_by
  ) values (
    v_profile.id,
    null,
    'draft',
    coalesce(v_current.identity, jsonb_build_object(
      'display_name', v_profile.display_name,
      'legal_name', v_profile.legal_name,
      'slug', v_profile.slug
    )),
    jsonb_build_object('text', coalesce(p_blocks->>'legal_information', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'history', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'vision', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'mission', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'leadership', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'business_overview', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'business_ecosystem', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'strategic_direction', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'milestones', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'achievements', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'statistics', '')),
    jsonb_build_object('text', coalesce(p_blocks->>'contact', '')),
    coalesce(v_current.brand_assets, '{}'::jsonb),
    nullif(btrim(coalesce(p_change_note, '')), ''),
    app.current_user_id()
  )
  returning * into v_version;

  update public.company_profiles
  set current_version_id = v_version.id
  where id = v_profile.id;

  return query select v_version.id, v_version.version_number;
end;
$$;

create or replace function app.transition_company_profile(
  p_profile_id uuid,
  p_to_status public.publication_status
)
returns table (
  profile_id uuid,
  previous_status public.publication_status,
  status public.publication_status,
  current_version_id uuid,
  published_version_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.company_profiles%rowtype;
  v_current public.company_profile_versions%rowtype;
  v_draft public.company_profile_versions%rowtype;
  v_permission text;
begin
  v_permission := case p_to_status
    when 'draft' then 'company_profile.update'
    when 'review' then 'company_profile.publish'
    when 'approved' then 'company_profile.publish'
    when 'published' then 'company_profile.publish'
    else null
  end;

  if v_permission is null or not app.has_permission(v_permission) then
    raise exception 'Insufficient permission for company profile transition to %.', p_to_status
      using errcode = '42501';
  end if;

  select * into v_profile
  from public.company_profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Company profile not found.' using errcode = 'P0002';
  end if;

  if v_profile.current_version_id is null then
    raise exception 'Company profile has no current version.' using errcode = '23514';
  end if;

  if v_profile.status = 'published' and p_to_status = 'draft' then
    select * into v_current
    from public.company_profile_versions
    where id = coalesce(v_profile.published_version_id, v_profile.current_version_id)
    for share;

    if not found then
      raise exception 'Published company profile snapshot not found.' using errcode = 'P0002';
    end if;

    insert into public.company_profile_versions (
      company_profile_id,
      version_number,
      status,
      identity,
      legal_information,
      history,
      vision,
      mission,
      leadership,
      business_overview,
      business_ecosystem,
      strategic_direction,
      milestones,
      achievements,
      statistics,
      contact,
      brand_assets,
      change_note,
      created_by
    ) values (
      v_profile.id,
      null,
      'draft',
      v_current.identity,
      v_current.legal_information,
      v_current.history,
      v_current.vision,
      v_current.mission,
      v_current.leadership,
      v_current.business_overview,
      v_current.business_ecosystem,
      v_current.strategic_direction,
      v_current.milestones,
      v_current.achievements,
      v_current.statistics,
      v_current.contact,
      v_current.brand_assets,
      'Revisi baru dari snapshot terbit.',
      app.current_user_id()
    )
    returning * into v_draft;

    update public.company_profiles
    set status = 'draft', current_version_id = v_draft.id
    where id = v_profile.id;

    return query
      select v_profile.id, v_profile.status, 'draft'::public.publication_status,
             v_draft.id, v_profile.published_version_id;
    return;
  end if;

  if not (
    (v_profile.status = 'draft' and p_to_status = 'review') or
    (v_profile.status = 'review' and p_to_status in ('approved', 'draft')) or
    (v_profile.status = 'approved' and p_to_status in ('published', 'draft'))
  ) then
    raise exception 'Invalid company profile transition: % -> %.', v_profile.status, p_to_status
      using errcode = '23514';
  end if;

  select * into v_current
  from public.company_profile_versions
  where id = v_profile.current_version_id
  for update;

  if not found then
    raise exception 'Current company profile version not found.' using errcode = 'P0002';
  end if;

  if p_to_status = 'review' then
    update public.company_profile_versions
    set status = 'review'
    where id = v_current.id;
  elsif p_to_status = 'approved' then
    update public.company_profile_versions
    set status = 'approved', approved_by = app.current_user_id(), approved_at = now()
    where id = v_current.id;
  elsif p_to_status = 'draft' then
    update public.company_profile_versions
    set status = 'draft', approved_by = null, approved_at = null
    where id = v_current.id;
  elsif p_to_status = 'published' then
    update public.company_profile_versions
    set status = 'published', published_at = coalesce(published_at, now())
    where id = v_current.id;
  end if;

  update public.company_profiles
  set status = p_to_status,
      published_version_id = case
        when p_to_status = 'published' then v_current.id
        else published_version_id
      end
  where id = v_profile.id;

  return query
    select v_profile.id, v_profile.status, p_to_status,
           v_current.id,
           case when p_to_status = 'published' then v_current.id else v_profile.published_version_id end;
end;
$$;

revoke all on function app.save_company_profile_draft(uuid, jsonb, text) from public, anon;
revoke all on function app.transition_company_profile(uuid, public.publication_status) from public, anon;
grant execute on function app.save_company_profile_draft(uuid, jsonb, text) to authenticated;
grant execute on function app.transition_company_profile(uuid, public.publication_status) to authenticated;

comment on function app.save_company_profile_draft(uuid, jsonb, text)
is 'Atomically appends a draft company profile version and makes it current.';

comment on function app.transition_company_profile(uuid, public.publication_status)
is 'Atomically transitions the current company profile version and preserves the previously published snapshot during revision.';
