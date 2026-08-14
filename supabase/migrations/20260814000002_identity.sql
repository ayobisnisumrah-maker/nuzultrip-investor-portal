-- =============================================================================
-- Identity
--
-- `user_accounts` is the join point between Supabase Auth and the domain.
-- One row per auth.users row; exactly one subtype (admin or investor).
--
-- See docs/DATABASE.md §3 and docs/ARCHITECTURE.md §6.
-- =============================================================================

create type public.account_type as enum ('admin', 'investor');
create type public.account_status as enum ('active', 'disabled');

create table public.user_accounts (
  id uuid primary key references auth.users (id) on delete cascade,

  account_type public.account_type not null,
  status public.account_status not null default 'active',

  -- Denormalised from auth.users so the domain can join and search on it.
  -- Kept lowercase by constraint so uniqueness is genuinely case-insensitive.
  email text not null,
  full_name text not null,
  phone text,
  avatar_path text,
  locale text not null default 'id',
  timezone text not null default 'Asia/Jakarta',

  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_accounts_email_lowercase check (email = lower(email)),
  constraint user_accounts_email_format check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint user_accounts_full_name_not_blank check (length(btrim(full_name)) > 0),
  constraint user_accounts_locale_valid check (locale in ('id', 'en'))
);

create unique index user_accounts_email_key on public.user_accounts (email);
create index user_accounts_account_type_status_idx
  on public.user_accounts (account_type, status);
create index user_accounts_full_name_trgm_idx
  on public.user_accounts using gin (full_name extensions.gin_trgm_ops);

comment on table public.user_accounts is
  'Domain profile for an authenticated principal. Subtype is in admins or investors.';
comment on column public.user_accounts.status is
  'Disabling takes effect on the next request because the principal is resolved from this table, not from the JWT.';

create trigger user_accounts_set_updated_at
  before update on public.user_accounts
  for each row execute function app.set_updated_at();

-- The account type determines which subtype table the row may appear in, and
-- which RLS policies apply. Changing it after the fact would silently move a
-- principal between two entirely different authorisation models.
create trigger user_accounts_account_type_immutable
  before update on public.user_accounts
  for each row execute function app.forbid_column_change('account_type');

-- -----------------------------------------------------------------------------
-- Privileges and RLS
--
-- Admin-facing policies are added in the RBAC migration, once app.has_permission
-- exists. Until then the only access is self-access.
-- -----------------------------------------------------------------------------
alter table public.user_accounts enable row level security;
alter table public.user_accounts force row level security;

revoke all on public.user_accounts from anon, authenticated;
grant select on public.user_accounts to authenticated;
grant update (full_name, phone, avatar_path, locale, timezone) on public.user_accounts to authenticated;

create policy user_accounts_select_self
  on public.user_accounts
  for select
  to authenticated
  using (id = app.current_user_id());

create policy user_accounts_update_self
  on public.user_accounts
  for update
  to authenticated
  using (id = app.current_user_id() and status = 'active')
  with check (id = app.current_user_id() and status = 'active');

-- No INSERT or DELETE policy exists for `authenticated`. Accounts are created
-- and removed only through the server's provisioning path, which uses the
-- service role and writes an audit record (docs/SECURITY.md §3).
