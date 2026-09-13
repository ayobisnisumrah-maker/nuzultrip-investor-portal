-- =============================================================================
-- D05 Reserved Matters + D04 Conflict of Interest governance foundation
--
-- Policy posture:
-- - no quorum, approval count, or materiality threshold is invented here;
-- - a rule remains draft until an authorised administrator explicitly configures
--   the decision thresholds and activates it;
-- - controlled actions are fail-closed when no active rule exists;
-- - reserved-matter decisions are append-only evidence;
-- - disclosed conflicts are independently reviewed and confirmed conflicts force
--   recusal; a conflicted administrator cannot decide or finalise the matter;
-- - direct authenticated table mutation is not exposed. State changes go through
--   SECURITY DEFINER RPCs with explicit permission checks.
--
-- This migration establishes the canonical governance domain and reusable DB
-- authorisation gate. Individual controlled business RPCs must call
-- app.require_reserved_matter_authorization(...) and atomically consume the
-- returned authorisation before D05 can be considered enforced for that action.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RBAC catalogue
-- -----------------------------------------------------------------------------
insert into public.permissions (key, module, action, description, is_dangerous)
values
  ('reserved_matters.view', 'reserved_matters', 'view', 'Melihat aturan dan perkara Reserved Matters.', false),
  ('reserved_matters.configure', 'reserved_matters', 'configure', 'Mengonfigurasi dan mengaktifkan aturan Reserved Matters.', true),
  ('reserved_matters.create', 'reserved_matters', 'create', 'Membuat perkara Reserved Matters.', false),
  ('reserved_matters.submit', 'reserved_matters', 'submit', 'Mengirim perkara Reserved Matters untuk keputusan.', false),
  ('reserved_matters.decide', 'reserved_matters', 'decide', 'Memberikan dan memfinalkan keputusan Reserved Matters.', true),
  ('reserved_matters.cancel', 'reserved_matters', 'cancel', 'Membatalkan perkara Reserved Matters yang belum final.', true),
  ('reserved_matters.execute', 'reserved_matters', 'execute', 'Mengonsumsi persetujuan Reserved Matters untuk tindakan terkendali.', true),
  ('conflicts.view', 'conflicts', 'view', 'Melihat register konflik kepentingan.', false),
  ('conflicts.disclose', 'conflicts', 'disclose', 'Mengungkapkan konflik kepentingan pada perkara Reserved Matters.', false),
  ('conflicts.resolve', 'conflicts', 'resolve', 'Meninjau dan menyelesaikan pengungkapan konflik kepentingan.', true)
on conflict (key) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description,
  is_dangerous = excluded.is_dangerous;

-- -----------------------------------------------------------------------------
-- Canonical tables
-- -----------------------------------------------------------------------------
create table public.governance_rules (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version integer not null default 1,
  name text not null,
  description text not null default '',
  controlled_action text not null,
  quorum_count integer,
  required_approvals integer,
  approval_ratio_pct numeric(5,2),
  status text not null default 'draft',
  supersedes_rule_id uuid references public.governance_rules (id) on delete restrict,
  created_by uuid not null references public.admins (id) on delete restrict,
  activated_by uuid references public.admins (id) on delete restrict,
  activated_at timestamptz,
  retired_by uuid references public.admins (id) on delete restrict,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint governance_rules_key_shape check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint governance_rules_action_shape check (controlled_action ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  constraint governance_rules_version_positive check (version > 0),
  constraint governance_rules_name_not_blank check (length(btrim(name)) > 0),
  constraint governance_rules_status_valid check (status in ('draft', 'active', 'retired')),
  constraint governance_rules_quorum_positive check (quorum_count is null or quorum_count > 0),
  constraint governance_rules_approvals_positive check (required_approvals is null or required_approvals > 0),
  constraint governance_rules_ratio_valid check (
    approval_ratio_pct is null or (approval_ratio_pct > 0 and approval_ratio_pct <= 100)
  ),
  constraint governance_rules_thresholds_consistent check (
    quorum_count is null
    or required_approvals is null
    or required_approvals <= quorum_count
  ),
  constraint governance_rules_active_complete check (
    status <> 'active'
    or (
      quorum_count is not null
      and required_approvals is not null
      and approval_ratio_pct is not null
      and activated_by is not null
      and activated_at is not null
      and retired_by is null
      and retired_at is null
    )
  ),
  constraint governance_rules_retired_complete check (
    status <> 'retired'
    or (retired_by is not null and retired_at is not null)
  ),
  constraint governance_rules_key_version_unique unique (key, version)
);

create unique index governance_rules_one_active_action_idx
  on public.governance_rules (controlled_action)
  where status = 'active';
create index governance_rules_status_idx
  on public.governance_rules (status, controlled_action);

create trigger governance_rules_set_updated_at
  before update on public.governance_rules
  for each row execute function app.set_updated_at();

create table public.reserved_matters (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.governance_rules (id) on delete restrict,
  title text not null,
  summary text not null default '',
  subject_entity_type text not null,
  subject_entity_id uuid not null,
  status text not null default 'draft',
  requested_by uuid not null references public.admins (id) on delete restrict,
  submitted_by uuid references public.admins (id) on delete restrict,
  submitted_at timestamptz,
  finalised_by uuid references public.admins (id) on delete restrict,
  finalised_at timestamptz,
  final_decision_note text,
  executed_by uuid references public.admins (id) on delete restrict,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reserved_matters_title_not_blank check (length(btrim(title)) > 0),
  constraint reserved_matters_entity_type_shape check (subject_entity_type ~ '^[a-z][a-z0-9_]*$'),
  constraint reserved_matters_status_valid check (
    status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'executed')
  ),
  constraint reserved_matters_submission_consistent check (
    (status = 'draft' and submitted_by is null and submitted_at is null)
    or status <> 'draft'
  ),
  constraint reserved_matters_final_consistent check (
    status not in ('approved', 'rejected', 'executed')
    or (finalised_by is not null and finalised_at is not null)
  ),
  constraint reserved_matters_execution_consistent check (
    status <> 'executed'
    or (executed_by is not null and executed_at is not null)
  )
);

create index reserved_matters_subject_idx
  on public.reserved_matters (subject_entity_type, subject_entity_id, created_at desc);
create index reserved_matters_status_idx
  on public.reserved_matters (status, created_at desc);
create unique index reserved_matters_one_open_approved_authorisation_idx
  on public.reserved_matters (rule_id, subject_entity_type, subject_entity_id)
  where status = 'approved';

create trigger reserved_matters_set_updated_at
  before update on public.reserved_matters
  for each row execute function app.set_updated_at();

create table public.conflict_disclosures (
  id uuid primary key default gen_random_uuid(),
  reserved_matter_id uuid not null references public.reserved_matters (id) on delete restrict,
  admin_id uuid not null references public.admins (id) on delete restrict,
  conflict_type text not null,
  details text not null,
  status text not null default 'declared',
  restriction text not null default 'pending_review',
  reviewed_by uuid references public.admins (id) on delete restrict,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conflict_disclosures_type_valid check (conflict_type in ('actual', 'potential', 'perceived')),
  constraint conflict_disclosures_details_not_blank check (length(btrim(details)) > 0),
  constraint conflict_disclosures_status_valid check (status in ('declared', 'confirmed', 'cleared')),
  constraint conflict_disclosures_restriction_valid check (restriction in ('pending_review', 'none', 'recused')),
  constraint conflict_disclosures_independent_review check (reviewed_by is null or reviewed_by <> admin_id),
  constraint conflict_disclosures_resolution_consistent check (
    (status = 'declared' and reviewed_by is null and reviewed_at is null and restriction = 'pending_review')
    or (status = 'confirmed' and reviewed_by is not null and reviewed_at is not null and restriction = 'recused')
    or (status = 'cleared' and reviewed_by is not null and reviewed_at is not null and restriction = 'none')
  ),
  constraint conflict_disclosures_unique_admin_matter unique (reserved_matter_id, admin_id)
);

create index conflict_disclosures_matter_idx
  on public.conflict_disclosures (reserved_matter_id, status, created_at desc);
create index conflict_disclosures_admin_idx
  on public.conflict_disclosures (admin_id, created_at desc);

create trigger conflict_disclosures_set_updated_at
  before update on public.conflict_disclosures
  for each row execute function app.set_updated_at();

create table public.reserved_matter_decisions (
  id uuid primary key default gen_random_uuid(),
  reserved_matter_id uuid not null references public.reserved_matters (id) on delete restrict,
  admin_id uuid not null references public.admins (id) on delete restrict,
  decision text not null,
  rationale text not null default '',
  created_at timestamptz not null default now(),

  constraint reserved_matter_decisions_valid check (decision in ('approve', 'reject', 'abstain')),
  constraint reserved_matter_decisions_unique_admin_matter unique (reserved_matter_id, admin_id)
);

create index reserved_matter_decisions_matter_idx
  on public.reserved_matter_decisions (reserved_matter_id, created_at);

create trigger reserved_matter_decisions_append_only
  before update or delete on public.reserved_matter_decisions
  for each row execute function app.forbid_mutation();

comment on table public.governance_rules is
  'Versioned Reserved Matters decision rules. No threshold is active until explicitly configured and activated.';
comment on table public.reserved_matters is
  'Canonical Reserved Matters cases linked to a controlled business action and subject entity.';
comment on table public.conflict_disclosures is
  'D04 conflict register for Reserved Matters. Confirmed conflicts force recusal.';
comment on table public.reserved_matter_decisions is
  'Append-only approval/rejection/abstention evidence for Reserved Matters.';

-- -----------------------------------------------------------------------------
-- Guard rule version history against silent rewriting.
-- Draft rules may be edited. Active rules may only transition to retired while
-- preserving the decision configuration. Retired rules are fully immutable.
-- -----------------------------------------------------------------------------
create or replace function app.guard_governance_rule_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'retired' then
    raise exception 'Aturan governance yang telah retired bersifat immutable.' using errcode = '55000';
  end if;

  if old.status = 'active' then
    if new.status <> 'retired'
       or new.key is distinct from old.key
       or new.version is distinct from old.version
       or new.name is distinct from old.name
       or new.description is distinct from old.description
       or new.controlled_action is distinct from old.controlled_action
       or new.quorum_count is distinct from old.quorum_count
       or new.required_approvals is distinct from old.required_approvals
       or new.approval_ratio_pct is distinct from old.approval_ratio_pct
       or new.supersedes_rule_id is distinct from old.supersedes_rule_id
       or new.created_by is distinct from old.created_by
       or new.activated_by is distinct from old.activated_by
       or new.activated_at is distinct from old.activated_at then
      raise exception 'Aturan governance aktif tidak boleh ditulis ulang; buat versi baru.' using errcode = '55000';
    end if;
  end if;

  return new;
end;
$$;

create trigger governance_rules_history_guard
  before update on public.governance_rules
  for each row execute function app.guard_governance_rule_history();

revoke execute on function app.guard_governance_rule_history() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS and privileges
-- -----------------------------------------------------------------------------
alter table public.governance_rules enable row level security;
alter table public.governance_rules force row level security;
alter table public.reserved_matters enable row level security;
alter table public.reserved_matters force row level security;
alter table public.conflict_disclosures enable row level security;
alter table public.conflict_disclosures force row level security;
alter table public.reserved_matter_decisions enable row level security;
alter table public.reserved_matter_decisions force row level security;

revoke all on public.governance_rules from anon, authenticated;
revoke all on public.reserved_matters from anon, authenticated;
revoke all on public.conflict_disclosures from anon, authenticated;
revoke all on public.reserved_matter_decisions from anon, authenticated;

grant select on public.governance_rules to authenticated;
grant select on public.reserved_matters to authenticated;
grant select on public.conflict_disclosures to authenticated;
grant select on public.reserved_matter_decisions to authenticated;

grant all on public.governance_rules to service_role;
grant all on public.reserved_matters to service_role;
grant all on public.conflict_disclosures to service_role;
grant all on public.reserved_matter_decisions to service_role;

create policy governance_rules_read
  on public.governance_rules for select to authenticated
  using (app.has_permission('reserved_matters.view'));

create policy reserved_matters_read
  on public.reserved_matters for select to authenticated
  using (app.has_permission('reserved_matters.view'));

create policy conflict_disclosures_read
  on public.conflict_disclosures for select to authenticated
  using (
    app.has_permission('conflicts.view')
    or admin_id = app.current_user_id()
  );

create policy reserved_matter_decisions_read
  on public.reserved_matter_decisions for select to authenticated
  using (app.has_permission('reserved_matters.view'));

-- -----------------------------------------------------------------------------
-- Rule lifecycle
-- -----------------------------------------------------------------------------
create or replace function app.create_governance_rule(
  p_key text,
  p_name text,
  p_description text,
  p_controlled_action text,
  p_quorum_count integer default null,
  p_required_approvals integer default null,
  p_approval_ratio_pct numeric default null,
  p_supersedes_rule_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_version integer;
  v_id uuid;
begin
  if not app.has_permission('reserved_matters.configure') then
    raise exception 'Anda tidak memiliki izin untuk mengonfigurasi Reserved Matters.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_key, ''))) = 0
     or length(btrim(coalesce(p_name, ''))) = 0
     or length(btrim(coalesce(p_controlled_action, ''))) = 0 then
    raise exception 'Key, nama, dan controlled action wajib diisi.' using errcode = '22023';
  end if;

  select coalesce(max(gr.version), 0) + 1
  into v_version
  from public.governance_rules gr
  where gr.key = btrim(p_key);

  insert into public.governance_rules (
    key, version, name, description, controlled_action,
    quorum_count, required_approvals, approval_ratio_pct,
    supersedes_rule_id, created_by
  )
  values (
    btrim(p_key), v_version, btrim(p_name), coalesce(p_description, ''), btrim(p_controlled_action),
    p_quorum_count, p_required_approvals, p_approval_ratio_pct,
    p_supersedes_rule_id, v_actor
  )
  returning id into v_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'reserved_matters.configure', 'governance_rule', v_id,
    'Membuat versi aturan Reserved Matters.',
    jsonb_build_object('key', btrim(p_key), 'version', v_version, 'controlled_action', btrim(p_controlled_action))
  );

  return v_id;
end;
$$;

create or replace function app.activate_governance_rule(p_rule_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_rule public.governance_rules;
begin
  if not app.has_permission('reserved_matters.configure') then
    raise exception 'Anda tidak memiliki izin untuk mengaktifkan aturan Reserved Matters.' using errcode = '42501';
  end if;

  select gr.* into v_rule
  from public.governance_rules gr
  where gr.id = p_rule_id
  for update;

  if not found then
    raise exception 'Aturan Reserved Matters tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_rule.status <> 'draft' then
    raise exception 'Hanya aturan draft yang dapat diaktifkan.' using errcode = '22023';
  end if;

  if v_rule.quorum_count is null
     or v_rule.required_approvals is null
     or v_rule.approval_ratio_pct is null then
    raise exception 'Threshold quorum, jumlah approval, dan rasio approval wajib disahkan sebelum aktivasi.' using errcode = '22023';
  end if;

  update public.governance_rules
  set
    status = 'retired',
    retired_by = v_actor,
    retired_at = now()
  where controlled_action = v_rule.controlled_action
    and status = 'active';

  update public.governance_rules
  set
    status = 'active',
    activated_by = v_actor,
    activated_at = now()
  where id = p_rule_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'reserved_matters.configure', 'governance_rule', p_rule_id,
    'Mengaktifkan aturan Reserved Matters.',
    jsonb_build_object(
      'controlled_action', v_rule.controlled_action,
      'quorum_count', v_rule.quorum_count,
      'required_approvals', v_rule.required_approvals,
      'approval_ratio_pct', v_rule.approval_ratio_pct
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Matter lifecycle
-- -----------------------------------------------------------------------------
create or replace function app.create_reserved_matter(
  p_rule_id uuid,
  p_title text,
  p_summary text,
  p_subject_entity_type text,
  p_subject_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_rule public.governance_rules;
  v_id uuid;
begin
  if not app.has_permission('reserved_matters.create') then
    raise exception 'Anda tidak memiliki izin untuk membuat Reserved Matter.' using errcode = '42501';
  end if;

  select gr.* into v_rule
  from public.governance_rules gr
  where gr.id = p_rule_id;

  if not found then
    raise exception 'Aturan Reserved Matters tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_rule.status <> 'active' then
    raise exception 'Reserved Matter hanya dapat dibuat dari aturan aktif.' using errcode = '22023';
  end if;

  insert into public.reserved_matters (
    rule_id, title, summary, subject_entity_type, subject_entity_id, requested_by
  )
  values (
    p_rule_id, btrim(p_title), coalesce(p_summary, ''), btrim(p_subject_entity_type), p_subject_entity_id, v_actor
  )
  returning id into v_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'reserved_matters.create', 'reserved_matter', v_id,
    'Membuat perkara Reserved Matters.',
    jsonb_build_object('rule_id', p_rule_id, 'subject_entity_type', btrim(p_subject_entity_type), 'subject_entity_id', p_subject_entity_id)
  );

  return v_id;
end;
$$;

create or replace function app.submit_reserved_matter(p_matter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_matter public.reserved_matters;
begin
  if not app.has_permission('reserved_matters.submit') then
    raise exception 'Anda tidak memiliki izin untuk mengirim Reserved Matter.' using errcode = '42501';
  end if;

  select rm.* into v_matter
  from public.reserved_matters rm
  where rm.id = p_matter_id
  for update;

  if not found then
    raise exception 'Reserved Matter tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_matter.status <> 'draft' then
    raise exception 'Hanya Reserved Matter draft yang dapat dikirim.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.governance_rules gr
    where gr.id = v_matter.rule_id and gr.status = 'active'
  ) then
    raise exception 'Aturan Reserved Matter tidak lagi aktif.' using errcode = '55000';
  end if;

  update public.reserved_matters
  set status = 'submitted', submitted_by = v_actor, submitted_at = now()
  where id = p_matter_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary)
  values (v_actor, app.current_actor_type(), 'reserved_matters.submit', 'reserved_matter', p_matter_id, 'Mengirim Reserved Matter untuk keputusan.');
end;
$$;

create or replace function app.cancel_reserved_matter(p_matter_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_matter public.reserved_matters;
begin
  if not app.has_permission('reserved_matters.cancel') then
    raise exception 'Anda tidak memiliki izin untuk membatalkan Reserved Matter.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Alasan pembatalan wajib diisi.' using errcode = '22023';
  end if;

  select rm.* into v_matter
  from public.reserved_matters rm
  where rm.id = p_matter_id
  for update;

  if not found then
    raise exception 'Reserved Matter tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_matter.status not in ('draft', 'submitted') then
    raise exception 'Reserved Matter pada status ini tidak dapat dibatalkan.' using errcode = '22023';
  end if;

  update public.reserved_matters
  set status = 'cancelled', final_decision_note = btrim(p_reason)
  where id = p_matter_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'reserved_matters.cancel', 'reserved_matter', p_matter_id,
    'Membatalkan Reserved Matter.', jsonb_build_object('reason', btrim(p_reason))
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- D04 disclosure and independent conflict review
-- -----------------------------------------------------------------------------
create or replace function app.disclose_reserved_matter_conflict(
  p_matter_id uuid,
  p_conflict_type text,
  p_details text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_matter public.reserved_matters;
  v_id uuid;
begin
  if not app.has_permission('conflicts.disclose') then
    raise exception 'Anda tidak memiliki izin untuk mengungkapkan konflik kepentingan.' using errcode = '42501';
  end if;

  select rm.* into v_matter
  from public.reserved_matters rm
  where rm.id = p_matter_id;

  if not found then
    raise exception 'Reserved Matter tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_matter.status not in ('draft', 'submitted') then
    raise exception 'Konflik hanya dapat diungkapkan sebelum Reserved Matter difinalkan.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.reserved_matter_decisions d
    where d.reserved_matter_id = p_matter_id and d.admin_id = v_actor
  ) then
    raise exception 'Konflik harus diungkapkan sebelum administrator memberikan keputusan.' using errcode = '55000';
  end if;

  insert into public.conflict_disclosures (
    reserved_matter_id, admin_id, conflict_type, details
  )
  values (p_matter_id, v_actor, p_conflict_type, btrim(p_details))
  returning id into v_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'conflicts.disclose', 'conflict_disclosure', v_id,
    'Mengungkapkan konflik kepentingan pada Reserved Matter.',
    jsonb_build_object('reserved_matter_id', p_matter_id, 'conflict_type', p_conflict_type)
  );

  return v_id;
end;
$$;

create or replace function app.resolve_reserved_matter_conflict(
  p_disclosure_id uuid,
  p_resolution text,
  p_resolution_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_disclosure public.conflict_disclosures;
begin
  if not app.has_permission('conflicts.resolve') then
    raise exception 'Anda tidak memiliki izin untuk menyelesaikan konflik kepentingan.' using errcode = '42501';
  end if;

  if p_resolution not in ('confirmed', 'cleared') then
    raise exception 'Resolusi konflik harus confirmed atau cleared.' using errcode = '22023';
  end if;

  select cd.* into v_disclosure
  from public.conflict_disclosures cd
  where cd.id = p_disclosure_id
  for update;

  if not found then
    raise exception 'Pengungkapan konflik tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_disclosure.status <> 'declared' then
    raise exception 'Pengungkapan konflik ini sudah ditinjau.' using errcode = '22023';
  end if;

  if v_disclosure.admin_id = v_actor then
    raise exception 'Pihak yang mengungkapkan konflik tidak boleh meninjau konfliknya sendiri.' using errcode = '42501';
  end if;

  if p_resolution = 'confirmed' and exists (
    select 1 from public.reserved_matter_decisions d
    where d.reserved_matter_id = v_disclosure.reserved_matter_id
      and d.admin_id = v_disclosure.admin_id
  ) then
    raise exception 'Konflik ditemukan setelah keputusan tercatat; batalkan dan ajukan ulang perkara agar bukti keputusan tetap immutable.' using errcode = '55000';
  end if;

  update public.conflict_disclosures
  set
    status = p_resolution,
    restriction = case when p_resolution = 'confirmed' then 'recused' else 'none' end,
    reviewed_by = v_actor,
    reviewed_at = now(),
    resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), '')
  where id = p_disclosure_id;

  if p_resolution = 'confirmed' then
    insert into public.reserved_matter_decisions (
      reserved_matter_id, admin_id, decision, rationale
    )
    values (
      v_disclosure.reserved_matter_id,
      v_disclosure.admin_id,
      'abstain',
      'Abstain otomatis karena konflik kepentingan dikonfirmasi dan pihak diwajibkan recusal.'
    );
  end if;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'conflicts.resolve', 'conflict_disclosure', p_disclosure_id,
    'Menyelesaikan peninjauan konflik kepentingan.',
    jsonb_build_object('resolution', p_resolution, 'restriction', case when p_resolution = 'confirmed' then 'recused' else 'none' end)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Decision evidence and finalisation
-- -----------------------------------------------------------------------------
create or replace function app.record_reserved_matter_decision(
  p_matter_id uuid,
  p_decision text,
  p_rationale text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_matter public.reserved_matters;
  v_id uuid;
begin
  if not app.has_permission('reserved_matters.decide') then
    raise exception 'Anda tidak memiliki izin untuk memberikan keputusan Reserved Matter.' using errcode = '42501';
  end if;

  if p_decision not in ('approve', 'reject', 'abstain') then
    raise exception 'Keputusan harus approve, reject, atau abstain.' using errcode = '22023';
  end if;

  select rm.* into v_matter
  from public.reserved_matters rm
  where rm.id = p_matter_id
  for update;

  if not found then
    raise exception 'Reserved Matter tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_matter.status <> 'submitted' then
    raise exception 'Keputusan hanya dapat diberikan pada Reserved Matter yang sudah submitted.' using errcode = '22023';
  end if;

  if v_matter.requested_by = v_actor then
    raise exception 'Pengusul Reserved Matter tidak boleh memberikan keputusan pada perkaranya sendiri.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.conflict_disclosures cd
    where cd.reserved_matter_id = p_matter_id
      and cd.admin_id = v_actor
      and cd.status <> 'cleared'
  ) then
    raise exception 'Administrator dengan konflik yang belum cleared atau telah dikonfirmasi tidak boleh memberikan keputusan.' using errcode = '42501';
  end if;

  insert into public.reserved_matter_decisions (
    reserved_matter_id, admin_id, decision, rationale
  )
  values (p_matter_id, v_actor, p_decision, coalesce(p_rationale, ''))
  returning id into v_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'reserved_matters.decide', 'reserved_matter_decision', v_id,
    'Mencatat keputusan Reserved Matter.',
    jsonb_build_object('reserved_matter_id', p_matter_id, 'decision', p_decision)
  );

  return v_id;
end;
$$;

create or replace function app.finalise_reserved_matter(
  p_matter_id uuid,
  p_outcome text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_matter public.reserved_matters;
  v_rule public.governance_rules;
  v_approvals integer;
  v_rejections integer;
  v_votes integer;
  v_ratio numeric;
begin
  if not app.has_permission('reserved_matters.decide') then
    raise exception 'Anda tidak memiliki izin untuk memfinalkan Reserved Matter.' using errcode = '42501';
  end if;

  if p_outcome not in ('approved', 'rejected') then
    raise exception 'Outcome final harus approved atau rejected.' using errcode = '22023';
  end if;

  select rm.* into v_matter
  from public.reserved_matters rm
  where rm.id = p_matter_id
  for update;

  if not found then
    raise exception 'Reserved Matter tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_matter.status <> 'submitted' then
    raise exception 'Hanya Reserved Matter submitted yang dapat difinalkan.' using errcode = '22023';
  end if;

  if v_matter.requested_by = v_actor then
    raise exception 'Pengusul Reserved Matter tidak boleh memfinalkan perkaranya sendiri.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.conflict_disclosures cd
    where cd.reserved_matter_id = p_matter_id
      and cd.admin_id = v_actor
      and cd.status <> 'cleared'
  ) then
    raise exception 'Administrator dengan konflik yang belum cleared atau telah dikonfirmasi tidak boleh memfinalkan perkara.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.conflict_disclosures cd
    where cd.reserved_matter_id = p_matter_id
      and cd.status = 'declared'
  ) then
    raise exception 'Semua disclosure konflik wajib ditinjau sebelum Reserved Matter difinalkan.' using errcode = '55000';
  end if;

  select gr.* into v_rule
  from public.governance_rules gr
  where gr.id = v_matter.rule_id;

  if not found or v_rule.status <> 'active' then
    raise exception 'Aturan Reserved Matter tidak aktif; finalisasi ditolak secara fail-closed.' using errcode = '55000';
  end if;

  select
    count(*) filter (where d.decision = 'approve')::int,
    count(*) filter (where d.decision = 'reject')::int
  into v_approvals, v_rejections
  from public.reserved_matter_decisions d
  where d.reserved_matter_id = p_matter_id;

  v_votes := coalesce(v_approvals, 0) + coalesce(v_rejections, 0);
  v_ratio := case when v_votes = 0 then 0 else (v_approvals::numeric * 100) / v_votes end;

  if v_votes < v_rule.quorum_count then
    raise exception 'Quorum Reserved Matter belum terpenuhi.' using errcode = '55000';
  end if;

  if p_outcome = 'approved' then
    if v_approvals < v_rule.required_approvals or v_ratio < v_rule.approval_ratio_pct then
      raise exception 'Threshold persetujuan Reserved Matter belum terpenuhi.' using errcode = '55000';
    end if;
  else
    if v_approvals >= v_rule.required_approvals and v_ratio >= v_rule.approval_ratio_pct then
      raise exception 'Perkara telah memenuhi threshold persetujuan dan tidak dapat difinalkan sebagai rejected.' using errcode = '55000';
    end if;
  end if;

  update public.reserved_matters
  set
    status = p_outcome,
    finalised_by = v_actor,
    finalised_at = now(),
    final_decision_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_matter_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary, changes)
  values (
    v_actor, app.current_actor_type(), 'reserved_matters.decide', 'reserved_matter', p_matter_id,
    'Memfinalkan Reserved Matter.',
    jsonb_build_object('outcome', p_outcome, 'approvals', v_approvals, 'rejections', v_rejections, 'approval_ratio_pct', v_ratio)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Fail-closed reusable execution gate.
--
-- This function does not execute business logic. Controlled domain RPCs call it
-- inside their transaction, perform the business mutation, then call
-- app.consume_reserved_matter_authorization(...). If business mutation fails,
-- the transaction rolls back and the authorisation remains unconsumed.
-- -----------------------------------------------------------------------------
create or replace function app.require_reserved_matter_authorization(
  p_controlled_action text,
  p_subject_entity_type text,
  p_subject_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule_id uuid;
  v_matter_id uuid;
begin
  select gr.id into v_rule_id
  from public.governance_rules gr
  where gr.controlled_action = p_controlled_action
    and gr.status = 'active';

  if v_rule_id is null then
    raise exception 'Controlled action % tidak memiliki aturan Reserved Matters aktif; eksekusi ditolak.', p_controlled_action
      using errcode = '55000';
  end if;

  select rm.id into v_matter_id
  from public.reserved_matters rm
  where rm.rule_id = v_rule_id
    and rm.subject_entity_type = p_subject_entity_type
    and rm.subject_entity_id = p_subject_entity_id
    and rm.status = 'approved'
  order by rm.finalised_at desc
  limit 1
  for update;

  if v_matter_id is null then
    raise exception 'Persetujuan Reserved Matters yang valid belum tersedia untuk controlled action %.', p_controlled_action
      using errcode = '55000';
  end if;

  return v_matter_id;
end;
$$;

create or replace function app.consume_reserved_matter_authorization(p_matter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_matter public.reserved_matters;
begin
  if not app.has_permission('reserved_matters.execute') then
    raise exception 'Anda tidak memiliki izin untuk mengeksekusi controlled action Reserved Matters.' using errcode = '42501';
  end if;

  select rm.* into v_matter
  from public.reserved_matters rm
  where rm.id = p_matter_id
  for update;

  if not found then
    raise exception 'Reserved Matter tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_matter.status <> 'approved' then
    raise exception 'Hanya Reserved Matter approved yang dapat dikonsumsi.' using errcode = '55000';
  end if;

  update public.reserved_matters
  set status = 'executed', executed_by = v_actor, executed_at = now()
  where id = p_matter_id;

  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, summary)
  values (
    v_actor, app.current_actor_type(), 'reserved_matters.execute', 'reserved_matter', p_matter_id,
    'Mengonsumsi persetujuan Reserved Matters untuk controlled action.'
  );
end;
$$;

-- RPC exposure. The reusable require_* gate is deliberately internal; callers
-- cannot use it as a public bypass. Future controlled SECURITY DEFINER RPCs call
-- it as the function owner.
revoke all on function app.create_governance_rule(text,text,text,text,integer,integer,numeric,uuid) from public;
revoke all on function app.activate_governance_rule(uuid) from public;
revoke all on function app.create_reserved_matter(uuid,text,text,text,uuid) from public;
revoke all on function app.submit_reserved_matter(uuid) from public;
revoke all on function app.cancel_reserved_matter(uuid,text) from public;
revoke all on function app.disclose_reserved_matter_conflict(uuid,text,text) from public;
revoke all on function app.resolve_reserved_matter_conflict(uuid,text,text) from public;
revoke all on function app.record_reserved_matter_decision(uuid,text,text) from public;
revoke all on function app.finalise_reserved_matter(uuid,text,text) from public;
revoke all on function app.require_reserved_matter_authorization(text,text,uuid) from public, anon, authenticated;
revoke all on function app.consume_reserved_matter_authorization(uuid) from public;

grant execute on function app.create_governance_rule(text,text,text,text,integer,integer,numeric,uuid) to authenticated;
grant execute on function app.activate_governance_rule(uuid) to authenticated;
grant execute on function app.create_reserved_matter(uuid,text,text,text,uuid) to authenticated;
grant execute on function app.submit_reserved_matter(uuid) to authenticated;
grant execute on function app.cancel_reserved_matter(uuid,text) to authenticated;
grant execute on function app.disclose_reserved_matter_conflict(uuid,text,text) to authenticated;
grant execute on function app.resolve_reserved_matter_conflict(uuid,text,text) to authenticated;
grant execute on function app.record_reserved_matter_decision(uuid,text,text) to authenticated;
grant execute on function app.finalise_reserved_matter(uuid,text,text) to authenticated;
grant execute on function app.consume_reserved_matter_authorization(uuid) to authenticated;
grant execute on function app.require_reserved_matter_authorization(text,text,uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Realtime/admin operational event projection
-- -----------------------------------------------------------------------------
create or replace function app.emit_governance_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  perform app.emit_event(
    app.topic_admin(),
    'governance.changed',
    tg_table_name,
    v_entity_id,
    app.current_actor_type()
  );
  return null;
end;
$$;

create trigger governance_rules_emit_events
  after insert or update on public.governance_rules
  for each row execute function app.emit_governance_events();
create trigger reserved_matters_emit_events
  after insert or update on public.reserved_matters
  for each row execute function app.emit_governance_events();
create trigger conflict_disclosures_emit_events
  after insert or update on public.conflict_disclosures
  for each row execute function app.emit_governance_events();
create trigger reserved_matter_decisions_emit_events
  after insert on public.reserved_matter_decisions
  for each row execute function app.emit_governance_events();

revoke execute on function app.emit_governance_events() from public, anon, authenticated;
