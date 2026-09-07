create or replace function app.emit_document_grant_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(
      app.topic_investor(new.investor_id),
      'investor.document_shared',
      'document',
      new.document_id,
      actor
    );

    perform app.emit_event(
      app.topic_admin(),
      'document.state_changed',
      'document',
      new.document_id,
      actor
    );
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform app.emit_event(
      app.topic_investor(new.investor_id),
      'investor.document_revoked',
      'document',
      new.document_id,
      actor
    );

    perform app.emit_event(
      app.topic_admin(),
      'document.state_changed',
      'document',
      new.document_id,
      actor
    );
  end if;

  return null;
end;
$function$;
