create or replace function app.emit_financial_report_child_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
  report_id uuid;
  version_id uuid;
  report_status public.publication_status;
  report_visibility public.content_visibility;
begin
  if tg_table_name = 'financial_report_versions' then
    report_id := case when tg_op = 'DELETE' then old.financial_report_id else new.financial_report_id end;
  else
    version_id := case when tg_op = 'DELETE' then old.financial_report_version_id else new.financial_report_version_id end;
    select v.financial_report_id into report_id
    from public.financial_report_versions v
    where v.id = version_id;
  end if;

  if report_id is null then
    return null;
  end if;

  perform app.emit_event(
    app.topic_admin(),
    'financial_report.state_changed',
    'financial_report',
    report_id,
    actor
  );

  select r.status, r.visibility
    into report_status, report_visibility
  from public.financial_reports r
  where r.id = report_id;

  if report_status = 'published' and report_visibility = 'investors' then
    perform app.emit_event(
      app.topic_all_investors(),
      'financial_report.published',
      'financial_report',
      report_id,
      actor
    );
  end if;

  return null;
end;
$function$;

create or replace function app.emit_document_version_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
  document_id uuid;
begin
  document_id := case when tg_op = 'DELETE' then old.document_id else new.document_id end;

  if document_id is not null then
    perform app.emit_event(
      app.topic_admin(),
      'document.state_changed',
      'document',
      document_id,
      actor
    );
  end if;

  return null;
end;
$function$;

create or replace function app.emit_ownership_offering_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
  offering_id uuid;
begin
  offering_id := case when tg_op = 'DELETE' then old.id else new.id end;

  perform app.emit_event(
    app.topic_admin(),
    'ownership.changed',
    'ownership_offering',
    offering_id,
    actor
  );

  if tg_op <> 'DELETE' then
    perform app.emit_event(
      app.topic_investor(h.investor_id),
      'ownership.changed',
      'ownership_offering',
      offering_id,
      actor
    )
    from public.ownership_holdings h
    where h.offering_id = offering_id
      and h.status = 'active';
  end if;

  return null;
end;
$function$;

drop trigger if exists financial_report_versions_emit_events on public.financial_report_versions;
create trigger financial_report_versions_emit_events
after insert or update or delete on public.financial_report_versions
for each row execute function app.emit_financial_report_child_events();

drop trigger if exists financial_line_items_emit_events on public.financial_line_items;
create trigger financial_line_items_emit_events
after insert or update or delete on public.financial_line_items
for each row execute function app.emit_financial_report_child_events();

drop trigger if exists financial_kpis_emit_events on public.financial_kpis;
create trigger financial_kpis_emit_events
after insert or update or delete on public.financial_kpis
for each row execute function app.emit_financial_report_child_events();

drop trigger if exists document_versions_emit_events on public.document_versions;
create trigger document_versions_emit_events
after insert or update or delete on public.document_versions
for each row execute function app.emit_document_version_events();

drop trigger if exists ownership_offerings_emit_events on public.ownership_offerings;
create trigger ownership_offerings_emit_events
after insert or update or delete on public.ownership_offerings
for each row execute function app.emit_ownership_offering_events();
