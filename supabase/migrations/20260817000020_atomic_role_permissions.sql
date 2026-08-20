-- =============================================================================
-- Atomic role permission update
--
-- Keeps role metadata + permission membership in one database transaction.
-- SECURITY INVOKER is intentional: RLS remains authoritative.
-- =============================================================================

create or replace function public.update_role_permissions_atomic(
  p_role_id uuid,
  p_name text,
  p_description text,
  p_permission_ids uuid[],
  p_expected_permission_version integer
)
returns table (
  role_id uuid,
  role_key text,
  role_name text,
  role_description text,
  permission_version integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role public.roles%rowtype;
  v_permission_count integer;
  v_distinct_permission_count integer;
begin
  if p_role_id is null then
    raise exception 'role_id is required'
      using errcode = '22023';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'Role name cannot be blank'
      using errcode = '22023';
  end if;

  if length(p_name) > 100 then
    raise exception 'Role name is too long'
      using errcode = '22023';
  end if;

  if p_description is null then
    p_description := '';
  end if;

  if length(p_description) > 500 then
    raise exception 'Role description is too long'
      using errcode = '22023';
  end if;

  if p_expected_permission_version is null
     or p_expected_permission_version < 1 then
    raise exception 'Invalid permission version'
      using errcode = '22023';
  end if;

  -- Lock the role row for the duration of this transaction.
  select *
  into v_role
  from public.roles
  where id = p_role_id
  for update;

  if not found then
    raise exception 'Role not found'
      using errcode = 'P0002';
  end if;

  -- System roles remain protected.
  if v_role.is_system or v_role.key = 'super_admin' then
    raise exception 'System roles cannot be modified'
      using errcode = '42501';
  end if;

  -- Optimistic concurrency protection.
  if v_role.permission_version <> p_expected_permission_version then
    raise exception 'ROLE_PERMISSION_VERSION_CONFLICT'
      using
        errcode = '40001',
        detail = v_role.permission_version::text;
  end if;

  -- Validate that every supplied permission exists and IDs are unique.
  select
    count(*),
    count(distinct p.id)
  into
    v_permission_count,
    v_distinct_permission_count
  from unnest(coalesce(p_permission_ids, '{}'::uuid[])) requested(id)
  left join public.permissions p
    on p.id = requested.id;

  if v_permission_count <> v_distinct_permission_count then
    raise exception 'One or more permission IDs do not exist'
      using errcode = '23503';
  end if;

  -- Update role metadata.
  update public.roles
  set
    name = btrim(p_name),
    description = btrim(p_description),
    updated_at = now()
  where id = p_role_id;

  -- Synchronize permission membership.
  --
  -- The DELETE removes only permissions that are no longer selected.
  delete from public.role_permissions rp
  where rp.role_id = p_role_id
    and not (
      rp.permission_id = any(
        coalesce(p_permission_ids, '{}'::uuid[])
      )
    );

  -- INSERT adds newly selected permissions.
  insert into public.role_permissions (
    role_id,
    permission_id
  )
  select
    p_role_id,
    requested.id
  from unnest(
    coalesce(p_permission_ids, '{}'::uuid[])
  ) requested(id)
  where not exists (
    select 1
    from public.role_permissions existing
    where existing.role_id = p_role_id
      and existing.permission_id = requested.id
  );

  -- Return the current row after triggers have completed.
  return query
  select
    r.id,
    r.key,
    r.name,
    r.description,
    r.permission_version
  from public.roles r
  where r.id = p_role_id;
end;
$$;

revoke all
on function public.update_role_permissions_atomic(
  uuid,
  text,
  text,
  uuid[],
  integer
)
from public;

revoke all
on function public.update_role_permissions_atomic(
  uuid,
  text,
  text,
  uuid[],
  integer
)
from anon;

grant execute
on function public.update_role_permissions_atomic(
  uuid,
  text,
  text,
  uuid[],
  integer
)
to authenticated;
