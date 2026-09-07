-- Messaging reliability hardening.
-- 1) Persist admin read receipts for threads they are authorized to view.
-- 2) Close expired/inactive threads through an authenticated maintenance RPC.
-- 3) Enforce a true response window: only a response from the opposite side
--    resets the rolling 4-hour deadline. Consecutive messages from the same side
--    do not keep a conversation alive indefinitely.
-- 4) Expose a permission-aware unread count for the admin shell.

alter table public.message_threads
  add column if not exists awaiting_response_from text;

alter table public.message_threads
  drop constraint if exists message_threads_awaiting_response_from_valid;

alter table public.message_threads
  add constraint message_threads_awaiting_response_from_valid
  check (awaiting_response_from is null or awaiting_response_from in ('admin', 'investor'));

comment on column public.message_threads.awaiting_response_from is
  'Side expected to respond before reply_deadline_at. Same-side follow-up messages do not extend the deadline.';

-- Backfill the expected responder from the most recent non-system message.
update public.message_threads t
set awaiting_response_from = case
  when t.awaiting_admin_reply then 'admin'
  else (
    select case ua.account_type
      when 'admin'::public.account_type then 'investor'
      when 'investor'::public.account_type then 'admin'
      else null
    end
    from public.messages m
    left join public.user_accounts ua on ua.id = m.sender_id
    where m.thread_id = t.id and not m.is_system
    order by m.sent_at desc
    limit 1
  )
end
where t.awaiting_response_from is null;

-- Investor-originated questions must also receive an admin response within four
-- hours. Older pending rows receive a deadline based on their latest message.
update public.message_threads t
set reply_deadline_at = coalesce(
  t.reply_deadline_at,
  t.last_message_at + interval '4 hours',
  t.created_at + interval '4 hours'
)
where not t.is_closed
  and t.awaiting_admin_reply
  and t.reply_deadline_at is null;

create or replace function app.prepare_message_thread_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.awaiting_response_from is null then
    new.awaiting_response_from := case
      when new.awaiting_admin_reply or new.initiated_by = 'investor' then 'admin'
      else 'investor'
    end;
  end if;

  if new.reply_deadline_at is null and not new.is_closed then
    new.reply_deadline_at := coalesce(new.last_message_at, new.created_at, now()) + interval '4 hours';
  end if;

  return new;
end;
$$;

revoke all on function app.prepare_message_thread_lifecycle() from public, anon, authenticated;

drop trigger if exists message_threads_prepare_lifecycle on public.message_threads;
create trigger message_threads_prepare_lifecycle
  before insert or update of initiated_by, awaiting_admin_reply, reply_deadline_at, awaiting_response_from
  on public.message_threads
  for each row execute function app.prepare_message_thread_lifecycle();

create or replace function app.touch_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_type public.account_type;
  v_sender_side text;
  v_next_side text;
begin
  select ua.account_type into v_sender_type
  from public.user_accounts ua
  where ua.id = new.sender_id;

  v_sender_side := case
    when v_sender_type = 'admin'::public.account_type then 'admin'
    when v_sender_type = 'investor'::public.account_type then 'investor'
    else null
  end;

  v_next_side := case v_sender_side
    when 'admin' then 'investor'
    when 'investor' then 'admin'
    else null
  end;

  update public.message_threads t
  set
    last_message_at = new.sent_at,
    awaiting_admin_reply = case
      when t.awaiting_admin_reply and v_sender_side = 'admin' then false
      else t.awaiting_admin_reply
    end,
    opened_at = case
      when t.awaiting_admin_reply and v_sender_side = 'admin' then new.sent_at
      else coalesce(t.opened_at, new.sent_at)
    end,
    expires_at = case
      when t.awaiting_admin_reply and v_sender_side = 'admin'
        then least(coalesce(t.expires_at, new.sent_at + interval '24 hours'), new.sent_at + interval '24 hours')
      else t.expires_at
    end,
    awaiting_response_from = case
      when t.awaiting_response_from is null then v_next_side
      when t.awaiting_response_from = v_sender_side then v_next_side
      else t.awaiting_response_from
    end,
    reply_deadline_at = case
      when t.awaiting_response_from is null then new.sent_at + interval '4 hours'
      when t.awaiting_response_from = v_sender_side then new.sent_at + interval '4 hours'
      else t.reply_deadline_at
    end
  where t.id = new.thread_id;

  return new;
end;
$$;

revoke all on function app.touch_thread_on_message() from public, anon, authenticated;

-- Persist read receipts for an admin who can view messages even when the admin
-- is not explicitly stored as a participant in an investor-originated thread.
drop policy if exists message_reads_insert_own on public.message_reads;
create policy message_reads_insert_own
  on public.message_reads for insert to authenticated
  with check (
    user_id = app.current_user_id()
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and (
          app.participates_in_thread(m.thread_id)
          or app.has_permission('messages.view')
        )
    )
  );

-- Admin sends are subject to exactly the same hard expiry/inactivity window.
drop policy if exists messages_insert_admin on public.messages;
create policy messages_insert_admin
  on public.messages for insert to authenticated
  with check (
    app.has_permission('messages.send')
    and sender_id = app.current_user_id()
    and exists (
      select 1
      from public.message_threads t
      where t.id = thread_id
        and not t.is_closed
        and (t.expires_at is null or t.expires_at > now())
        and (t.reply_deadline_at is null or t.reply_deadline_at > now())
    )
  );

create or replace function app.expire_message_threads()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  update public.message_threads t
  set
    is_closed = true,
    closed_at = coalesce(t.closed_at, now()),
    closed_by = null,
    updated_at = now()
  where not t.is_closed
    and (
      (t.expires_at is not null and t.expires_at <= now())
      or (t.reply_deadline_at is not null and t.reply_deadline_at <= now())
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function app.expire_message_threads() from public, anon;
grant execute on function app.expire_message_threads() to authenticated;

create or replace function app.unread_message_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from public.messages m
  where m.sender_id is distinct from (select auth.uid())
    and not exists (
      select 1
      from public.message_reads mr
      where mr.message_id = m.id
        and mr.user_id = (select auth.uid())
    )
    and (
      app.participates_in_thread(m.thread_id)
      or app.has_permission('messages.view')
    );
$$;

revoke all on function app.unread_message_count() from public, anon;
grant execute on function app.unread_message_count() to authenticated;
