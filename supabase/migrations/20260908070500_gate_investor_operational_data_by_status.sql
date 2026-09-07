-- Investor operational data must not remain readable after access is revoked.
-- `app.current_investor_id()` is the authoritative lifecycle gate and returns
-- an investor id only for active accounts whose investor status is approved/active.
--
-- Keep lifecycle/account rows readable so the UI can explain a rejected or
-- inactive state, but block operational surfaces such as messaging and
-- notifications when `current_investor_id()` becomes null.

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
        app.current_investor_id() is not null
        or app.has_permission('messages.view')
      )
  );
$$;

-- Thread participant metadata is operational messaging data.
drop policy if exists thread_participants_select_own on public.thread_participants;
create policy thread_participants_select_own
on public.thread_participants
for select
to authenticated
using (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
);

-- Read receipts must follow the same lifecycle gate. Admins keep access through
-- the messages.view permission, while investors require current_investor_id().
drop policy if exists message_reads_select_own on public.message_reads;
create policy message_reads_select_own
on public.message_reads
for select
to authenticated
using (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
);

drop policy if exists message_reads_update_own on public.message_reads;
create policy message_reads_update_own
on public.message_reads
for update
to authenticated
using (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
)
with check (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
);

-- Existing insert policy already checks the referenced message and participant;
-- make the lifecycle/admin gate explicit as defence in depth.
drop policy if exists message_reads_insert_own on public.message_reads;
create policy message_reads_insert_own
on public.message_reads
for insert
to authenticated
with check (
  user_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.has_permission('messages.view')
  )
  and exists (
    select 1
    from public.messages m
    where m.id = message_reads.message_id
      and (
        app.participates_in_thread(m.thread_id)
        or app.has_permission('messages.view')
      )
  )
);

-- Notifications can contain operational/investment information. Preserve admin
-- notifications, but an investor may only read/update them while data access is
-- granted by the lifecycle.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using (
  recipient_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.is_admin()
  )
);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications
for update
to authenticated
using (
  recipient_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.is_admin()
  )
)
with check (
  recipient_id = app.current_user_id()
  and (
    app.current_investor_id() is not null
    or app.is_admin()
  )
);
