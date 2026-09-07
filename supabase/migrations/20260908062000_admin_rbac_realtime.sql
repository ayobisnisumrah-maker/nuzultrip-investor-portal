create or replace function app.emit_admin_account_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
  admin_id uuid;
begin
  admin_id := case when tg_op = 'DELETE' then old.id else new.id end;

  perform app.emit_event(
    app.topic_admin(),
    'admin.changed',
    'admin',
    admin_id,
    actor
  );

  return null;
end;
$function$;

create or replace function app.emit_rbac_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
  role_id uuid;
begin
  if tg_table_name = 'roles' then
    role_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    role_id := case when tg_op = 'DELETE' then old.role_id else new.role_id end;
  end if;

  perform app.emit_event(
    app.topic_admin(),
    'rbac.changed',
    'role',
    role_id,
    actor
  );

  return null;
end;
$function$;

drop trigger if exists admins_emit_realtime_events on public.admins;
create trigger admins_emit_realtime_events
after insert or update or delete on public.admins
for each row execute function app.emit_admin_account_events();

drop trigger if exists roles_emit_realtime_events on public.roles;
create trigger roles_emit_realtime_events
after insert or update or delete on public.roles
for each row execute function app.emit_rbac_events();

drop trigger if exists role_permissions_emit_realtime_events on public.role_permissions;
create trigger role_permissions_emit_realtime_events
after insert or update or delete on public.role_permissions
for each row execute function app.emit_rbac_events();
