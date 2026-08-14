-- =============================================================================
-- Notifications
--
-- In-app notifications plus a delivery outbox for external channels. The outbox
-- is written in the same transaction as the notification and drained by a
-- worker, so email delivery is reliable and provider-swappable rather than a
-- fire-and-forget call inside a request.
--
-- See docs/DATABASE.md §9.
-- =============================================================================

create type public.notification_kind as enum (
  'investor_application_received',
  'investor_approved',
  'investor_rejected',
  'investor_deactivated',
  'document_published',
  'document_shared',
  'financial_report_published',
  'investor_report_published',
  'company_update',
  'message_received',
  'inquiry_received',
  'account_invited'
);

create type public.delivery_channel as enum ('email');
create type public.delivery_status as enum ('pending', 'sent', 'failed', 'skipped');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.user_accounts (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null default '',

  entity_type text,
  entity_id uuid,
  action_url text,
  payload jsonb not null default '{}'::jsonb,

  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint notifications_title_not_blank check (length(btrim(title)) > 0),
  constraint notifications_payload_object check (jsonb_typeof(payload) = 'object'),
  -- Internal paths only: a notification must never be a way to send a user off
  -- to an attacker-chosen URL.
  constraint notifications_action_url_internal check (action_url is null or action_url ~ '^/')
);

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_id, created_at desc) where read_at is null;
create index notifications_entity_idx
  on public.notifications (entity_type, entity_id) where entity_id is not null;

create table public.notification_preferences (
  user_id uuid not null references public.user_accounts (id) on delete cascade,
  kind public.notification_kind not null,
  in_app boolean not null default true,
  email boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function app.set_updated_at();

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel public.delivery_channel not null,
  status public.delivery_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_deliveries_unique unique (notification_id, channel),
  constraint notification_deliveries_attempts_non_negative check (attempts >= 0),
  constraint notification_deliveries_sent_consistent
    check ((status = 'sent') = (sent_at is not null))
);

create index notification_deliveries_pending_idx
  on public.notification_deliveries (scheduled_for)
  where status = 'pending';

create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function app.set_updated_at();

comment on table public.notification_deliveries is
  'Outbox for external channels. Drained by a worker; never sent inline during a request.';

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_deliveries force row level security;

revoke all on public.notifications from anon, authenticated;
revoke all on public.notification_preferences from anon, authenticated;
revoke all on public.notification_deliveries from anon, authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

-- A notification is strictly personal. There is no admin-wide read policy:
-- an admin who needs to know what a user was told reads the audit log.
create policy notifications_select_own
  on public.notifications for select to authenticated
  using (recipient_id = app.current_user_id());

-- The only field a recipient may change is whether they have read it.
create policy notifications_update_own
  on public.notifications for update to authenticated
  using (recipient_id = app.current_user_id())
  with check (recipient_id = app.current_user_id());

create policy notification_preferences_select_own
  on public.notification_preferences for select to authenticated
  using (user_id = app.current_user_id());

create policy notification_preferences_insert_own
  on public.notification_preferences for insert to authenticated
  with check (user_id = app.current_user_id());

create policy notification_preferences_update_own
  on public.notification_preferences for update to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

-- notification_deliveries has no policy for anon or authenticated at all: the
-- outbox is worker-only, reached through the service role.
