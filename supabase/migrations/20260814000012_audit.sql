-- =============================================================================
-- Audit log
--
-- The business-level record of who did what. Append-only by construction: there
-- is an INSERT policy and a SELECT policy, and no UPDATE or DELETE policy for
-- any role — plus a trigger that raises, so even a role with BYPASSRLS cannot
-- quietly rewrite history.
--
-- See docs/DATABASE.md §10.
-- =============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_id uuid references public.user_accounts (id) on delete set null,
  actor_type text not null default 'system',
  -- Denormalised so the record stays meaningful after an account is removed.
  actor_label text,

  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null default '',

  -- Before/after for changed fields only. Never contains secrets, tokens or
  -- signed URLs (docs/SECURITY.md §9).
  changes jsonb not null default '{}'::jsonb,

  ip_hash text,
  user_agent text,
  correlation_id text,

  created_at timestamptz not null default now(),

  constraint audit_logs_action_shape check (action ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  constraint audit_logs_actor_type_valid check (actor_type in ('admin', 'investor', 'system', 'anonymous')),
  constraint audit_logs_changes_object check (jsonb_typeof(changes) = 'object')
);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);
create index audit_logs_action_idx
  on public.audit_logs (action, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

comment on table public.audit_logs is
  'Append-only. No UPDATE or DELETE path exists for any role, including Super Admin.';

create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function app.forbid_mutation();

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

revoke all on public.audit_logs from anon, authenticated;
grant select, insert on public.audit_logs to authenticated;

-- Any authenticated principal may append. Restricting inserts would mean an
-- action performed by a low-privilege caller could not be recorded, which is
-- precisely the action most worth recording. The row's actor is pinned to the
-- session below, so a caller cannot forge one.
create policy audit_logs_insert
  on public.audit_logs for insert to authenticated
  with check (actor_id is not distinct from app.current_user_id());

create policy audit_logs_select
  on public.audit_logs for select to authenticated
  using (app.has_permission('audit_logs.view'));

-- An investor may see the trail on their own record — transparency is part of
-- the product, and it is their data.
create policy audit_logs_select_own_investor
  on public.audit_logs for select to authenticated
  using (
    entity_type = 'investor'
    and entity_id = app.current_user_id()
  );
