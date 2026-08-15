-- =============================================================================
-- Realtime — broadcast from database
--
-- Postgres triggers emit curated domain events onto named topics. Clients
-- subscribe to a topic; the subscription is authorised **once**, by RLS on
-- `realtime.messages`, rather than per row per subscriber as Postgres Changes
-- would do.
--
-- Events carry an invalidation signal, never business data. A client cannot
-- render anything that arrived over the socket — it refetches through the
-- normal RLS-guarded path — so the socket can never become an authorisation
-- bypass, and a replayed or spoofed event costs one redundant query.
--
-- There is no INSERT policy on `realtime.messages` for any client role, so
-- nothing but a database trigger can originate an event.
--
-- See docs/REALTIME.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Topic helpers
--
-- Topic names are built here and in src/core/realtime/topics.ts, never by
-- string concatenation at a call site — a typo would otherwise be a silent
-- subscription to nothing.
-- -----------------------------------------------------------------------------
create or replace function app.topic_portal()
returns text language sql immutable set search_path = '' as $$ select 'portal:public' $$;

create or replace function app.topic_all_investors()
returns text language sql immutable set search_path = '' as $$ select 'investors:all' $$;

create or replace function app.topic_investor(p_investor_id uuid)
returns text language sql immutable set search_path = '' as $$
  select 'investor:' || p_investor_id::text
$$;

create or replace function app.topic_admin()
returns text language sql immutable set search_path = '' as $$ select 'admin:global' $$;

create or replace function app.topic_user(p_user_id uuid)
returns text language sql immutable set search_path = '' as $$
  select 'user:' || p_user_id::text
$$;

-- -----------------------------------------------------------------------------
-- Emission
-- -----------------------------------------------------------------------------

create table public.realtime_emit_failures (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  kind text not null,
  entity_type text,
  entity_id uuid,
  error_message text not null,
  created_at timestamptz not null default now()
);

alter table public.realtime_emit_failures enable row level security;
alter table public.realtime_emit_failures force row level security;
revoke all on public.realtime_emit_failures from anon, authenticated;

create policy realtime_emit_failures_select_admin
  on public.realtime_emit_failures for select to authenticated
  using (app.has_permission('settings.view'));

grant select on public.realtime_emit_failures to authenticated;

comment on table public.realtime_emit_failures is
  'Events that could not be broadcast. Losing a notification is recoverable; losing the transaction is not.';

/**
 * Emit a domain event.
 *
 * Runs inside the caller's transaction, so a rollback takes the event with it
 * and no phantom notification is ever sent.
 *
 * A broadcast failure must not fail the business transaction — an investor
 * approval that succeeded must not be undone because a websocket hiccuped — so
 * the error is trapped and recorded instead.
 */
create or replace function app.emit_event(
  p_topic text,
  p_kind text,
  p_entity_type text,
  p_entity_id uuid,
  p_actor_type text default 'system'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'kind', p_kind,
      'entityType', p_entity_type,
      'entityId', p_entity_id,
      'occurredAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'actorType', p_actor_type,
      'version', 1
    ),
    p_kind,
    p_topic,
    true
  );
exception
  when others then
    insert into public.realtime_emit_failures
      (topic, kind, entity_type, entity_id, error_message)
    values (p_topic, p_kind, p_entity_type, p_entity_id, sqlerrm);
end;
$$;

create or replace function app.current_actor_type()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ua.account_type::text from public.user_accounts ua where ua.id = (select auth.uid())),
    'system'
  );
$$;

-- =============================================================================
-- Subscription authorisation
--
-- These policies are the whole access-control story for realtime. A client that
-- cannot pass them simply never receives the events.
-- =============================================================================

grant select on realtime.messages to anon, authenticated;

-- The published portal is public, so its topic is too. It is still a *private*
-- channel in Supabase's sense — subscribing is allowed by an explicit policy
-- rather than by an unauthenticated channel that could later be widened by
-- accident.
create policy realtime_portal_public
  on realtime.messages for select to anon, authenticated
  using (realtime.topic() = app.topic_portal());

-- Events that concern every investor equally (a report was published).
create policy realtime_all_investors
  on realtime.messages for select to authenticated
  using (
    realtime.topic() = app.topic_all_investors()
    and app.current_investor_id() is not null
  );

-- An investor's own channel. Admins with investors.view may also listen, which
-- is what makes an admin's investor detail page live.
create policy realtime_investor_own
  on realtime.messages for select to authenticated
  using (
    realtime.topic() = app.topic_investor(app.current_investor_id())
    or (realtime.topic() like 'investor:%' and app.has_permission('investors.view'))
  );

create policy realtime_admin_global
  on realtime.messages for select to authenticated
  using (realtime.topic() = app.topic_admin() and app.is_admin());

create policy realtime_user_own
  on realtime.messages for select to authenticated
  using (realtime.topic() = app.topic_user((select auth.uid())));

-- =============================================================================
-- Triggers
-- =============================================================================

-- --- investors --------------------------------------------------------------

create or replace function app.emit_investor_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(app.topic_admin(), 'investor.applied', 'investor', new.id, actor);
    return null;
  end if;

  if new.status is distinct from old.status then
    perform app.emit_event(
      app.topic_investor(new.id), 'investor.status_changed', 'investor', new.id, actor
    );
    perform app.emit_event(
      app.topic_admin(), 'investor.status_changed', 'investor', new.id, actor
    );
    -- The account's own channel, so a signed-in investor learns their access
    -- changed even while looking at a page that is not investor-scoped.
    perform app.emit_event(
      app.topic_user(new.id), 'investor.status_changed', 'investor', new.id, actor
    );
  end if;

  return null;
end;
$$;

create trigger investors_emit_events
  after insert or update of status on public.investors
  for each row execute function app.emit_investor_events();

-- --- documents --------------------------------------------------------------

create or replace function app.emit_document_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
begin
  if new.status is distinct from old.status or
     new.published_version_id is distinct from old.published_version_id then

    perform app.emit_event(app.topic_admin(), 'document.state_changed', 'document', new.id, actor);

    if new.status = 'published' then
      if new.visibility = 'public' then
        perform app.emit_event(app.topic_portal(), 'document.published', 'document', new.id, actor);
      elsif new.visibility = 'investors' then
        perform app.emit_event(
          app.topic_all_investors(), 'document.published', 'document', new.id, actor
        );
      end if;
      -- `restricted` documents notify only the investors holding a live grant.
      if new.visibility = 'restricted' then
        perform app.emit_event(app.topic_investor(g.investor_id), 'document.published', 'document', new.id, actor)
        from public.document_access_grants g
        where g.document_id = new.id and g.revoked_at is null;
      end if;
    end if;
  end if;

  return null;
end;
$$;

create trigger documents_emit_events
  after update on public.documents
  for each row execute function app.emit_document_events();

-- A new grant makes an existing restricted document visible to one investor.
create or replace function app.emit_document_grant_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(
      app.topic_investor(new.investor_id), 'investor.document_shared', 'document', new.document_id, actor
    );
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform app.emit_event(
      app.topic_investor(new.investor_id), 'investor.document_revoked', 'document', new.document_id, actor
    );
  end if;
  return null;
end;
$$;

create trigger document_access_grants_emit_events
  after insert or update on public.document_access_grants
  for each row execute function app.emit_document_grant_events();

-- --- financial reports ------------------------------------------------------

create or replace function app.emit_financial_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
begin
  if new.status is distinct from old.status then
    perform app.emit_event(
      app.topic_admin(), 'financial_report.state_changed', 'financial_report', new.id, actor
    );
    if new.status = 'published' then
      perform app.emit_event(
        app.topic_all_investors(), 'financial_report.published', 'financial_report', new.id, actor
      );
    end if;
  end if;
  return null;
end;
$$;

create trigger financial_reports_emit_events
  after update on public.financial_reports
  for each row execute function app.emit_financial_events();

-- --- portal CMS -------------------------------------------------------------

create or replace function app.emit_portal_page_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.page_published', 'portal_page',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;

create trigger portal_pages_emit_events
  after insert or update or delete on public.portal_pages
  for each row execute function app.emit_portal_page_events();

create or replace function app.emit_portal_section_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.section_published', 'portal_section',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;

create trigger portal_sections_emit_events
  after insert or update or delete on public.portal_sections
  for each row execute function app.emit_portal_section_events();

create or replace function app.emit_portal_theme_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.theme_updated', 'portal_theme',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;

create trigger portal_theme_emit_events
  after insert or update on public.portal_theme
  for each row execute function app.emit_portal_theme_events();

create or replace function app.emit_portal_navigation_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.navigation_updated', 'portal_navigation',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;

create trigger portal_navigation_emit_events
  after insert or update or delete on public.portal_navigation
  for each row execute function app.emit_portal_navigation_events();

-- --- messaging and notifications --------------------------------------------

create or replace function app.emit_message_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
  thread record;
begin
  select t.investor_id into thread from public.message_threads t where t.id = new.thread_id;

  if thread.investor_id is not null then
    perform app.emit_event(
      app.topic_investor(thread.investor_id), 'message.received', 'message', new.id, actor
    );
  end if;

  perform app.emit_event(app.topic_admin(), 'message.received', 'message', new.id, actor);
  return null;
end;
$$;

create trigger messages_emit_events
  after insert on public.messages
  for each row execute function app.emit_message_events();

create or replace function app.emit_notification_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.emit_event(
    app.topic_user(new.recipient_id), 'notification.created', 'notification', new.id,
    app.current_actor_type()
  );
  return null;
end;
$$;

create trigger notifications_emit_events
  after insert on public.notifications
  for each row execute function app.emit_notification_events();

create or replace function app.emit_inquiry_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.emit_event(
    app.topic_admin(), 'inquiry.received', 'portal_inquiry', new.id, 'anonymous'
  );
  return null;
end;
$$;

create trigger portal_inquiries_emit_events
  after insert on public.portal_inquiries
  for each row execute function app.emit_inquiry_events();

grant execute on function app.topic_portal() to anon, authenticated;
grant execute on function app.topic_all_investors() to anon, authenticated;
grant execute on function app.topic_investor(uuid) to anon, authenticated;
grant execute on function app.topic_admin() to anon, authenticated;
grant execute on function app.topic_user(uuid) to anon, authenticated;
grant execute on function app.current_actor_type() to authenticated;
