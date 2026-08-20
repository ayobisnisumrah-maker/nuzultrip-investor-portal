-- =============================================================================
-- Administrator lifecycle controls
-- Activate / deactivate administrator accounts atomically.
-- Permanent Auth deletion remains a server-side service-role operation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Activate administrator
-- -----------------------------------------------------------------------------

create or replace function public.activate_admin_account(
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admins;
  v_account public.user_accounts;
begin
  select *
    into v_admin
  from public.admins
  where id = p_admin_id
  for update;

  if v_admin.id is null then
    raise exception 'Administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  select *
    into v_account
  from public.user_accounts
  where id = p_admin_id
    and account_type = 'admin'
  for update;

  if v_account.id is null then
    raise exception 'Akun administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  update public.user_accounts
  set status = 'active'
  where id = p_admin_id;

  update public.admins
  set is_active = true,
      disabled_at = null,
      disabled_reason = null
  where id = p_admin_id;

  return jsonb_build_object(
    'adminId', p_admin_id,
    'status', 'active'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Deactivate administrator
-- -----------------------------------------------------------------------------

create or replace function public.deactivate_admin_account(
  p_admin_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admins;
  v_account public.user_accounts;
  v_super_admin_role uuid;
  v_remaining integer;
begin
  select *
    into v_admin
  from public.admins
  where id = p_admin_id
  for update;

  if v_admin.id is null then
    raise exception 'Administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  select *
    into v_account
  from public.user_accounts
  where id = p_admin_id
    and account_type = 'admin'
  for update;

  if v_account.id is null then
    raise exception 'Akun administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  select id
    into v_super_admin_role
  from public.roles
  where key = 'super_admin';

  -- Never allow the last active Super Admin to be disabled.
  if v_admin.role_id = v_super_admin_role and v_admin.is_active then
    select count(*)
      into v_remaining
    from public.admins a
    join public.user_accounts ua
      on ua.id = a.id
    where a.role_id = v_super_admin_role
      and a.is_active
      and ua.status = 'active'
      and a.id <> p_admin_id;

    if v_remaining = 0 then
      raise exception 'The last Super Admin cannot be disabled.'
        using errcode = '42501';
    end if;
  end if;

  update public.user_accounts
  set status = 'disabled'
  where id = p_admin_id;

  update public.admins
  set
    is_active = false,
    disabled_at = now(),
    disabled_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_admin_id;

  return jsonb_build_object(
    'adminId', p_admin_id,
    'status', 'disabled'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Security
-- -----------------------------------------------------------------------------

revoke all on function public.activate_admin_account(uuid)
  from public, anon, authenticated;

revoke all on function public.deactivate_admin_account(uuid, text)
  from public, anon, authenticated;

grant execute on function public.activate_admin_account(uuid)
  to service_role;

grant execute on function public.deactivate_admin_account(uuid, text)
  to service_role;

comment on function public.activate_admin_account(uuid) is
  'Atomically activates an administrator by setting both admins.is_active and user_accounts.status. Service-role only.';

comment on function public.deactivate_admin_account(uuid, text) is
  'Atomically disables an administrator by setting both admins.is_active and user_accounts.status. The last active Super Admin cannot be disabled. Service-role only.';
