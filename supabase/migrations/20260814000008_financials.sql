-- =============================================================================
-- Financial reporting
--
-- Structurally separate from CMS content: different permissions, different
-- audit sensitivity, different lifecycle. A CMS editor cannot touch a figure.
--
-- Provenance (`source`) is a NOT NULL column on every version. That is the
-- structural guarantee behind "no fabricated financial data": an investor can
-- always tell whether a figure is internal management reporting or audited.
--
-- Derived figures — totals, margins, growth — are computed at read time from
-- line items and are never stored, so they cannot drift from their inputs.
--
-- Mirrors src/core/financials/provenance.ts. See docs/DATABASE.md §6.
-- =============================================================================

create type public.period_type as enum ('monthly', 'quarterly', 'yearly');
create type public.period_status as enum ('open', 'closed', 'locked');
create type public.financial_source as enum ('internal', 'reviewed', 'audited');
create type public.financial_statement as enum ('income', 'balance', 'cash_flow');
create type public.financial_category as enum (
  'revenue',
  'expense',
  'asset',
  'liability',
  'equity',
  'operating',
  'investing',
  'financing'
);

-- -----------------------------------------------------------------------------
-- Periods
-- -----------------------------------------------------------------------------
create table public.financial_periods (
  id uuid primary key default gen_random_uuid(),
  period_type public.period_type not null,
  fiscal_year integer not null,
  period_index integer not null,
  starts_on date not null,
  ends_on date not null,
  currency char(3) not null default 'IDR',
  status public.period_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint financial_periods_unique unique (period_type, fiscal_year, period_index),
  constraint financial_periods_year_sane check (fiscal_year between 2000 and 2200),
  constraint financial_periods_range check (ends_on >= starts_on),
  constraint financial_periods_currency_iso check (currency ~ '^[A-Z]{3}$'),
  -- The index must be valid for its type: 1–12 monthly, 1–4 quarterly, 1 yearly.
  constraint financial_periods_index_matches_type check (
    case period_type
      when 'monthly' then period_index between 1 and 12
      when 'quarterly' then period_index between 1 and 4
      when 'yearly' then period_index = 1
    end
  )
);

create index financial_periods_lookup_idx
  on public.financial_periods (period_type, fiscal_year desc, period_index desc);

create trigger financial_periods_set_updated_at
  before update on public.financial_periods
  for each row execute function app.set_updated_at();

comment on table public.financial_periods is
  'Reporting periods. A locked period accepts no new report versions.';

-- -----------------------------------------------------------------------------
-- Reports (container) and versions (append-only)
-- -----------------------------------------------------------------------------
create table public.financial_reports (
  id uuid primary key default gen_random_uuid(),
  financial_period_id uuid not null
    references public.financial_periods (id) on delete restrict,
  title text not null,
  summary text,
  visibility public.visibility not null default 'investors',
  status public.publication_status not null default 'draft',

  current_version_id uuid,
  published_version_id uuid,

  owner_admin_id uuid references public.admins (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint financial_reports_title_not_blank check (length(btrim(title)) > 0),
  -- One report per period. Revisions are versions, not new reports.
  constraint financial_reports_period_unique unique (financial_period_id),
  constraint financial_reports_published_has_version
    check (status <> 'published' or published_version_id is not null),
  -- Financial detail is never public. The portal shows curated highlights drawn
  -- from published reports; the statements themselves are for investors.
  constraint financial_reports_not_public check (visibility <> 'public')
);

create index financial_reports_status_idx on public.financial_reports (status, visibility);

create trigger financial_reports_set_updated_at
  before update on public.financial_reports
  for each row execute function app.set_updated_at();

create table public.financial_report_versions (
  id uuid primary key default gen_random_uuid(),
  financial_report_id uuid not null
    references public.financial_reports (id) on delete cascade,
  version_number integer not null,
  status public.publication_status not null default 'draft',

  -- Mandatory. Rendered next to every figure this version contains.
  source public.financial_source not null,
  prepared_by text,
  notes text,
  document_asset_id uuid references public.media_assets (id) on delete restrict,

  change_note text,
  created_by uuid references public.admins (id) on delete set null,
  approved_by uuid references public.admins (id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),

  constraint financial_report_versions_number_positive check (version_number > 0),
  constraint financial_report_versions_unique
    unique (financial_report_id, version_number),
  constraint financial_report_versions_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index financial_report_versions_report_idx
  on public.financial_report_versions (financial_report_id, version_number desc);

comment on column public.financial_report_versions.source is
  'Provenance: internal management reporting, limited review, or independent audit. Always shown to investors.';

alter table public.financial_reports
  add constraint financial_reports_current_version_fk
    foreign key (current_version_id)
    references public.financial_report_versions (id) on delete set null,
  add constraint financial_reports_published_version_fk
    foreign key (published_version_id)
    references public.financial_report_versions (id) on delete restrict;

create or replace function app.assign_financial_version_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  period_state public.period_status;
begin
  select fp.status into period_state
  from public.financial_reports fr
  join public.financial_periods fp on fp.id = fr.financial_period_id
  where fr.id = new.financial_report_id;

  if period_state = 'locked' then
    raise exception 'The reporting period is locked; no new version can be added.'
      using errcode = '42501';
  end if;

  if new.version_number is null then
    select coalesce(max(v.version_number), 0) + 1
    into new.version_number
    from public.financial_report_versions v
    where v.financial_report_id = new.financial_report_id;
  end if;

  return new;
end;
$$;

create trigger financial_report_versions_assign_number
  before insert on public.financial_report_versions
  for each row execute function app.assign_financial_version_number();

create or replace function app.guard_financial_version_update()
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
      'Financial report version % is published and cannot be modified. Issue a new version instead.',
      old.version_number
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

create trigger financial_report_versions_guard_update
  before update on public.financial_report_versions
  for each row execute function app.guard_financial_version_update();

create trigger financial_report_versions_guard_delete
  before delete on public.financial_report_versions
  for each row execute function app.forbid_published_version_delete();

-- -----------------------------------------------------------------------------
-- Line items
-- -----------------------------------------------------------------------------
create table public.financial_line_items (
  id uuid primary key default gen_random_uuid(),
  financial_report_version_id uuid not null
    references public.financial_report_versions (id) on delete cascade,

  statement public.financial_statement not null,
  category public.financial_category not null,
  line_key text not null,
  label text not null,
  -- numeric, never a float. Currency travels with the amount.
  amount numeric(20, 2) not null,
  currency char(3) not null default 'IDR',
  position integer not null default 0,
  parent_id uuid references public.financial_line_items (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),

  constraint financial_line_items_key_shape check (line_key ~ '^[a-z][a-z0-9_]*$'),
  constraint financial_line_items_label_not_blank check (length(btrim(label)) > 0),
  constraint financial_line_items_currency_iso check (currency ~ '^[A-Z]{3}$'),
  constraint financial_line_items_unique unique (financial_report_version_id, statement, line_key),
  -- A category has to belong to the statement it is filed under, or totals
  -- computed per statement would silently include the wrong rows.
  constraint financial_line_items_category_matches_statement check (
    case statement
      when 'income' then category in ('revenue', 'expense')
      when 'balance' then category in ('asset', 'liability', 'equity')
      when 'cash_flow' then category in ('operating', 'investing', 'financing')
    end
  ),
  constraint financial_line_items_not_own_parent check (parent_id is distinct from id)
);

create index financial_line_items_version_idx
  on public.financial_line_items (financial_report_version_id, statement, position);
create index financial_line_items_parent_idx
  on public.financial_line_items (parent_id) where parent_id is not null;

comment on table public.financial_line_items is
  'Normalised figures for querying and charting. Totals and margins are derived at read time, never stored.';

-- Line items belong to their version and are frozen with it.
create or replace function app.guard_financial_line_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_status public.publication_status;
  target uuid := coalesce(new.financial_report_version_id, old.financial_report_version_id);
begin
  select v.status into version_status
  from public.financial_report_versions v
  where v.id = target;

  if version_status = 'published' then
    raise exception 'Figures belonging to a published version cannot be changed.'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger financial_line_items_guard
  before insert or update or delete on public.financial_line_items
  for each row execute function app.guard_financial_line_item();

-- -----------------------------------------------------------------------------
-- KPIs
-- -----------------------------------------------------------------------------
create table public.financial_kpis (
  id uuid primary key default gen_random_uuid(),
  financial_report_version_id uuid not null
    references public.financial_report_versions (id) on delete cascade,
  kpi_key text not null,
  label text not null,
  value numeric(20, 4) not null,
  unit text not null default 'ratio',
  -- `reported` was supplied; `derived` was computed from line items. Shown in
  -- the UI so a reader knows which is which.
  basis text not null default 'reported',
  position integer not null default 0,

  constraint financial_kpis_key_shape check (kpi_key ~ '^[a-z][a-z0-9_]*$'),
  constraint financial_kpis_unique unique (financial_report_version_id, kpi_key),
  constraint financial_kpis_basis_valid check (basis in ('reported', 'derived')),
  constraint financial_kpis_unit_valid
    check (unit in ('ratio', 'percent', 'currency', 'count', 'days'))
);

create index financial_kpis_version_idx
  on public.financial_kpis (financial_report_version_id, position);

create trigger financial_kpis_guard
  before insert or update or delete on public.financial_kpis
  for each row execute function app.guard_financial_line_item();

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.financial_periods enable row level security;
alter table public.financial_periods force row level security;
alter table public.financial_reports enable row level security;
alter table public.financial_reports force row level security;
alter table public.financial_report_versions enable row level security;
alter table public.financial_report_versions force row level security;
alter table public.financial_line_items enable row level security;
alter table public.financial_line_items force row level security;
alter table public.financial_kpis enable row level security;
alter table public.financial_kpis force row level security;

revoke all on public.financial_periods from anon, authenticated;
revoke all on public.financial_reports from anon, authenticated;
revoke all on public.financial_report_versions from anon, authenticated;
revoke all on public.financial_line_items from anon, authenticated;
revoke all on public.financial_kpis from anon, authenticated;

grant select, insert, update on public.financial_periods to authenticated;
grant select, insert, update on public.financial_reports to authenticated;
grant select, insert, update on public.financial_report_versions to authenticated;
grant select, insert, update, delete on public.financial_line_items to authenticated;
grant select, insert, update, delete on public.financial_kpis to authenticated;

-- `anon` is granted nothing on any financial table. The portal's financial
-- highlights are CMS content curated by an admin, not a live read of these rows.

create policy financial_periods_select_investor
  on public.financial_periods for select to authenticated
  using (app.current_investor_id() is not null);

create policy financial_periods_select_admin
  on public.financial_periods for select to authenticated
  using (app.has_permission('financial_periods.view'));

create policy financial_periods_insert_admin
  on public.financial_periods for insert to authenticated
  with check (app.has_permission('financial_periods.create'));

create policy financial_periods_update_admin
  on public.financial_periods for update to authenticated
  using (app.has_permission('financial_periods.update'))
  with check (app.has_permission('financial_periods.update'));

create policy financial_reports_select_investor
  on public.financial_reports for select to authenticated
  using (
    app.current_investor_id() is not null
    and status = 'published'
    and visibility = 'investors'
  );

create policy financial_reports_select_admin
  on public.financial_reports for select to authenticated
  using (app.has_permission('financial_reports.view'));

create policy financial_reports_insert_admin
  on public.financial_reports for insert to authenticated
  with check (app.has_permission('financial_reports.create') and status = 'draft');

create policy financial_reports_update_admin
  on public.financial_reports for update to authenticated
  using (app.has_permission('financial_reports.update'))
  with check (app.has_permission('financial_reports.update'));

create policy financial_report_versions_select_investor
  on public.financial_report_versions for select to authenticated
  using (
    exists (
      select 1 from public.financial_reports r
      where r.id = financial_report_id
        and r.published_version_id = public.financial_report_versions.id
    )
  );

create policy financial_report_versions_select_admin
  on public.financial_report_versions for select to authenticated
  using (app.has_permission('financial_reports.view'));

create policy financial_report_versions_insert_admin
  on public.financial_report_versions for insert to authenticated
  with check (app.has_permission('financial_reports.create') and status = 'draft');

create policy financial_report_versions_update_admin
  on public.financial_report_versions for update to authenticated
  using (app.has_permission('financial_reports.update'))
  with check (app.has_permission('financial_reports.update'));

-- Figures are visible exactly when their version is. The subquery is subject to
-- the version policies above, so the rule is stated once.
create policy financial_line_items_select
  on public.financial_line_items for select to authenticated
  using (
    exists (
      select 1 from public.financial_report_versions v
      where v.id = financial_report_version_id
    )
  );

create policy financial_line_items_write_admin
  on public.financial_line_items for insert to authenticated
  with check (app.has_permission('financial_reports.update'));

create policy financial_line_items_update_admin
  on public.financial_line_items for update to authenticated
  using (app.has_permission('financial_reports.update'))
  with check (app.has_permission('financial_reports.update'));

create policy financial_line_items_delete_admin
  on public.financial_line_items for delete to authenticated
  using (app.has_permission('financial_reports.update'));

create policy financial_kpis_select
  on public.financial_kpis for select to authenticated
  using (
    exists (
      select 1 from public.financial_report_versions v
      where v.id = financial_report_version_id
    )
  );

create policy financial_kpis_write_admin
  on public.financial_kpis for insert to authenticated
  with check (app.has_permission('financial_reports.update'));

create policy financial_kpis_update_admin
  on public.financial_kpis for update to authenticated
  using (app.has_permission('financial_reports.update'))
  with check (app.has_permission('financial_reports.update'));

create policy financial_kpis_delete_admin
  on public.financial_kpis for delete to authenticated
  using (app.has_permission('financial_reports.update'));
