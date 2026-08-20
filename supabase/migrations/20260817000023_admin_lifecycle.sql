-- =============================================================================
-- Administrator lifecycle
-- Atomic update of administrator identity, role and title.
-- =============================================================================

create or replace function public.update_admin_account(
  p_admin_id uuid,
  p_full_name text,
  p_role_id uuid,
  p_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.admins;
  v_role public.roles;
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
    into v_role
  from public.roles
  where id = p_role_id;

  if v_role.id is null then
    raise exception 'Role % tidak ditemukan.', p_role_id
      using errcode = '23503';
  end if;

  if v_role.key in ('super_admin', 'admin_internal') then
    raise exception 'Role tersebut tidak dapat diberikan melalui provisioning Administrator.'
      using errcode = '42501';
  end if;

  update public.user_accounts
  set
    full_name = btrim(p_full_name)
  where id = p_admin_id;

  update public.admins
  set
    role_id = p_role_id,
    title = nullif(btrim(coalesce(p_title, '')), '')
  where id = p_admin_id;

  return jsonb_build_object(
    'adminId', p_admin_id,
    'roleId', p_role_id
  );
end;
$$;

revoke all on function public.update_admin_account(uuid, text, uuid, text)
  from public, anon, authenticated;

grant execute on function public.update_admin_account(uuid, text, uuid, text)
  to service_role;

comment on function public.update_admin_account(uuid, text, uuid, text) is
  'Atomically updates administrator name, operational role and title. Service-role only.';
