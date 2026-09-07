-- Ensure operational list/detail surfaces receive realtime invalidation on create and update.

create or replace function app.emit_financial_period_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.emit_event(
    app.topic_admin(),
    'financial_period.changed',
    'financial_period',
    new.id,
    app.current_actor_type()
  );
  return null;
end;
$$;

create or replace function app.emit_document_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
  should_publish boolean := false;
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(app.topic_admin(), 'document.state_changed', 'document', new.id, actor);
    should_publish := new.status = 'published';
  else
    perform app.emit_event(app.topic_admin(), 'document.state_changed', 'document', new.id, actor);
    should_publish := new.status = 'published' and (
      old.status is distinct from new.status or
      old.published_version_id is distinct from new.published_version_id or
      old.visibility is distinct from new.visibility
    );
  end if;

  if should_publish then
    if new.visibility = 'public' then
      perform app.emit_event(app.topic_portal(), 'document.published', 'document', new.id, actor);
    elsif new.visibility = 'investors' then
      perform app.emit_event(
        app.topic_all_investors(), 'document.published', 'document', new.id, actor
      );
    elsif new.visibility = 'restricted' then
      perform app.emit_event(
        app.topic_investor(g.investor_id), 'document.published', 'document', new.id, actor
      )
      from public.document_access_grants g
      where g.document_id = new.id
        and g.revoked_at is null;
    end if;
  end if;

  return null;
end;
$$;

create or replace function app.emit_financial_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
  should_publish boolean := false;
begin
  perform app.emit_event(
    app.topic_admin(), 'financial_report.state_changed', 'financial_report', new.id, actor
  );

  if tg_op = 'INSERT' then
    should_publish := new.status = 'published';
  else
    should_publish := new.status = 'published' and (
      old.status is distinct from new.status or
      old.published_version_id is distinct from new.published_version_id or
      old.visibility is distinct from new.visibility
    );
  end if;

  if should_publish and new.visibility = 'investors' then
    perform app.emit_event(
      app.topic_all_investors(), 'financial_report.published', 'financial_report', new.id, actor
    );
  end if;

  return null;
end;
$$;

create or replace function app.emit_inquiry_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(
      app.topic_admin(), 'inquiry.received', 'portal_inquiry', new.id, 'anonymous'
    );
  else
    perform app.emit_event(
      app.topic_admin(), 'inquiry.changed', 'portal_inquiry', new.id, app.current_actor_type()
    );
  end if;
  return null;
end;
$$;

drop trigger if exists financial_periods_emit_events on public.financial_periods;
create trigger financial_periods_emit_events
after insert or update on public.financial_periods
for each row execute function app.emit_financial_period_events();

drop trigger if exists documents_emit_events on public.documents;
create trigger documents_emit_events
after insert or update on public.documents
for each row execute function app.emit_document_events();

drop trigger if exists financial_reports_emit_events on public.financial_reports;
create trigger financial_reports_emit_events
after insert or update on public.financial_reports
for each row execute function app.emit_financial_events();

drop trigger if exists portal_inquiries_emit_events on public.portal_inquiries;
create trigger portal_inquiries_emit_events
after insert or update on public.portal_inquiries
for each row execute function app.emit_inquiry_events();
