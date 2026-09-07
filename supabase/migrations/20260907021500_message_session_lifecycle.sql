-- Timed investor messaging lifecycle.
-- Admin-initiated conversations are replyable for at most 24 hours and use a
-- rolling 4-hour inactivity window. Investor-initiated questions remain
-- pending until an admin responds; after that the same timed session applies.

alter table public.message_threads
  add column if not exists initiated_by text not null default 'admin',
  add column if not exists opened_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists reply_deadline_at timestamptz,
  add column if not exists awaiting_admin_reply boolean not null default false;

alter table public.message_threads
  drop constraint if exists message_threads_initiated_by_valid;

alter table public.message_threads
  add constraint message_threads_initiated_by_valid
  check (initiated_by in ('admin', 'investor'));

create index if not exists message_threads_expiry_idx
  on public.message_threads (expires_at) where is_closed = false;

create index if not exists message_threads_reply_deadline_idx
  on public.message_threads (reply_deadline_at) where is_closed = false;

comment on column public.message_threads.expires_at is
  'Hard session expiry. Once reached, the thread remains readable but no longer accepts replies.';
comment on column public.message_threads.reply_deadline_at is
  'Rolling inactivity deadline for an active chat. Each accepted message extends this by 4 hours.';
comment on column public.message_threads.awaiting_admin_reply is
  'True for an investor-initiated question until an admin sends the first response.';

create or replace function app.thread_accepts_investor_reply(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.message_threads t
    where t.id = p_thread_id
      and not t.is_closed
      and not t.awaiting_admin_reply
      and (t.expires_at is null or t.expires_at > now())
      and (t.reply_deadline_at is null or t.reply_deadline_at > now())
  );
$$;

grant execute on function app.thread_accepts_investor_reply(uuid) to authenticated;

create or replace function app.touch_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_type public.account_type;
begin
  select ua.account_type into v_sender_type
  from public.user_accounts ua
  where ua.id = new.sender_id;

  update public.message_threads t
  set
    last_message_at = new.sent_at,
    awaiting_admin_reply = case
      when t.awaiting_admin_reply and v_sender_type = 'admin'::public.account_type then false
      else t.awaiting_admin_reply
    end,
    opened_at = case
      when t.awaiting_admin_reply and v_sender_type = 'admin'::public.account_type then new.sent_at
      else coalesce(t.opened_at, new.sent_at)
    end,
    expires_at = case
      when t.awaiting_admin_reply and v_sender_type = 'admin'::public.account_type then new.sent_at + interval '24 hours'
      else t.expires_at
    end,
    reply_deadline_at = case
      when (not t.awaiting_admin_reply) or v_sender_type = 'admin'::public.account_type
        then new.sent_at + interval '4 hours'
      else t.reply_deadline_at
    end
  where t.id = new.thread_id;

  return new;
end;
$$;

drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant
  on public.messages for insert to authenticated
  with check (
    app.participates_in_thread(thread_id)
    and sender_id = app.current_user_id()
    and not is_system
    and app.thread_accepts_investor_reply(thread_id)
  );

create or replace function app.create_investor_message_thread(
  p_investor_id uuid,
  p_subject text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_id uuid;
  v_admin_user_id uuid;
begin
  if not app.is_admin() or not app.has_permission('messages.send') then
    raise exception 'forbidden';
  end if;

  if p_subject is null or length(btrim(p_subject)) = 0 or length(btrim(p_subject)) > 200 then
    raise exception 'invalid subject';
  end if;
  if p_body is null or length(btrim(p_body)) = 0 or length(p_body) > 20000 then
    raise exception 'invalid body';
  end if;
  if not exists (
    select 1 from public.investors i
    where i.id = p_investor_id
      and i.status in ('approved'::public.investor_status, 'active'::public.investor_status)
  ) then
    raise exception 'investor not eligible';
  end if;

  v_admin_user_id := app.current_user_id();

  insert into public.message_threads (
    subject, thread_kind, investor_id, created_by, last_message_at, is_closed,
    initiated_by, opened_at, expires_at, reply_deadline_at, awaiting_admin_reply
  ) values (
    btrim(p_subject), 'investor_admin'::public.thread_kind, p_investor_id,
    v_admin_user_id, now(), false,
    'admin', now(), now() + interval '24 hours', now() + interval '4 hours', false
  ) returning id into v_thread_id;

  insert into public.thread_participants (thread_id, user_id, role)
  values
    (v_thread_id, p_investor_id, 'investor'::public.participant_role),
    (v_thread_id, v_admin_user_id, 'admin'::public.participant_role);

  insert into public.messages (thread_id, sender_id, body_text, body_rich, is_system)
  values (
    v_thread_id, v_admin_user_id, btrim(p_body),
    jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', btrim(p_body))
          )
        )
      )
    ), false
  );

  return v_thread_id;
end;
$$;

create or replace function app.create_investor_message_request(
  p_subject text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_id uuid;
  v_investor_id uuid;
  v_user_id uuid;
begin
  v_user_id := app.current_user_id();
  v_investor_id := app.current_investor_id();

  if v_investor_id is null or v_user_id is null then
    raise exception 'investor required';
  end if;
  if p_subject is null or length(btrim(p_subject)) = 0 or length(btrim(p_subject)) > 200 then
    raise exception 'invalid subject';
  end if;
  if p_body is null or length(btrim(p_body)) = 0 or length(p_body) > 5000 then
    raise exception 'invalid body';
  end if;

  if exists (
    select 1 from public.message_threads t
    where t.investor_id = v_investor_id
      and t.initiated_by = 'investor'
      and t.awaiting_admin_reply
      and not t.is_closed
      and (t.expires_at is null or t.expires_at > now())
  ) then
    raise exception 'pending request exists';
  end if;

  insert into public.message_threads (
    subject, thread_kind, investor_id, created_by, last_message_at, is_closed,
    initiated_by, opened_at, expires_at, reply_deadline_at, awaiting_admin_reply
  ) values (
    btrim(p_subject), 'investor_admin'::public.thread_kind, v_investor_id,
    v_user_id, now(), false,
    'investor', null, now() + interval '24 hours', null, true
  ) returning id into v_thread_id;

  insert into public.thread_participants (thread_id, user_id, role)
  values (v_thread_id, v_user_id, 'investor'::public.participant_role);

  insert into public.messages (
    thread_id, sender_id, sender_label, body_text, body_rich, is_system
  ) values (
    v_thread_id, v_user_id,
    (select full_name from public.user_accounts where id = v_user_id),
    btrim(p_body),
    jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', btrim(p_body))
          )
        )
      )
    ), false
  );

  return v_thread_id;
end;
$$;

grant execute on function app.create_investor_message_request(text, text) to authenticated;
