-- Rejected investor applications are terminal and retained for at most 72 hours.
-- A scheduled Edge Function performs the destructive purge because deleting an
-- Auth user and private Storage object requires the service-role API. Database
-- invariants here make the candidate set deterministic and auditable.

alter table public.investors
  add column if not exists rejected_at timestamptz;

comment on table public.investors is
  'Investor records are retained for approved, active, and inactive investors. Rejected pre-investment applicants may be purged after 72 hours when no ownership or financial references exist.';

-- Backfill any pre-existing rejected rows from their durable status history,
-- falling back to the row update timestamp for legacy data.
update public.investors i
set rejected_at = coalesce(
  (
    select max(h.created_at)
    from public.investor_status_history h
    where h.investor_id = i.id
      and h.to_status = 'rejected'
  ),
  i.updated_at,
  now()
)
where i.status = 'rejected'
  and i.rejected_at is null;

create index if not exists investors_rejected_retention_idx
  on public.investors (rejected_at, id)
  where status = 'rejected';

alter table public.investors
  drop constraint if exists investors_rejected_at_required;
alter table public.investors
  add constraint investors_rejected_at_required
  check (status <> 'rejected' or rejected_at is not null);

create or replace function app.investor_transition_allowed(
  p_from public.investor_status,
  p_to public.investor_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'prospective' then p_to = 'submitted'
    when 'submitted' then p_to in ('under_review', 'rejected')
    when 'under_review' then p_to in ('approved', 'rejected')
    when 'approved' then p_to in ('active', 'rejected')
    when 'active' then p_to = 'inactive'
    when 'inactive' then p_to = 'active'
    when 'rejected' then false
    else false
  end;
$$;

create or replace function app.investor_status_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    -- Rejection time is immutable once stamped by the database.
    if old.status = 'rejected' then
      new.rejected_at := old.rejected_at;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and not app.investor_transition_allowed(old.status, new.status) then
    raise exception 'Investor status cannot move from % to %.', old.status, new.status
      using errcode = '23514';
  end if;

  -- Lifecycle timestamps are database-owned so clients cannot back-date them.
  if new.status = 'submitted' then new.applied_at := coalesce(new.applied_at, now()); end if;
  if new.status = 'under_review' then new.reviewed_at := now(); end if;
  if new.status = 'approved' then new.approved_at := now(); end if;
  if new.status = 'rejected' then new.rejected_at := now(); end if;
  if new.status = 'active' then new.activated_at := coalesce(new.activated_at, now()); end if;
  if new.status = 'inactive' then new.deactivated_at := now(); end if;

  return new;
end;
$$;

-- The destructive worker and integration tests share one database-owned blocker
-- contract so a future table/policy change cannot silently weaken purge safety.
create or replace function app.rejected_investor_purge_blockers(p_investor_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when exists (
      select 1 from public.ownership_holdings h where h.investor_id = p_investor_id
    ) then 'ownership_holdings' end,
    case when exists (
      select 1 from public.ownership_inheritance i where i.current_investor_id = p_investor_id
    ) then 'ownership_inheritance' end,
    case when exists (
      select 1
      from public.ownership_transfers t
      where t.from_investor_id = p_investor_id or t.to_investor_id = p_investor_id
    ) then 'ownership_transfers' end,
    case when exists (
      select 1 from public.profit_distribution_allocations a where a.investor_id = p_investor_id
    ) then 'profit_distribution_allocations' end,
    case when exists (
      select 1 from public.profit_distribution_payment_proofs p where p.investor_id = p_investor_id
    ) then 'profit_distribution_payment_proofs' end
  ]::text[], null);
$$;

create or replace function app.list_rejected_investor_purge_candidates(p_limit integer default 50)
returns table (
  id uuid,
  reference_code text,
  rejected_at timestamptz,
  ktp_storage_bucket text,
  ktp_storage_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.reference_code,
    i.rejected_at,
    i.ktp_storage_bucket,
    i.ktp_storage_path
  from public.investors i
  where i.status = 'rejected'
    and i.rejected_at is not null
    and i.rejected_at <= now() - interval '72 hours'
  order by i.rejected_at asc, i.id asc
  limit greatest(1, least(coalesce(p_limit, 50), 50));
$$;

revoke all on function app.rejected_investor_purge_blockers(uuid) from public;
revoke all on function app.rejected_investor_purge_blockers(uuid) from anon;
revoke all on function app.rejected_investor_purge_blockers(uuid) from authenticated;
grant execute on function app.rejected_investor_purge_blockers(uuid) to service_role;

revoke all on function app.list_rejected_investor_purge_candidates(integer) from public;
revoke all on function app.list_rejected_investor_purge_candidates(integer) from anon;
revoke all on function app.list_rejected_investor_purge_candidates(integer) from authenticated;
grant execute on function app.list_rejected_investor_purge_candidates(integer) to service_role;

-- Service-role-only helper used by the Edge Function to validate the scheduler
-- bearer token against Supabase Vault. The secret value never appears in Git.
create or replace function app.authorize_rejected_purge_scheduler(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from vault.decrypted_secrets s
      where s.name = 'rejected_purge_scheduler_secret'
        and length(coalesce(p_token, '')) >= 32
        and s.decrypted_secret = p_token
    ),
    false
  );
$$;

revoke all on function app.authorize_rejected_purge_scheduler(text) from public;
revoke all on function app.authorize_rejected_purge_scheduler(text) from anon;
revoke all on function app.authorize_rejected_purge_scheduler(text) from authenticated;
grant execute on function app.authorize_rejected_purge_scheduler(text) to service_role;

-- The scheduler is intentionally conditional. Local/CI environments do not
-- carry production Vault configuration. Production provisions the two named
-- secrets before this migration is applied, then the same migration schedules
-- the job without committing either value.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  v_has_url boolean;
  v_has_secret boolean;
  v_existing_job bigint;
begin
  select exists (
    select 1 from vault.secrets where name = 'rejected_purge_project_url'
  ) into v_has_url;

  select exists (
    select 1 from vault.secrets where name = 'rejected_purge_scheduler_secret'
  ) into v_has_secret;

  if not (v_has_url and v_has_secret) then
    raise notice 'Rejected investor purge cron not scheduled: Vault secrets are not provisioned in this environment.';
    return;
  end if;

  select jobid
  into v_existing_job
  from cron.job
  where jobname = 'purge-rejected-investors'
  limit 1;

  if v_existing_job is not null then
    perform cron.unschedule(v_existing_job);
  end if;

  perform cron.schedule(
    'purge-rejected-investors',
    '17 * * * *',
    $cron$
      select net.http_post(
        url := (
          select decrypted_secret || '/functions/v1/purge-rejected-investors'
          from vault.decrypted_secrets
          where name = 'rejected_purge_project_url'
          limit 1
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'rejected_purge_scheduler_secret'
            limit 1
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $cron$
  );
end;
$$;
