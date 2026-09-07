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
  v_actor uuid := (select auth.uid());
  v_inquiry public.portal_inquiries%rowtype;
  v_investor_id uuid;
  v_thread_id uuid;
  v_subject text;
begin
  if v_actor is null
     or not app.is_admin()
     or not app.has_permission('inquiries.handle')
     or not app.has_permission('messages.send') then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;

  select * into v_inquiry
  from public.portal_inquiries
  where id = p_inquiry_id
  for update;

  if not found then
    raise exception 'Permintaan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_inquiry.thread_id is not null then
    return v_inquiry.thread_id;
  end if;

  select i.id into v_investor_id
  from public.investors i
  join public.user_accounts ua on ua.id = i.id
  where lower(btrim(ua.email)) = lower(btrim(v_inquiry.email))
    and i.status in ('approved'::public.investor_status, 'active'::public.investor_status)
    and ua.status = 'active'::public.account_status
  limit 1;

  if v_investor_id is null then
    raise exception 'Permintaan belum terhubung ke akun investor aktif dengan email yang sama.' using errcode = '22023';
  end if;

  v_subject := coalesce(nullif(btrim(p_subject), ''), 'Permintaan portal · ' || left(btrim(v_inquiry.name), 120));
  if length(v_subject) > 200 then
    v_subject := left(v_subject, 200);
  end if;

  insert into public.message_threads (
    subject, thread_kind, investor_id, created_by, last_message_at, is_closed,
    initiated_by, opened_at, expires_at, reply_deadline_at,
    awaiting_admin_reply, awaiting_response_from
  ) values (
    v_subject,
    'investor_admin'::public.thread_kind,
    v_investor_id,
    v_actor,
    now(),
    false,
    'investor',
    now(),
    now() + interval '24 hours',
    now() + interval '4 hours',
    true,
    'admin'
  ) returning id into v_thread_id;

  insert into public.thread_participants (thread_id, user_id, role)
  values
    (v_thread_id, v_investor_id, 'investor'::public.participant_role),
    (v_thread_id, v_actor, 'admin'::public.participant_role);

  insert into public.messages (
    thread_id, sender_id, sender_label, body_text, body_rich, is_system
  ) values (
    v_thread_id,
    v_investor_id,
    nullif(btrim(v_inquiry.name), ''),
    btrim(v_inquiry.message),
    jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', btrim(v_inquiry.message))
          )
        )
      )
    ),
    false
  );

  update public.portal_inquiries
  set status = 'converted'::public.inquiry_status,
      handled_by = v_actor,
      handled_at = now(),
      converted_investor_id = v_investor_id,
      thread_id = v_thread_id
  where id = v_inquiry.id;

  return v_thread_id;
end;
$$;

grant execute on function app.convert_portal_inquiry_to_thread(uuid, text) to authenticated;
