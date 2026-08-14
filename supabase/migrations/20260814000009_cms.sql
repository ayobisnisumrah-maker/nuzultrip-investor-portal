-- =============================================================================
-- Portal CMS
--
-- Structured content only. There is no HTML column anywhere in this schema:
-- rich text is stored as a restricted portable-text AST and rendered by React
-- components with no `dangerouslySetInnerHTML` path, so stored XSS has no
-- vector (docs/SECURITY.md §5).
--
-- Section content is validated twice: by Zod on write, and by a trigger that
-- rejects a payload whose discriminant does not match the section kind.
--
-- See docs/DATABASE.md §7.
-- =============================================================================

create type public.page_kind as enum ('home', 'standard', 'legal');

create type public.section_kind as enum (
  'hero_3d',
  'intro',
  'vision_mission',
  'business_overview',
  'growth_story',
  'ecosystem',
  'investment_info',
  'milestones',
  'strategic_direction',
  'financial_highlights',
  'investor_updates',
  'documents',
  'contact_cta',
  'legal_notice',
  'rich_content',
  'stat_grid',
  'logo_wall',
  'faq'
);

create type public.nav_location as enum ('header', 'footer', 'legal', 'social');

-- -----------------------------------------------------------------------------
-- Pages
-- -----------------------------------------------------------------------------
create table public.portal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  page_kind public.page_kind not null default 'standard',
  status public.publication_status not null default 'draft',
  seo jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  -- The home page is structural and cannot be deleted.
  is_system boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint portal_pages_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' or slug = 'home'),
  constraint portal_pages_title_not_blank check (length(btrim(title)) > 0),
  constraint portal_pages_seo_object check (jsonb_typeof(seo) = 'object'),
  constraint portal_pages_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index portal_pages_status_idx on public.portal_pages (status, position);

create trigger portal_pages_set_updated_at
  before update on public.portal_pages
  for each row execute function app.set_updated_at();

create or replace function app.guard_portal_page_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_system then
    raise exception 'System page "%" cannot be deleted.', old.slug using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger portal_pages_guard_delete
  before delete on public.portal_pages
  for each row execute function app.guard_portal_page_delete();

-- -----------------------------------------------------------------------------
-- Sections
-- -----------------------------------------------------------------------------
create table public.portal_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.portal_pages (id) on delete cascade,
  section_kind public.section_kind not null,
  position integer not null,
  is_visible boolean not null default true,
  anchor_id text,
  status public.publication_status not null default 'draft',

  current_version_id uuid,
  published_version_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint portal_sections_anchor_shape
    check (anchor_id is null or anchor_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint portal_sections_position_non_negative check (position >= 0),
  constraint portal_sections_published_has_version
    check (status <> 'published' or published_version_id is not null)
);

-- Deferrable so a whole reorder can happen in one transaction without having to
-- shuffle rows through temporary positions.
alter table public.portal_sections
  add constraint portal_sections_page_position_unique
  unique (page_id, position) deferrable initially deferred;

create index portal_sections_page_idx on public.portal_sections (page_id, position);

create trigger portal_sections_set_updated_at
  before update on public.portal_sections
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Section versions — append-only
-- -----------------------------------------------------------------------------
create table public.portal_section_versions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.portal_sections (id) on delete cascade,
  version_number integer not null,
  status public.publication_status not null default 'draft',

  -- Discriminated by `kind`, matching the section registry in
  -- src/core/cms/sections.ts.
  content jsonb not null default '{}'::jsonb,

  change_note text,
  created_by uuid references public.admins (id) on delete set null,
  approved_by uuid references public.admins (id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),

  constraint portal_section_versions_number_positive check (version_number > 0),
  constraint portal_section_versions_unique unique (section_id, version_number),
  constraint portal_section_versions_content_object check (jsonb_typeof(content) = 'object'),
  constraint portal_section_versions_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index portal_section_versions_section_idx
  on public.portal_section_versions (section_id, version_number desc);

alter table public.portal_sections
  add constraint portal_sections_current_version_fk
    foreign key (current_version_id)
    references public.portal_section_versions (id) on delete set null,
  add constraint portal_sections_published_version_fk
    foreign key (published_version_id)
    references public.portal_section_versions (id) on delete restrict;

create or replace function app.assign_section_version_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.version_number is null then
    select coalesce(max(v.version_number), 0) + 1
    into new.version_number
    from public.portal_section_versions v
    where v.section_id = new.section_id;
  end if;
  return new;
end;
$$;

create trigger portal_section_versions_assign_number
  before insert on public.portal_section_versions
  for each row execute function app.assign_section_version_number();

-- The stored content must declare the same kind as the section it belongs to.
-- Without this a `hero_3d` section could hold `faq` content and the renderer
-- would have to guess.
create or replace function app.assert_section_content_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected public.section_kind;
  declared text := new.content ->> 'kind';
begin
  select s.section_kind into expected
  from public.portal_sections s
  where s.id = new.section_id;

  if declared is null then
    raise exception 'Section content must declare a "kind" discriminant.'
      using errcode = '23514';
  end if;

  if declared <> expected::text then
    raise exception 'Section content declares kind "%" but the section is "%".',
      declared, expected
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger portal_section_versions_content_kind
  before insert or update of content on public.portal_section_versions
  for each row execute function app.assert_section_content_kind();

create or replace function app.guard_section_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'published' then
    raise exception 'Section version % is published and cannot be modified.', old.version_number
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

create trigger portal_section_versions_guard_update
  before update on public.portal_section_versions
  for each row execute function app.guard_section_version_update();

create trigger portal_section_versions_guard_delete
  before delete on public.portal_section_versions
  for each row execute function app.forbid_published_version_delete();

-- -----------------------------------------------------------------------------
-- Navigation
-- -----------------------------------------------------------------------------
create table public.portal_navigation (
  id uuid primary key default gen_random_uuid(),
  location public.nav_location not null,
  label text not null,
  href text not null,
  target text not null default '_self',
  icon text,
  position integer not null default 0,
  parent_id uuid references public.portal_navigation (id) on delete cascade,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint portal_navigation_label_not_blank check (length(btrim(label)) > 0),
  constraint portal_navigation_target_valid check (target in ('_self', '_blank')),
  -- Relative paths, anchors, or explicit https/mailto. Never javascript:.
  constraint portal_navigation_href_safe
    check (href ~ '^(/|#|https://|mailto:|tel:)'),
  constraint portal_navigation_not_own_parent check (parent_id is distinct from id)
);

create index portal_navigation_location_idx
  on public.portal_navigation (location, position) where is_visible;
-- Nested navigation is rendered by looking up children per parent.
create index portal_navigation_parent_idx
  on public.portal_navigation (parent_id) where parent_id is not null;

create trigger portal_navigation_set_updated_at
  before update on public.portal_navigation
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Theme
--
-- The admin edits a validated token-override object, not CSS. Anything outside
-- this shape is not themeable, which is what stops a retheme from breaking
-- contrast or layout (docs/DESIGN-SYSTEM.md §10).
-- -----------------------------------------------------------------------------
create table public.portal_theme (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_asset_id uuid references public.media_assets (id) on delete set null,
  logo_dark_asset_id uuid references public.media_assets (id) on delete set null,
  favicon_asset_id uuid references public.media_assets (id) on delete set null,
  og_image_asset_id uuid references public.media_assets (id) on delete set null,

  -- { primaryHue, primaryChroma, accentHue, accentChroma }
  color_overrides jsonb not null default '{}'::jsonb,
  radius_preset text not null default 'balanced',
  typography_preset text not null default 'mizan',
  default_color_scheme text not null default 'system',
  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint portal_theme_name_not_blank check (length(btrim(name)) > 0),
  constraint portal_theme_color_overrides_object check (jsonb_typeof(color_overrides) = 'object'),
  constraint portal_theme_radius_valid check (radius_preset in ('sharp', 'balanced', 'soft')),
  constraint portal_theme_typography_valid check (typography_preset in ('mizan', 'compact')),
  constraint portal_theme_scheme_valid check (default_color_scheme in ('light', 'dark', 'system'))
);

-- Exactly one theme can be active.
create unique index portal_theme_single_active on public.portal_theme (is_active) where is_active;

create trigger portal_theme_set_updated_at
  before update on public.portal_theme
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Site settings — operational key/value
-- -----------------------------------------------------------------------------
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_by uuid references public.admins (id) on delete set null,
  updated_at timestamptz not null default now(),

  constraint site_settings_key_shape check (key ~ '^[a-z][a-z0-9_.]*$'),
  -- Some settings are safe to read anonymously (contact email shown on the
  -- portal); most are not. Marked explicitly rather than inferred.
  constraint site_settings_value_not_null check (value is not null)
);

alter table public.site_settings add column is_public boolean not null default false;

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function app.set_updated_at();

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.portal_pages enable row level security;
alter table public.portal_pages force row level security;
alter table public.portal_sections enable row level security;
alter table public.portal_sections force row level security;
alter table public.portal_section_versions enable row level security;
alter table public.portal_section_versions force row level security;
alter table public.portal_navigation enable row level security;
alter table public.portal_navigation force row level security;
alter table public.portal_theme enable row level security;
alter table public.portal_theme force row level security;
alter table public.site_settings enable row level security;
alter table public.site_settings force row level security;

revoke all on public.portal_pages from anon, authenticated;
revoke all on public.portal_sections from anon, authenticated;
revoke all on public.portal_section_versions from anon, authenticated;
revoke all on public.portal_navigation from anon, authenticated;
revoke all on public.portal_theme from anon, authenticated;
revoke all on public.site_settings from anon, authenticated;

grant select on public.portal_pages to anon, authenticated;
grant insert, update, delete on public.portal_pages to authenticated;
grant select on public.portal_sections to anon, authenticated;
grant insert, update, delete on public.portal_sections to authenticated;
grant select on public.portal_section_versions to anon, authenticated;
grant insert, update on public.portal_section_versions to authenticated;
grant select on public.portal_navigation to anon, authenticated;
grant insert, update, delete on public.portal_navigation to authenticated;
grant select on public.portal_theme to anon, authenticated;
grant insert, update on public.portal_theme to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

-- --- read: the published portal, visible to everyone ------------------------

create policy portal_pages_select_published
  on public.portal_pages for select to anon, authenticated
  using (status = 'published');

create policy portal_sections_select_published
  on public.portal_sections for select to anon, authenticated
  using (
    is_visible
    and status = 'published'
    and exists (
      select 1 from public.portal_pages p
      where p.id = page_id and p.status = 'published'
    )
  );

create policy portal_section_versions_select_published
  on public.portal_section_versions for select to anon, authenticated
  using (
    exists (
      select 1 from public.portal_sections s
      where s.id = section_id
        and s.published_version_id = public.portal_section_versions.id
    )
  );

create policy portal_navigation_select_visible
  on public.portal_navigation for select to anon, authenticated
  using (is_visible);

create policy portal_theme_select_active
  on public.portal_theme for select to anon, authenticated
  using (is_active);

create policy site_settings_select_public
  on public.site_settings for select to anon, authenticated
  using (is_public);

-- --- write: admins with the portal permissions ------------------------------

create policy portal_pages_select_admin
  on public.portal_pages for select to authenticated
  using (app.has_permission('portal.view'));

create policy portal_pages_insert_admin
  on public.portal_pages for insert to authenticated
  with check (app.has_permission('portal.update'));

create policy portal_pages_update_admin
  on public.portal_pages for update to authenticated
  using (app.has_permission('portal.update'))
  with check (app.has_permission('portal.update'));

create policy portal_pages_delete_admin
  on public.portal_pages for delete to authenticated
  using (app.has_permission('portal.update') and not is_system);

create policy portal_sections_select_admin
  on public.portal_sections for select to authenticated
  using (app.has_permission('portal.view'));

create policy portal_sections_insert_admin
  on public.portal_sections for insert to authenticated
  with check (app.has_permission('portal.update'));

create policy portal_sections_update_admin
  on public.portal_sections for update to authenticated
  using (app.has_permission('portal.update'))
  with check (app.has_permission('portal.update'));

create policy portal_sections_delete_admin
  on public.portal_sections for delete to authenticated
  using (app.has_permission('portal.update'));

create policy portal_section_versions_select_admin
  on public.portal_section_versions for select to authenticated
  using (app.has_permission('portal.view'));

create policy portal_section_versions_insert_admin
  on public.portal_section_versions for insert to authenticated
  with check (app.has_permission('portal.update') and status = 'draft');

create policy portal_section_versions_update_admin
  on public.portal_section_versions for update to authenticated
  using (app.has_permission('portal.update'))
  with check (app.has_permission('portal.update'));

create policy portal_navigation_select_admin
  on public.portal_navigation for select to authenticated
  using (app.has_permission('portal.view'));

create policy portal_navigation_insert_admin
  on public.portal_navigation for insert to authenticated
  with check (app.has_permission('portal.manage_navigation'));

create policy portal_navigation_update_admin
  on public.portal_navigation for update to authenticated
  using (app.has_permission('portal.manage_navigation'))
  with check (app.has_permission('portal.manage_navigation'));

create policy portal_navigation_delete_admin
  on public.portal_navigation for delete to authenticated
  using (app.has_permission('portal.manage_navigation'));

create policy portal_theme_select_admin
  on public.portal_theme for select to authenticated
  using (app.has_permission('portal.view'));

create policy portal_theme_insert_admin
  on public.portal_theme for insert to authenticated
  with check (app.has_permission('portal.manage_theme'));

create policy portal_theme_update_admin
  on public.portal_theme for update to authenticated
  using (app.has_permission('portal.manage_theme'))
  with check (app.has_permission('portal.manage_theme'));

create policy site_settings_select_admin
  on public.site_settings for select to authenticated
  using (app.has_permission('settings.view'));

create policy site_settings_insert_admin
  on public.site_settings for insert to authenticated
  with check (app.has_permission('settings.update'));

create policy site_settings_update_admin
  on public.site_settings for update to authenticated
  using (app.has_permission('settings.update'))
  with check (app.has_permission('settings.update'));
