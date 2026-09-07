create or replace function app.emit_message_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text;
  sender_type public.account_type;
  thread record;
begin
  select ua.account_type into sender_type
  from public.user_accounts ua
  where ua.id = new.sender_id;

  actor := case
    when sender_type = 'admin'::public.account_type then 'admin'
    when sender_type = 'investor'::public.account_type then 'investor'
    else app.current_actor_type()
  end;

  select t.investor_id into thread
  from public.message_threads t
  where t.id = new.thread_id;

  if thread.investor_id is not null then
    perform app.emit_event(
      app.topic_investor(thread.investor_id),
      'message.received',
      'message',
      new.id,
      actor
    );
  end if;

  perform app.emit_event(
    app.topic_admin(),
    'message.received',
    'message',
    new.id,
    actor
  );

  return null;
end;
$$;
