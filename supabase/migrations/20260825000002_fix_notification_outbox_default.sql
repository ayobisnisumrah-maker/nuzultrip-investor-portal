create or replace function public.create_notification(
  p_recipient_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text default '',
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_url text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_notification_id uuid;
  v_email_enabled boolean;
begin
  if p_recipient_id is null then
    raise exception 'recipient_id is required';
  end if;

  if length(btrim(p_title)) = 0 then
    raise exception 'notification title cannot be blank';
  end if;

  if p_action_url is not null and p_action_url !~ '^/' then
    raise exception 'notification action_url must be an internal path';
  end if;

  insert into public.notifications (
    recipient_id,
    kind,
    title,
    body,
    entity_type,
    entity_id,
    action_url,
    payload
  )
  values (
    p_recipient_id,
    p_kind,
    p_title,
    p_body,
    p_entity_type,
    p_entity_id,
    p_action_url,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_notification_id;

  /*
   * Email preference:
   *
   * - No preference row = enabled by default.
   * - Existing preference row = respect its email value.
   */
  select coalesce(
    (
      select np.email
      from public.notification_preferences np
      where np.user_id = p_recipient_id
        and np.kind = p_kind
      limit 1
    ),
    true
  )
  into v_email_enabled;

  if v_email_enabled is true then
    insert into public.notification_deliveries (
      notification_id,
      channel,
      status
    )
    values (
      v_notification_id,
      'email',
      'pending'
    )
    on conflict (notification_id, channel) do nothing;
  end if;

  return v_notification_id;
end;
$$;

revoke all on function public.create_notification(
  uuid,
  public.notification_kind,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_notification(
  uuid,
  public.notification_kind,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) to service_role;
