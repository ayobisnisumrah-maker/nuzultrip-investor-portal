-- The existing realtime trigger used `offering_id` both as a PL/pgSQL variable
-- and as a table column in `h.offering_id = offering_id`. PostgreSQL treats that
-- reference as ambiguous at runtime, causing ownership offering INSERT/UPDATE
-- operations to fail when the trigger executes.
create or replace function app.emit_ownership_offering_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := app.current_actor_type();
  v_offering_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  perform app.emit_event(
    app.topic_admin(),
    'ownership.changed',
    'ownership_offering',
    v_offering_id,
    v_actor
  );

  if tg_op <> 'DELETE' then
    perform app.emit_event(
      app.topic_investor(h.investor_id),
      'ownership.changed',
      'ownership_offering',
      v_offering_id,
      v_actor
    )
    from public.ownership_holdings as h
    where h.offering_id = v_offering_id
      and h.status = 'active';
  end if;

  return null;
end;
$$;
