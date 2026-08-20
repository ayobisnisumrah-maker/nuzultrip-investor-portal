-- =============================================================================
-- Messaging and inquiry workflow completion
--
-- Completes the application-facing operations on top of the messaging
-- foundation: server-created threads, participant membership, first message,
-- and safe inquiry conversion.
-- =============================================================================

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
  v_admin_id uuid;
  v_thread_id uuid;
  v_investor_user_id uuid;
begin
  if not app.has_permission('messages.send') then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  select id into v_investor_user_id
  from public.user_accounts
  where id = p_investor_id
    and account_type = 'investor';

  if v_investor_user_id is null then
    raise exception 'Investor not found.' using errcode = 'P0002';
  end if;

  if length(btrim(coalesce(p_subject, ''))) = 0 then
    raise exception 'Subject is required.' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Message is required.' using errcode = '22023';
  end if;

  insert into public.message_threads (
    subject,
    thread_kind,
    investor_id,
    created_by,
    last_message_at
  )
  values (
    btrim(p_subject),
    'investor_admin',
    p_investor_id,
    v_admin_id,
    now()
  )
  returning id into v_thread_id;

  insert into public.thread_participants (thread_id, user_id, role)
  values
    (v_thread_id, v_admin_id, 'admin'),
    (v_thread_id, v_investor_user_id, 'investor');

  insert into public.messages (
    thread_id,
    sender_id,
    sender_label,
    body_text,
    is_system
  )
  values (
    v_thread_id,
    v_admin_id,
    null,
    btrim(p_body),
    false
  );

  return v_thread_id;
end;
$$;

grant execute on function app.create_investor_message_thread(uuid, text, text)
  to authenticated;

create or replace function app.convert_portal_inquiry_to_thread(
  p_inquiry_id uuid,
  p_subject text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_inquiry public.portal_inquiries%rowtype;
  v_thread_id uuid;
begin
  if not app.has_permission('inquiries.handle') then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  select * into v_inquiry
  from public.portal_inquiries
  where id = p_inquiry_id
  for update;

  if not found then
    raise exception 'Inquiry not found.' using errcode = 'P0002';
  end if;

  if v_inquiry.thread_id is not null then
    return v_inquiry.thread_id;
  end if;

  insert into public.message_threads (
    subject,
    thread_kind,
    created_by,
    last_message_at
  )
  values (
    coalesce(nullif(btrim(p_subject), ''), 'Inquiry: ' || v_inquiry.name),
    'portal_inquiry',
    v_admin_id,
    now()
  )
  returning id into v_thread_id;

  insert into public.thread_participants (thread_id, user_id, role)
  values (v_thread_id, v_admin_id, 'admin');

  insert into public.messages (
    thread_id,
    sender_id,
    sender_label,
    body_text,
    is_system
  )
  values (
    v_thread_id,
    null,
    v_inquiry.name,
    v_inquiry.message,
    false
  );

  update public.portal_inquiries
  set thread_id = v_thread_id,
      status = case when status = 'new' then 'in_progress' else status end,
      handled_by = v_admin_id,
      handled_at = coalesce(handled_at, now())
  where id = p_inquiry_id;

  return v_thread_id;
end;
$$;

grant execute on function app.convert_portal_inquiry_to_thread(uuid, text)
  to authenticated;
