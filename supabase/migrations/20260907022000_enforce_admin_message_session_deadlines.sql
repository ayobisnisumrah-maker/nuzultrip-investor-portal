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
        and (
          t.awaiting_admin_reply
          or t.reply_deadline_at is null
          or t.reply_deadline_at > now()
        )
    )
  );
