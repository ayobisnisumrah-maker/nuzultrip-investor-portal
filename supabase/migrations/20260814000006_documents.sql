-- =============================================================================
-- Documents and versioning
--
-- Container + append-only versions. Publishing sets a pointer; it never mutates
-- a prior version. A published version is frozen by trigger, so immutability is
-- a property of the schema rather than a convention.
--
-- Mirrors src/core/documents/publication.ts.
-- See docs/DATABASE.md §5.
-- =============================================================================

create type public.publication_status as enum (
  'draft',
  'review',
  'approved',
  'published',
  'archived'
);

create type public.visibility as enum ('public', 'investors', 'restricted', 'internal');

-- Note: there is deliberately no `financial_report` kind. Financial reporting is
-- a separate module with structured line items and mandatory provenance
-- (see the financials migration). Modelling it twice would let the same figure
-- exist in two places with two different answers.
create type public.document_kind as enum (
  'investment_proposal',
  'pitch_deck',
  'investor_report',
  'business_update',
  'supporting'
);

-- -----------------------------------------------------------------------------
-- Shared publication-transition rule
-- -----------------------------------------------------------------------------
create or replace function app.publication_transition_allowed(
  p_from public.publication_status,
  p_to public.publication_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'draft' then p_to = 'review'
    when 'review' then p_to in ('approved', 'draft')
    when 'approved' then p_to in ('published', 'draft')
    when 'published' then p_to = 'archived'
    when 'archived' then false
    else false
  end;
$$;

grant execute on function app.publication_transition_allowed(
  public.publication_status, public.publication_status
) to authenticated;

-- -----------------------------------------------------------------------------
-- Documents
-- -----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  kind public.document_kind not null,
  title text not null,
  slug text not null,
  summary text,

  visibility public.visibility not null default 'internal',
  status public.publication_status not null default 'draft',

  current_version_id uuid,
  published_version_id uuid,

  owner_admin_id uuid references public.admins (id) on delete set null,
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint documents_title_not_blank check (length(btrim(title)) > 0),
  constraint documents_kind_slug_unique unique (kind, slug),
  constraint documents_archived_consistent
    check ((status = 'archived') = (archived_at is not null)),
  -- A published document must point at the version that was published.
  constraint documents_published_has_version
    check (status <> 'published' or published_version_id is not null)
);

create index documents_kind_status_idx on public.documents (kind, status, visibility);
create index documents_published_idx
  on public.documents (published_version_id) where published_version_id is not null;
create index documents_owner_idx on public.documents (owner_admin_id);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function app.set_updated_at();

comment on table public.documents is
  'Document container: identity, visibility, and pointers to its current and published versions.';

-- -----------------------------------------------------------------------------
-- Versions — append-only
-- -----------------------------------------------------------------------------
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_number integer not null,

  title text not null,
  -- Structured content only. There is no HTML column anywhere in this schema
  -- (docs/SECURITY.md §5).
  content jsonb not null default '{}'::jsonb,
  file_asset_id uuid references public.media_assets (id) on delete restrict,

  change_note text,
  status public.publication_status not null default 'draft',

  created_by uuid references public.admins (id) on delete set null,
  approved_by uuid references public.admins (id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),

  constraint document_versions_number_positive check (version_number > 0),
  constraint document_versions_document_number_unique unique (document_id, version_number),
  constraint document_versions_content_object check (jsonb_typeof(content) = 'object'),
  constraint document_versions_approved_consistent
    check ((approved_at is null) = (approved_by is null)),
  constraint document_versions_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index document_versions_document_idx
  on public.document_versions (document_id, version_number desc);
create index document_versions_asset_idx
  on public.document_versions (file_asset_id) where file_asset_id is not null;

comment on table public.document_versions is
  'Immutable once published. Corrections create a new version, never an edit.';

-- Foreign keys back to the version table, added now that it exists.
alter table public.documents
  add constraint documents_current_version_fk
    foreign key (current_version_id) references public.document_versions (id) on delete set null,
  add constraint documents_published_version_fk
    foreign key (published_version_id) references public.document_versions (id) on delete restrict;

-- -----------------------------------------------------------------------------
-- Version numbering, transition enforcement, and immutability
-- -----------------------------------------------------------------------------
create or replace function app.assign_document_version_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.version_number is null then
    select coalesce(max(dv.version_number), 0) + 1
    into new.version_number
    from public.document_versions dv
    where dv.document_id = new.document_id;
  end if;
  return new;
end;
$$;

create trigger document_versions_assign_number
  before insert on public.document_versions
  for each row execute function app.assign_document_version_number();

create or replace function app.guard_document_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- A published version is frozen. Archiving happens on the container so the
  -- published artefact itself never changes. The one exception is the database
  -- nulling an actor reference when a staff account is removed.
  if old.status = 'published' then
    if app.published_change_is_referential(to_jsonb(old), to_jsonb(new)) then
      return new;
    end if;
    raise exception
      'Version % of document % is published and cannot be modified. Create a new version instead.',
      old.version_number, old.document_id
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

create trigger document_versions_guard_update
  before update on public.document_versions
  for each row execute function app.guard_document_version_update();

create or replace function app.forbid_published_version_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status in ('published', 'archived') then
    raise exception 'A published version cannot be deleted.' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger document_versions_guard_delete
  before delete on public.document_versions
  for each row execute function app.forbid_published_version_delete();

-- -----------------------------------------------------------------------------
-- Per-investor access grants for `restricted` documents
-- -----------------------------------------------------------------------------
create table public.document_access_grants (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  investor_id uuid not null references public.investors (id) on delete cascade,
  granted_by uuid references public.admins (id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.admins (id) on delete set null,
  note text,

  constraint document_access_grants_revoked_consistent
    check ((revoked_at is null) = (revoked_by is null))
);

-- One live grant per (document, investor); revoked grants are kept as history.
create unique index document_access_grants_live_unique
  on public.document_access_grants (document_id, investor_id)
  where revoked_at is null;

create index document_access_grants_investor_idx
  on public.document_access_grants (investor_id) where revoked_at is null;

create or replace function app.investor_granted_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.document_access_grants g
    where g.document_id = p_document_id
      and g.investor_id = app.current_investor_id()
      and g.revoked_at is null
  );
$$;

grant execute on function app.investor_granted_document(uuid) to authenticated;

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.documents enable row level security;
alter table public.documents force row level security;
alter table public.document_versions enable row level security;
alter table public.document_versions force row level security;
alter table public.document_access_grants enable row level security;
alter table public.document_access_grants force row level security;

revoke all on public.documents from anon, authenticated;
revoke all on public.document_versions from anon, authenticated;
revoke all on public.document_access_grants from anon, authenticated;

grant select on public.documents to anon, authenticated;
grant insert, update on public.documents to authenticated;
grant select on public.document_versions to anon, authenticated;
grant insert, update, delete on public.document_versions to authenticated;
grant select, insert, update on public.document_access_grants to authenticated;

-- --- documents -------------------------------------------------------------

create policy documents_select_public
  on public.documents for select
  to anon, authenticated
  using (status = 'published' and visibility = 'public');

-- The investor rule, spelled out: access-granting status, published, and either
-- broadly visible to investors or explicitly granted to this one.
create policy documents_select_investor
  on public.documents for select
  to authenticated
  using (
    app.current_investor_id() is not null
    and status = 'published'
    and (
      visibility = 'investors'
      or (visibility = 'restricted' and app.investor_granted_document(id))
    )
  );

create policy documents_select_admin
  on public.documents for select
  to authenticated
  using (app.has_permission('documents.view'));

create policy documents_insert_admin
  on public.documents for insert
  to authenticated
  with check (app.has_permission('documents.create') and status = 'draft');

create policy documents_update_admin
  on public.documents for update
  to authenticated
  using (app.has_permission('documents.update'))
  with check (app.has_permission('documents.update'));

-- No DELETE policy: documents are archived, never deleted.

-- --- document_versions -----------------------------------------------------

-- A version is readable exactly when its document is. The join keeps the rule
-- in one place instead of restating the visibility logic.
create policy document_versions_select_via_document
  on public.document_versions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and d.published_version_id = public.document_versions.id
    )
  );

create policy document_versions_select_admin
  on public.document_versions for select
  to authenticated
  using (app.has_permission('documents.view'));

create policy document_versions_insert_admin
  on public.document_versions for insert
  to authenticated
  with check (app.has_permission('documents.create') and status = 'draft');

create policy document_versions_update_admin
  on public.document_versions for update
  to authenticated
  using (app.has_permission('documents.update'))
  with check (app.has_permission('documents.update'));

create policy document_versions_delete_admin
  on public.document_versions for delete
  to authenticated
  using (app.has_permission('documents.delete'));

-- --- document_access_grants ------------------------------------------------

create policy document_access_grants_select_self
  on public.document_access_grants for select
  to authenticated
  using (investor_id = app.current_user_id());

create policy document_access_grants_select_admin
  on public.document_access_grants for select
  to authenticated
  using (app.has_permission('investor_documents.view'));

create policy document_access_grants_insert_admin
  on public.document_access_grants for insert
  to authenticated
  with check (app.has_permission('investor_documents.assign'));

create policy document_access_grants_update_admin
  on public.document_access_grants for update
  to authenticated
  using (app.has_permission('investor_documents.revoke'))
  with check (app.has_permission('investor_documents.revoke'));
