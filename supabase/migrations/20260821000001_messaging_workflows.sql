-- =============================================================================
-- Messaging workflow completion
--
-- Creates an investor/admin thread and its first message atomically. The
-- function is SECURITY DEFINER and performs all authorization and investor
-- eligibility checks inside the database boundary.
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
    select 1
    from public.investors i
    where i.id = p_investor_id
      and i.status in ('approved'::public.investor_status, 'active'::public.investor_status)
  ) then
    raise exception 'investor not eligible';
  end if;

  v_admin_user_id := app.current_user_id();

  insert into public.message_threads (
    subject,
    thread_kind,
    investor_id,
    created_by,
    last_message_at,
    is_closed
  ) values (
    btrim(p_subject),
    'investor_admin'::public.thread_kind,
    p_investor_id,
    v_admin_user_id,
    now(),
    false
  )
  returning id into v_thread_id;

  insert into public.thread_participants (thread_id, user_id, role)
  values
    (v_thread_id, p_investor_id, 'investor'::public.participant_role),
    (v_thread_id, v_admin_user_id, 'admin'::public.participant_role);

  insert into public.messages (
    thread_id,
    sender_id,
    body_text,
    body_rich,
    is_system
  ) values (
    v_thread_id,
    v_admin_user_id,
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
    ),
    false
  );

  return v_thread_id;
end;
$$;

grant execute on function app.create_investor_message_thread(uuid, text, text)
  to authenticated;
