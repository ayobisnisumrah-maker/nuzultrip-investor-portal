-- =============================================================================
-- Company profile
--
-- The canonical source of truth for who the company is. Portal sections and
-- investor materials reference it rather than restating it, so there is exactly
-- one place a fact such as the legal entity name or a milestone date lives.
--
-- See docs/DATABASE.md §5.
-- =============================================================================

create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  -- A single-row table today. Modelled as a table rather than a settings blob
  -- because it is versioned, and because a second entity is plausible later.
  slug text not null unique default 'nuzultrip',
  legal_name text not null,
  display_name text not null,

  status public.publication_status not null default 'draft',
  current_version_id uuid,
  published_version_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint company_profiles_legal_name_not_blank check (length(btrim(legal_name)) > 0),
  constraint company_profiles_published_has_version
    check (status <> 'published' or published_version_id is not null)
);

create trigger company_profiles_set_updated_at
  before update on public.company_profiles
  for each row execute function app.set_updated_at();

create table public.company_profile_versions (
  id uuid primary key default gen_random_uuid(),
  company_profile_id uuid not null
    references public.company_profiles (id) on delete cascade,
  version_number integer not null,
  status public.publication_status not null default 'draft',

  -- Each block is a typed JSONB object validated by Zod on write. Kept as
  -- separate columns rather than one blob so a partial edit is a partial write
  -- and a diff between versions is readable.
  identity jsonb not null default '{}'::jsonb,
  legal_information jsonb not null default '{}'::jsonb,
  history jsonb not null default '{}'::jsonb,
  vision jsonb not null default '{}'::jsonb,
  mission jsonb not null default '{}'::jsonb,
  leadership jsonb not null default '{}'::jsonb,
  business_overview jsonb not null default '{}'::jsonb,
  business_ecosystem jsonb not null default '{}'::jsonb,
  strategic_direction jsonb not null default '{}'::jsonb,
  milestones jsonb not null default '{}'::jsonb,
  achievements jsonb not null default '{}'::jsonb,
  statistics jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  brand_assets jsonb not null default '{}'::jsonb,

  change_note text,
  created_by uuid references public.admins (id) on delete set null,
  approved_by uuid references public.admins (id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),

  constraint company_profile_versions_number_positive check (version_number > 0),
  constraint company_profile_versions_unique unique (company_profile_id, version_number),
  constraint company_profile_versions_blocks_are_objects check (
    jsonb_typeof(identity) = 'object'
    and jsonb_typeof(legal_information) = 'object'
    and jsonb_typeof(history) = 'object'
    and jsonb_typeof(vision) = 'object'
    and jsonb_typeof(mission) = 'object'
    and jsonb_typeof(leadership) = 'object'
    and jsonb_typeof(business_overview) = 'object'
    and jsonb_typeof(business_ecosystem) = 'object'
    and jsonb_typeof(strategic_direction) = 'object'
    and jsonb_typeof(milestones) = 'object'
    and jsonb_typeof(achievements) = 'object'
    and jsonb_typeof(statistics) = 'object'
    and jsonb_typeof(contact) = 'object'
    and jsonb_typeof(brand_assets) = 'object'
  ),
  constraint company_profile_versions_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index company_profile_versions_profile_idx
  on public.company_profile_versions (company_profile_id, version_number desc);

alter table public.company_profiles
  add constraint company_profiles_current_version_fk
    foreign key (current_version_id)
    references public.company_profile_versions (id) on delete set null,
  add constraint company_profiles_published_version_fk
    foreign key (published_version_id)
    references public.company_profile_versions (id) on delete restrict;

create or replace function app.assign_company_profile_version_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.version_number is null then
    select coalesce(max(v.version_number), 0) + 1
    into new.version_number
    from public.company_profile_versions v
    where v.company_profile_id = new.company_profile_id;
  end if;
  return new;
end;
$$;

create trigger company_profile_versions_assign_number
  before insert on public.company_profile_versions
  for each row execute function app.assign_company_profile_version_number();

create or replace function app.guard_company_profile_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'published' then
    if app.published_change_is_referential(to_jsonb(old), to_jsonb(new)) then
      return new;
    end if;
    raise exception
      'Company profile version % is published and cannot be modified.', old.version_number
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and not app.publication_transition_allowed(old.status, new.status) then
    raise exception 'Publication status cannot move from % to %.', old.status, new.status
      using errcode = '23514';
  end if;

  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

create trigger company_profile_versions_guard_update
  before update on public.company_profile_versions
  for each row execute function app.guard_company_profile_version_update();

create trigger company_profile_versions_guard_delete
  before delete on public.company_profile_versions
  for each row execute function app.forbid_published_version_delete();

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.company_profiles enable row level security;
alter table public.company_profiles force row level security;
alter table public.company_profile_versions enable row level security;
alter table public.company_profile_versions force row level security;

revoke all on public.company_profiles from anon, authenticated;
revoke all on public.company_profile_versions from anon, authenticated;

grant select on public.company_profiles to anon, authenticated;
grant insert, update on public.company_profiles to authenticated;
grant select on public.company_profile_versions to anon, authenticated;
grant insert, update on public.company_profile_versions to authenticated;

create policy company_profiles_select_published
  on public.company_profiles for select
  to anon, authenticated
  using (status = 'published');

create policy company_profiles_select_admin
  on public.company_profiles for select
  to authenticated
  using (app.has_permission('company_profile.view'));

create policy company_profiles_insert_admin
  on public.company_profiles for insert
  to authenticated
  with check (app.has_permission('company_profile.update'));

create policy company_profiles_update_admin
  on public.company_profiles for update
  to authenticated
  using (app.has_permission('company_profile.update'))
  with check (app.has_permission('company_profile.update'));

create policy company_profile_versions_select_published
  on public.company_profile_versions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.company_profiles p
      where p.id = company_profile_id
        and p.published_version_id = public.company_profile_versions.id
    )
  );

create policy company_profile_versions_select_admin
  on public.company_profile_versions for select
  to authenticated
  using (app.has_permission('company_profile.view'));

create policy company_profile_versions_insert_admin
  on public.company_profile_versions for insert
  to authenticated
  with check (app.has_permission('company_profile.update') and status = 'draft');

create policy company_profile_versions_update_admin
  on public.company_profile_versions for update
  to authenticated
  using (app.has_permission('company_profile.update'))
  with check (app.has_permission('company_profile.update'));
