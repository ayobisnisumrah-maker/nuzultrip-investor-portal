-- =============================================================================
-- Session support
--
-- Two things the application layer needs from the database on every request:
--
--   1. `public.current_principal()` — the caller's complete identity and
--      effective permissions, in one round trip.
--   2. `public.custom_access_token_hook()` — stable identity facts stamped into
--      the JWT so RLS and the client can branch without a query.
--
-- See docs/RBAC.md §4.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Principal resolution
--
-- SECURITY DEFINER because it reads across admins, roles and role_permissions,
-- which most callers cannot see. It is safe because it returns **only the
-- caller's own** identity: every branch is keyed on auth.uid(), and there is no
-- parameter to point it at somebody else.
--
-- Returns NULL when unauthenticated, when the account is disabled, or when an
-- admin has been deactivated — so a disabled account loses access on the next
-- request, not on the next token refresh.
-- -----------------------------------------------------------------------------
create or replace function public.current_principal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  account record;
  result jsonb;
begin
  if uid is null then
    return null;
  end if;

  select ua.id, ua.account_type, ua.status, ua.email, ua.full_name,
         ua.locale, ua.timezone, ua.avatar_path
  into account
  from public.user_accounts ua
  where ua.id = uid;

  if account.id is null or account.status <> 'active' then
    return null;
  end if;

  result := jsonb_build_object(
    'userId', account.id,
    'accountType', account.account_type,
    'accountStatus', account.status,
    'email', account.email,
    'fullName', account.full_name,
    'locale', account.locale,
    'timezone', account.timezone,
    'avatarPath', account.avatar_path
  );

  if account.account_type = 'admin' then
    return result || coalesce(
      (
        select jsonb_build_object(
          'admin', jsonb_build_object(
            'adminId', a.id,
            'roleId', r.id,
            'roleKey', r.key,
            'roleName', r.name,
            'title', a.title,
            'permissionVersion', r.permission_version,
            'permissions', coalesce(
              (
                select jsonb_agg(p.key order by p.key)
                from public.permissions p
                where r.key = 'super_admin'
                   or exists (
                     select 1 from public.role_permissions rp
                     where rp.role_id = r.id and rp.permission_id = p.id
                   )
              ),
              '[]'::jsonb
            )
          )
        )
        from public.admins a
        join public.roles r on r.id = a.role_id
        where a.id = uid and a.is_active
      ),
      '{}'::jsonb
    );
  end if;

  return result || coalesce(
    (
      select jsonb_build_object(
        'investor', jsonb_build_object(
          'investorId', i.id,
          'referenceCode', i.reference_code,
          'status', i.status,
          'investorType', i.investor_type,
          'legalName', i.legal_name,
          -- The single source of truth for "may this investor see data",
          -- mirroring grantsDataAccess() in src/core/investors/status.ts.
          'hasDataAccess', i.status in ('approved', 'active')
        )
      )
      from public.investors i
      where i.id = uid
    ),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.current_principal() from public;
-- `anon` may call it too. Every page resolves a principal, including the
-- sign-in page, and for an unauthenticated caller the function simply returns
-- NULL — there is no data to leak and no branch to probe.
grant execute on function public.current_principal() to anon, authenticated;

comment on function public.current_principal() is
  'The calling principal''s identity and effective permissions. Never returns another user''s data.';

-- -----------------------------------------------------------------------------
-- Custom access token hook
--
-- Adds only **stable identity facts** to the JWT. Granular permissions are
-- deliberately excluded: a token cannot be un-issued, so a revoked permission
-- would keep working until the token expired. `role_version` lets the client
-- notice that its role changed and refresh (docs/ARCHITECTURE.md §7).
-- -----------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (event ->> 'user_id')::uuid;
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  account record;
  admin_row record;
  investor_row record;
begin
  select ua.account_type, ua.status into account
  from public.user_accounts ua where ua.id = uid;

  if account.account_type is null then
    -- An auth user with no domain account has no business holding claims.
    return event;
  end if;

  claims := claims
    || jsonb_build_object('account_type', account.account_type)
    || jsonb_build_object('account_status', account.status);

  if account.account_type = 'admin' then
    select a.id, a.role_id, r.key as role_key, r.permission_version, a.is_active
    into admin_row
    from public.admins a
    join public.roles r on r.id = a.role_id
    where a.id = uid;

    if admin_row.id is not null then
      claims := claims || jsonb_build_object(
        'admin_id', admin_row.id,
        'role_id', admin_row.role_id,
        'role_key', admin_row.role_key,
        'role_version', admin_row.permission_version,
        'admin_active', admin_row.is_active
      );
    end if;
  else
    select i.id, i.status into investor_row
    from public.investors i where i.id = uid;

    if investor_row.id is not null then
      claims := claims || jsonb_build_object(
        'investor_id', investor_row.id,
        'investor_status', investor_row.status
      );
    end if;
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The hook is invoked by GoTrue, which connects as supabase_auth_admin.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Reading these tables is required for the hook to do its job, and
-- supabase_auth_admin is not a client-facing role.
grant select on public.user_accounts to supabase_auth_admin;
grant select on public.admins to supabase_auth_admin;
grant select on public.roles to supabase_auth_admin;
grant select on public.investors to supabase_auth_admin;

create policy user_accounts_select_auth_admin
  on public.user_accounts for select to supabase_auth_admin using (true);
create policy admins_select_auth_admin
  on public.admins for select to supabase_auth_admin using (true);
create policy roles_select_auth_admin
  on public.roles for select to supabase_auth_admin using (true);
create policy investors_select_auth_admin
  on public.investors for select to supabase_auth_admin using (true);

comment on function public.custom_access_token_hook(jsonb) is
  'Stamps stable identity facts into the JWT. Never stamps granular permissions.';
