-- =============================================================================
-- RBAC — roles, permissions, admins, and the authorisation functions that every
-- later RLS policy is built on.
--
-- See docs/RBAC.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Permissions catalogue
--
-- Rows are seeded from src/core/rbac/permissions.ts, which is also the source of
-- the TypeScript `Permission` union. A test asserts the two match exactly.
-- -----------------------------------------------------------------------------
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module text not null,
  action text not null,
  description text not null,
  -- Flagged in the role editor and always audited.
  is_dangerous boolean not null default false,
  created_at timestamptz not null default now(),

  constraint permissions_key_shape check (key = module || '.' || action),
  constraint permissions_module_shape check (module ~ '^[a-z][a-z0-9_]*$'),
  constraint permissions_action_shape check (action ~ '^[a-z][a-z0-9_]*$'),
  constraint permissions_module_action_unique unique (module, action)
);

create index permissions_module_idx on public.permissions (module, action);

comment on table public.permissions is
  'Atomic capabilities, keyed module.action. Reference data — mirrored by src/core/rbac/permissions.ts.';

-- -----------------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  -- System roles cannot be deleted or re-keyed.
  is_system boolean not null default false,
  -- Bumped whenever this role's permission set changes, so clients holding a
  -- token issued under the old set refresh instead of offering actions the
  -- server will now refuse (docs/RBAC.md §4).
  permission_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint roles_key_shape check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint roles_name_not_blank check (length(btrim(name)) > 0)
);

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function app.set_updated_at();

create trigger roles_key_immutable
  before update on public.roles
  for each row when (old.is_system)
  execute function app.forbid_column_change('key', 'is_system');

comment on table public.roles is
  'A named set of permissions. An admin holds exactly one.';
comment on column public.roles.permission_version is
  'Incremented on any change to this role''s permission set; drives client token refresh.';

-- -----------------------------------------------------------------------------
-- Role → permission
-- -----------------------------------------------------------------------------
create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index role_permissions_permission_idx on public.role_permissions (permission_id);

-- -----------------------------------------------------------------------------
-- Admins
-- -----------------------------------------------------------------------------
create table public.admins (
  id uuid primary key references public.user_accounts (id) on delete cascade,
  -- restrict: a role that is still assigned cannot be deleted out from under it.
  role_id uuid not null references public.roles (id) on delete restrict,
  title text,
  employee_ref text,
  is_active boolean not null default true,
  created_by uuid references public.admins (id) on delete set null,
  disabled_at timestamptz,
  disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admins_disabled_consistent
    check ((is_active and disabled_at is null) or (not is_active and disabled_at is not null))
);

create index admins_role_idx on public.admins (role_id);
create index admins_active_idx on public.admins (is_active) where is_active;

create trigger admins_set_updated_at
  before update on public.admins
  for each row execute function app.set_updated_at();

comment on table public.admins is
  'Internal staff. Created only via admins.create — there is no public admin sign-up.';

-- The subtype must agree with the account type, or a principal could hold admin
-- authority through an account the investor policies also match.
create or replace function app.assert_account_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected public.account_type := tg_argv[0]::public.account_type;
  actual public.account_type;
begin
  select ua.account_type into actual
  from public.user_accounts ua
  where ua.id = new.id;

  if actual is null then
    raise exception 'No user_accounts row for %', new.id using errcode = '23503';
  end if;

  if actual <> expected then
    raise exception
      'Account % is of type %, but a % row was requested.', new.id, actual, expected
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger admins_account_type_check
  before insert or update on public.admins
  for each row execute function app.assert_account_type('admin');

-- =============================================================================
-- Authorisation functions
--
-- SECURITY DEFINER so they can read the RBAC tables regardless of the caller's
-- own policies; STABLE so Postgres evaluates them once per statement rather
-- than once per row; `search_path = ''` with fully-qualified names so the
-- classic SECURITY DEFINER search-path hijack is closed.
-- =============================================================================

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join public.user_accounts ua on ua.id = a.id
    where a.id = (select auth.uid())
      and a.is_active
      and ua.status = 'active'
  );
$$;

create or replace function app.admin_role_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.key
  from public.admins a
  join public.roles r on r.id = a.role_id
  join public.user_accounts ua on ua.id = a.id
  where a.id = (select auth.uid())
    and a.is_active
    and ua.status = 'active';
$$;

-- The single authorisation predicate. Every admin-facing RLS policy calls this
-- rather than re-implementing the join, so the rule lives in one place.
--
-- `super_admin` is resolved as "holds everything" here rather than by
-- materialising rows, so a newly added permission is covered automatically and
-- is never silently granted to any other role (docs/RBAC.md §1).
create or replace function app.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join public.user_accounts ua on ua.id = a.id
    join public.roles r on r.id = a.role_id
    where a.id = (select auth.uid())
      and a.is_active
      and ua.status = 'active'
      and (
        r.key = 'super_admin'
        or exists (
          select 1
          from public.role_permissions rp
          join public.permissions p on p.id = rp.permission_id
          where rp.role_id = r.id
            and p.key = p_key
        )
      )
  );
$$;

comment on function app.has_permission(text) is
  'True when the current principal is an active admin holding the given permission.';

-- The effective permission set, used by the escalation guards below and by the
-- server when resolving a Principal.
create or replace function app.effective_permissions(p_admin_id uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select p.key
  from public.admins a
  join public.roles r on r.id = a.role_id
  cross join lateral (
    select pp.key
    from public.permissions pp
    where r.key = 'super_admin'
    union
    select pp.key
    from public.role_permissions rp
    join public.permissions pp on pp.id = rp.permission_id
    where rp.role_id = r.id
  ) p(key)
  where a.id = p_admin_id;
$$;

grant execute on function app.is_admin() to authenticated;
grant execute on function app.admin_role_key() to authenticated;
grant execute on function app.has_permission(text) to authenticated;
grant execute on function app.effective_permissions(uuid) to authenticated;

-- =============================================================================
-- Privilege-escalation guards (docs/RBAC.md §3)
--
-- Enforced in the database as well as in the service layer, because these are
-- the failure modes that matter most and the application layer is assumed to be
-- fallible.
--
-- Guards are skipped when there is no authenticated user, which is the case for
-- migrations and the reference seed. A service-role caller is trusted by
-- definition; everything it does is audited at the application layer.
-- =============================================================================

create or replace function app.guard_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role uuid;
  target_role uuid := coalesce(new.role_id, old.role_id);
  target_permission uuid := coalesce(new.permission_id, old.permission_id);
  permission_key text;
begin
  if actor is null then
    return coalesce(new, old);
  end if;

  select a.role_id into actor_role from public.admins a where a.id = actor;

  -- 3. You cannot edit the permissions of the role you yourself hold.
  if actor_role = target_role then
    raise exception 'You cannot modify the permissions of your own role.'
      using errcode = '42501';
  end if;

  -- 1. You cannot grant (or revoke) a permission you do not hold yourself.
  select p.key into permission_key
  from public.permissions p
  where p.id = target_permission;

  if not app.has_permission(permission_key) then
    raise exception 'You cannot assign a permission you do not hold: %', permission_key
      using errcode = '42501';
  end if;

  -- Bump the role's version so clients refresh their token.
  update public.roles
  set permission_version = permission_version + 1
  where id = target_role;

  return coalesce(new, old);
end;
$$;

create trigger role_permissions_guard
  before insert or delete on public.role_permissions
  for each row execute function app.guard_role_permission_change();

-- Keeps permission_version accurate for changes made by the service role or a
-- migration, which the guard above returns early from.
create or replace function app.bump_role_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    update public.roles
    set permission_version = permission_version + 1
    where id = coalesce(new.role_id, old.role_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger role_permissions_bump_version
  after insert or delete on public.role_permissions
  for each row execute function app.bump_role_version();

create or replace function app.guard_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  super_admin_role uuid;
  remaining integer;
begin
  select id into super_admin_role from public.roles where key = 'super_admin';

  if actor is not null and tg_op = 'UPDATE' then
    -- 4. You cannot change your own role.
    if new.id = actor and new.role_id is distinct from old.role_id then
      raise exception 'You cannot change your own role.' using errcode = '42501';
    end if;

    -- 5. You cannot disable yourself — an accidental lockout is unrecoverable
    -- without direct database access.
    if new.id = actor and old.is_active and not new.is_active then
      raise exception 'You cannot disable your own account.' using errcode = '42501';
    end if;

    -- 2. You cannot assign a role whose permission set exceeds your own.
    if new.role_id is distinct from old.role_id then
      perform app.assert_role_assignable(new.role_id);
    end if;
  end if;

  if actor is not null and tg_op = 'INSERT' then
    perform app.assert_role_assignable(new.role_id);
  end if;

  -- The last active Super Admin cannot be disabled or demoted, by anyone.
  if tg_op = 'UPDATE' and old.role_id = super_admin_role
     and (new.role_id is distinct from old.role_id or (old.is_active and not new.is_active))
  then
    select count(*) into remaining
    from public.admins a
    join public.user_accounts ua on ua.id = a.id
    where a.role_id = super_admin_role
      and a.is_active
      and ua.status = 'active'
      and a.id <> old.id;

    if remaining = 0 then
      raise exception 'The last active Super Admin cannot be disabled or demoted.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create or replace function app.assert_role_assignable(p_role_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  missing text;
begin
  if actor is null then
    return;
  end if;

  -- A Super Admin may assign anything, by definition.
  if app.admin_role_key() = 'super_admin' then
    return;
  end if;

  -- Super Admin holds every permission implicitly, so it has no
  -- `role_permissions` rows at all. Without this check the comparison below
  -- would find nothing to object to and would happily let a lesser admin
  -- confer Super Admin on someone — the most direct privilege escalation
  -- available in the system.
  if exists (
    select 1 from public.roles r
    where r.id = p_role_id and r.key = 'super_admin'
  ) then
    raise exception 'Only a Super Admin may assign the Super Admin role.'
      using errcode = '42501';
  end if;

  select p.key into missing
  from (
    select pp.key
    from public.role_permissions rp
    join public.permissions pp on pp.id = rp.permission_id
    where rp.role_id = p_role_id
  ) p
  where not app.has_permission(p.key)
  limit 1;

  if missing is not null then
    raise exception
      'You cannot assign a role that holds permissions you do not: %', missing
      using errcode = '42501';
  end if;
end;
$$;

create trigger admins_guard
  before insert or update on public.admins
  for each row execute function app.guard_admin_change();

-- Deleting the last Super Admin outright is the same lockout by another route.
create or replace function app.guard_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  super_admin_role uuid;
  remaining integer;
begin
  select id into super_admin_role from public.roles where key = 'super_admin';

  if old.role_id = super_admin_role then
    select count(*) into remaining
    from public.admins a
    where a.role_id = super_admin_role
      and a.is_active
      and a.id <> old.id;

    if remaining = 0 then
      raise exception 'The last Super Admin cannot be deleted.' using errcode = '42501';
    end if;
  end if;

  return old;
end;
$$;

create trigger admins_guard_delete
  before delete on public.admins
  for each row execute function app.guard_admin_delete();

-- System roles are structural: deleting one would orphan the authorisation model.
create or replace function app.guard_role_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_system then
    raise exception 'System role "%" cannot be deleted.', old.key using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger roles_guard_delete
  before delete on public.roles
  for each row execute function app.guard_role_delete();

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.permissions enable row level security;
alter table public.permissions force row level security;
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
alter table public.admins enable row level security;
alter table public.admins force row level security;

revoke all on public.permissions from anon, authenticated;
revoke all on public.roles from anon, authenticated;
revoke all on public.role_permissions from anon, authenticated;
revoke all on public.admins from anon, authenticated;

grant select on public.permissions to authenticated;
grant select, insert, update on public.roles to authenticated;
grant delete on public.roles to authenticated;
grant select, insert, delete on public.role_permissions to authenticated;
grant select, insert, update on public.admins to authenticated;

-- permissions: readable by any admin who can see roles; never writable via the
-- API — the catalogue changes only by migration.
create policy permissions_select
  on public.permissions for select to authenticated
  using (app.has_permission('permissions.view') or app.has_permission('roles.view'));

create policy roles_select
  on public.roles for select to authenticated
  using (app.has_permission('roles.view'));

create policy roles_insert
  on public.roles for insert to authenticated
  with check (app.has_permission('roles.create') and not is_system);

create policy roles_update
  on public.roles for update to authenticated
  using (app.has_permission('roles.update'))
  with check (app.has_permission('roles.update'));

create policy roles_delete
  on public.roles for delete to authenticated
  using (app.has_permission('roles.delete') and not is_system);

create policy role_permissions_select
  on public.role_permissions for select to authenticated
  using (app.has_permission('roles.view'));

create policy role_permissions_insert
  on public.role_permissions for insert to authenticated
  with check (app.has_permission('roles.update'));

create policy role_permissions_delete
  on public.role_permissions for delete to authenticated
  using (app.has_permission('roles.update'));

-- An admin can always see their own record; seeing others requires the
-- permission. There is no DELETE policy: admins are disabled, not deleted.
create policy admins_select_self
  on public.admins for select to authenticated
  using (id = app.current_user_id());

create policy admins_select_permitted
  on public.admins for select to authenticated
  using (app.has_permission('admins.view'));

create policy admins_insert
  on public.admins for insert to authenticated
  with check (app.has_permission('admins.create'));

create policy admins_update
  on public.admins for update to authenticated
  using (app.has_permission('admins.update'))
  with check (app.has_permission('admins.update'));

-- -----------------------------------------------------------------------------
-- Admin access to user_accounts, deferred from the identity migration until
-- app.has_permission existed.
-- -----------------------------------------------------------------------------
create policy user_accounts_select_admin
  on public.user_accounts for select to authenticated
  using (
    (account_type = 'investor' and app.has_permission('investors.view'))
    or (account_type = 'admin' and app.has_permission('admins.view'))
  );

create policy user_accounts_update_admin
  on public.user_accounts for update to authenticated
  using (
    (account_type = 'investor' and app.has_permission('investors.update'))
    or (account_type = 'admin' and app.has_permission('admins.update'))
  )
  with check (
    (account_type = 'investor' and app.has_permission('investors.update'))
    or (account_type = 'admin' and app.has_permission('admins.update'))
  );
