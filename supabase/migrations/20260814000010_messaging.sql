-- =============================================================================
-- Messaging
--
-- Real threads, real participants, real read state. Unread counts are derived
-- by query from `message_reads`, never held as client state.
--
-- `thread_participants` is the authorisation edge: you can read a thread if and
-- only if you participate in it, or you are an admin holding messages.view.
--
-- See docs/DATABASE.md §8.
-- =============================================================================

create type public.thread_kind as enum ('investor_admin', 'broadcast', 'portal_inquiry');
create type public.participant_role as enum ('investor', 'admin');
create type public.broadcast_audience as enum ('all_investors', 'by_status', 'selected');
create type public.inquiry_status as enum ('new', 'in_progress', 'converted', 'closed');

-- -----------------------------------------------------------------------------
-- Broadcasts
--
-- A broadcast fans out into real threads and real messages in one transaction.
-- It is not a special read path — an investor's inbox contains the actual
-- message, so read state and replies work exactly as they do anywhere else.
-- -----------------------------------------------------------------------------
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_rich jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  audience public.broadcast_audience not null,
  audience_filter jsonb not null default '{}'::jsonb,
  created_by uuid references public.admins (id) on delete set null,
  sent_at timestamptz,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now(),

  constraint broadcasts_subject_not_blank check (length(btrim(subject)) > 0),
  constraint broadcasts_body_object check (jsonb_typeof(body_rich) = 'object'),
  constraint broadcasts_filter_object check (jsonb_typeof(audience_filter) = 'object'),
  constraint broadcasts_recipient_count_non_negative check (recipient_count >= 0)
);

create index broadcasts_sent_idx on public.broadcasts (sent_at desc nulls first);

-- -----------------------------------------------------------------------------
-- Threads
-- -----------------------------------------------------------------------------
create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  thread_kind public.thread_kind not null default 'investor_admin',
  investor_id uuid references public.investors (id) on delete cascade,
  broadcast_id uuid references public.broadcasts (id) on delete set null,
  created_by uuid references public.user_accounts (id) on delete set null,
  last_message_at timestamptz,
  is_closed boolean not null default false,
  closed_at timestamptz,
  closed_by uuid references public.admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint message_threads_subject_not_blank check (length(btrim(subject)) > 0),
  constraint message_threads_closed_consistent check (is_closed = (closed_at is not null)),
  -- An investor thread must name its investor; a portal inquiry has none yet.
  constraint message_threads_investor_present
    check (thread_kind <> 'investor_admin' or investor_id is not null)
);

create index message_threads_investor_idx
  on public.message_threads (investor_id, last_message_at desc nulls last);
create index message_threads_recent_idx on public.message_threads (last_message_at desc nulls last);

create trigger message_threads_set_updated_at
  before update on public.message_threads
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Participants
-- -----------------------------------------------------------------------------
create table public.thread_participants (
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  user_id uuid not null references public.user_accounts (id) on delete cascade,
  role public.participant_role not null,
  joined_at timestamptz not null default now(),
  muted_at timestamptz,
  primary key (thread_id, user_id)
);

create index thread_participants_user_idx on public.thread_participants (user_id);

comment on table public.thread_participants is
  'The authorisation edge for messaging. Membership here is what grants thread access.';

-- Answers "may I see this thread" without the messages policy having to join
-- back through a table that is itself protected by a policy referencing
-- messages — which would recurse.
create or replace function app.participates_in_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = p_thread_id
      and tp.user_id = (select auth.uid())
  );
$$;

grant execute on function app.participates_in_thread(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Messages
-- -----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  -- NULL means a system message; set null on delete so history survives.
  sender_id uuid references public.user_accounts (id) on delete set null,
  sender_label text,
  body_text text not null,
  -- Portable-text AST, never HTML.
  body_rich jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  is_system boolean not null default false,
  sent_at timestamptz not null default now(),
  edited_at timestamptz,

  constraint messages_body_not_blank check (length(btrim(body_text)) > 0),
  constraint messages_body_length check (length(body_text) <= 20000),
  constraint messages_body_rich_object check (jsonb_typeof(body_rich) = 'object')
);

create index messages_thread_idx on public.messages (thread_id, sent_at desc);
create index messages_sender_idx on public.messages (sender_id);

-- A sent message is a record of what was said. Editing is not offered; the
-- column exists only for a future "edited" indicator if that changes.
create or replace function app.touch_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.message_threads
  set last_message_at = new.sent_at
  where id = new.thread_id;
  return new;
end;
$$;

create trigger messages_touch_thread
  after insert on public.messages
  for each row execute function app.touch_thread_on_message();

create trigger messages_no_delete
  before delete on public.messages
  for each row execute function app.forbid_mutation();

-- -----------------------------------------------------------------------------
-- Read state and attachments
-- -----------------------------------------------------------------------------
create table public.message_reads (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.user_accounts (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index message_reads_user_idx on public.message_reads (user_id, read_at desc);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  position integer not null default 0,
  constraint message_attachments_unique unique (message_id, media_asset_id)
);

create index message_attachments_message_idx on public.message_attachments (message_id, position);

-- -----------------------------------------------------------------------------
-- Portal inquiries
--
-- The only table `anon` may write to, and the only operation is INSERT.
-- Rate limiting is applied server-side before the row ever reaches here.
-- -----------------------------------------------------------------------------
create table public.portal_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  organization text,
  message text not null,
  source_page text,
  -- Salted hash, not the address: enough to correlate abuse without retaining
  -- raw PII (docs/SECURITY.md §9).
  ip_hash text,
  user_agent text,
  status public.inquiry_status not null default 'new',
  handled_by uuid references public.admins (id) on delete set null,
  handled_at timestamptz,
  converted_investor_id uuid references public.investors (id) on delete set null,
  thread_id uuid references public.message_threads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint portal_inquiries_name_length check (length(btrim(name)) between 1 and 200),
  constraint portal_inquiries_email_format
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint portal_inquiries_email_lowercase check (email = lower(email)),
  constraint portal_inquiries_message_length check (length(btrim(message)) between 1 and 5000),
  constraint portal_inquiries_organization_length check (organization is null or length(organization) <= 200)
);

create index portal_inquiries_status_idx on public.portal_inquiries (status, created_at desc);

create trigger portal_inquiries_set_updated_at
  before update on public.portal_inquiries
  for each row execute function app.set_updated_at();

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.broadcasts enable row level security;
alter table public.broadcasts force row level security;
alter table public.message_threads enable row level security;
alter table public.message_threads force row level security;
alter table public.thread_participants enable row level security;
alter table public.thread_participants force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.message_reads enable row level security;
alter table public.message_reads force row level security;
alter table public.message_attachments enable row level security;
alter table public.message_attachments force row level security;
alter table public.portal_inquiries enable row level security;
alter table public.portal_inquiries force row level security;

revoke all on public.broadcasts from anon, authenticated;
revoke all on public.message_threads from anon, authenticated;
revoke all on public.thread_participants from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.message_reads from anon, authenticated;
revoke all on public.message_attachments from anon, authenticated;
revoke all on public.portal_inquiries from anon, authenticated;

grant select, insert, update on public.broadcasts to authenticated;
grant select, insert, update on public.message_threads to authenticated;
grant select on public.thread_participants to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.message_reads to authenticated;
grant select on public.message_attachments to authenticated;
-- anon may create an inquiry and read nothing.
grant insert on public.portal_inquiries to anon;
grant select, update on public.portal_inquiries to authenticated;

-- --- threads ---------------------------------------------------------------

create policy message_threads_select_participant
  on public.message_threads for select to authenticated
  using (app.participates_in_thread(id));

create policy message_threads_select_admin
  on public.message_threads for select to authenticated
  using (app.has_permission('messages.view'));

create policy message_threads_insert_investor
  on public.message_threads for insert to authenticated
  with check (
    thread_kind = 'investor_admin'
    and investor_id = app.current_investor_id()
    and created_by = app.current_user_id()
  );

create policy message_threads_insert_admin
  on public.message_threads for insert to authenticated
  with check (app.has_permission('messages.send'));

create policy message_threads_update_admin
  on public.message_threads for update to authenticated
  using (app.has_permission('messages.close_thread'))
  with check (app.has_permission('messages.close_thread'));

-- --- participants ----------------------------------------------------------

create policy thread_participants_select_own
  on public.thread_participants for select to authenticated
  using (user_id = app.current_user_id());

create policy thread_participants_select_admin
  on public.thread_participants for select to authenticated
  using (app.has_permission('messages.view'));

-- Membership is written only by the server when it creates or routes a thread.

-- --- messages --------------------------------------------------------------

create policy messages_select_participant
  on public.messages for select to authenticated
  using (app.participates_in_thread(thread_id));

create policy messages_select_admin
  on public.messages for select to authenticated
  using (app.has_permission('messages.view'));

-- You may post to a thread you are in, as yourself, on an open thread.
create policy messages_insert_participant
  on public.messages for insert to authenticated
  with check (
    app.participates_in_thread(thread_id)
    and sender_id = app.current_user_id()
    and not is_system
    and exists (
      select 1 from public.message_threads t
      where t.id = thread_id and not t.is_closed
    )
  );

create policy messages_insert_admin
  on public.messages for insert to authenticated
  with check (app.has_permission('messages.send') and sender_id = app.current_user_id());

-- --- read state ------------------------------------------------------------

create policy message_reads_select_own
  on public.message_reads for select to authenticated
  using (user_id = app.current_user_id());

create policy message_reads_insert_own
  on public.message_reads for insert to authenticated
  with check (
    user_id = app.current_user_id()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and app.participates_in_thread(m.thread_id)
    )
  );

-- --- attachments -----------------------------------------------------------

create policy message_attachments_select
  on public.message_attachments for select to authenticated
  using (
    exists (select 1 from public.messages m where m.id = message_id)
  );

-- --- broadcasts ------------------------------------------------------------

create policy broadcasts_select_admin
  on public.broadcasts for select to authenticated
  using (app.has_permission('messages.view'));

create policy broadcasts_insert_admin
  on public.broadcasts for insert to authenticated
  with check (app.has_permission('messages.broadcast'));

create policy broadcasts_update_admin
  on public.broadcasts for update to authenticated
  using (app.has_permission('messages.broadcast'))
  with check (app.has_permission('messages.broadcast'));

-- --- inquiries -------------------------------------------------------------

-- Anonymous visitors may submit, and may not read back what they submitted.
create policy portal_inquiries_insert_anon
  on public.portal_inquiries for insert to anon, authenticated
  with check (status = 'new' and handled_by is null and converted_investor_id is null);

create policy portal_inquiries_select_admin
  on public.portal_inquiries for select to authenticated
  using (app.has_permission('inquiries.view'));

create policy portal_inquiries_update_admin
  on public.portal_inquiries for update to authenticated
  using (app.has_permission('inquiries.handle'))
  with check (app.has_permission('inquiries.handle'));
