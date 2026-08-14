-- =============================================================================
-- Account provisioning
--
-- Creating an account touches two or three tables that must all succeed or all
-- fail. The Auth admin API and a set of client-side inserts cannot be made
-- atomic together, so the domain half is done here, in one statement, and the
-- application compensates by deleting the auth user if this call fails.
--
-- Service-role only. There is no public sign-up (docs/SECURITY.md §2).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Investor
--
-- The record is created as `prospective` and immediately moved to `submitted`,
-- so the status trigger writes both history rows and the lifecycle is never
-- entered from the middle.
-- -----------------------------------------------------------------------------
create or replace function public.provision_investor_account(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_legal_name text,
  p_investor_type public.investor_type,
  p_phone text default null,
  p_country text default 'ID',
  p_city text default null,
  p_address text default null,
  p_organization_name text default null,
  p_organization_role text default null,
  p_application_note text default null,
  p_identity_number_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reference text;
begin
  insert into public.user_accounts (id, account_type, email, full_name, phone)
  values (p_user_id, 'investor', lower(p_email), p_full_name, p_phone);

  insert into public.investors (
    id, legal_name, investor_type, country, city, address,
    organization_name, organization_role, application_note, identity_number_hash
  )
  values (
    p_user_id, p_legal_name, p_investor_type, upper(p_country), p_city, p_address,
    p_organization_name, p_organization_role, p_application_note, p_identity_number_hash
  )
  returning reference_code into reference;

  update public.investors set status = 'submitted' where id = p_user_id;

  return jsonb_build_object('investorId', p_user_id, 'referenceCode', reference);
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin
-- -----------------------------------------------------------------------------
create or replace function public.provision_admin_account(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role_id uuid,
  p_title text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.roles where id = p_role_id) then
    raise exception 'Role % does not exist.', p_role_id using errcode = '23503';
  end if;

  insert into public.user_accounts (id, account_type, email, full_name)
  values (p_user_id, 'admin', lower(p_email), p_full_name);

  insert into public.admins (id, role_id, title, created_by)
  values (p_user_id, p_role_id, p_title, p_created_by);

  return jsonb_build_object('adminId', p_user_id);
end;
$$;

revoke all on function public.provision_investor_account(
  uuid, text, text, text, public.investor_type, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.provision_admin_account(uuid, text, text, uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.provision_investor_account(
  uuid, text, text, text, public.investor_type, text, text, text, text, text, text, text, text
) to service_role;
grant execute on function public.provision_admin_account(uuid, text, text, uuid, text, uuid)
  to service_role;

comment on function public.provision_investor_account(
  uuid, text, text, text, public.investor_type, text, text, text, text, text, text, text, text
) is 'Atomically creates the domain half of an investor account. Service-role only.';

-- -----------------------------------------------------------------------------
-- Investor lifecycle transitions, performed by an admin
--
-- A SECURITY INVOKER function so RLS still applies: it is a convenience that
-- keeps the status change, the reason and the relationship-manager assignment
-- in one statement, not a way around the policies.
-- -----------------------------------------------------------------------------
create or replace function public.transition_investor(
  p_investor_id uuid,
  p_to_status public.investor_status,
  p_reason text default null
)
returns public.investor_status
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_status public.investor_status;
begin
  select status into current_status from public.investors where id = p_investor_id;

  if current_status is null then
    -- Either the investor does not exist, or the caller cannot see it. Both
    -- report the same thing: telling them apart would confirm which ids exist.
    raise exception 'Investor not found.' using errcode = 'P0002';
  end if;

  update public.investors
  set status = p_to_status,
      rejection_reason = case when p_to_status = 'rejected' then p_reason else rejection_reason end
  where id = p_investor_id;

  return p_to_status;
end;
$$;

grant execute on function public.transition_investor(uuid, public.investor_status, text)
  to authenticated;
