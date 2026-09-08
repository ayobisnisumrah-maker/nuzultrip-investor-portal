-- Thread-expiry reconciliation is a SECURITY DEFINER write path. It must not
-- allow one investor to mutate another investor's conversation lifecycle.
-- Admins with messages.view may reconcile the global queue; an investor may
-- reconcile only their own threads while lifecycle data access remains active.
create or replace function app.expire_message_threads()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_investor_id uuid := app.current_investor_id();
  v_is_message_admin boolean := app.has_permission('messages.view');
  v_count integer;
begin
  if not v_is_message_admin and v_investor_id is null then
    raise exception 'messaging access required' using errcode = '42501';
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
    )
    and (
      v_is_message_admin
      or t.investor_id = v_investor_id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
