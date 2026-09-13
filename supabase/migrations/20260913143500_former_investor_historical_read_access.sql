-- Historical read-only access for a fully exited investor.
--
-- `app.current_investor_id()` intentionally stays narrow because many mutation
-- policies use it. Historical reads use an internal helper so inactive former
-- investors cannot accidentally regain write capabilities and the helper does
-- not become part of the generated application RPC surface.

create or replace function private.current_historical_investor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.id
  from public.investors i
  join public.user_accounts ua on ua.id = i.id
  where i.id = (select auth.uid())
    and ua.status = 'active'
    and i.status in ('approved', 'active', 'inactive');
$$;

revoke all on function private.current_historical_investor_id() from public, anon;
grant execute on function private.current_historical_investor_id() to authenticated, service_role;

-- Own holdings include transferred lots so the seller can retain cap-table history.
alter policy ownership_holdings_select_self
  on public.ownership_holdings
  using (investor_id = private.current_historical_investor_id());

-- A former investor remains a participant for SELECT/history only. Message INSERT
-- policies still depend on app.current_investor_id() through participates/write
-- checks and closed threads additionally reject replies.
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
      and (
        private.current_historical_investor_id() is not null
        or app.has_permission('messages.view')
      )
  );
$$;

revoke all on function app.participates_in_thread(uuid) from public, anon;
grant execute on function app.participates_in_thread(uuid) to authenticated, service_role;

alter policy thread_participants_select_own
  on public.thread_participants
  using (
    user_id = app.current_user_id()
    and (
      private.current_historical_investor_id() is not null
      or app.has_permission('messages.view')
    )
  );

-- Investor thread creation remains active-investor only because this policy keeps
-- the narrow current_investor_id helper.
alter policy message_threads_insert_investor
  on public.message_threads
  with check (
    thread_kind = 'investor_admin'
    and investor_id = app.current_investor_id()
    and created_by = app.current_user_id()
  );

-- Make the write boundary explicit: an inactive former investor can participate
-- for SELECT/history, but cannot send even if a historical thread were reopened.
alter policy messages_insert_participant
  on public.messages
  with check (
    app.current_investor_id() is not null
    and app.participates_in_thread(thread_id)
    and sender_id = app.current_user_id()
    and not is_system
    and app.thread_accepts_investor_reply(thread_id)
  );