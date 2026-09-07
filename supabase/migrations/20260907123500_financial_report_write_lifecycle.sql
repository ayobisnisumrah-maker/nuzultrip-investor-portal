create or replace function app.create_financial_report_with_draft(
  p_financial_period_id uuid,
  p_title text,
  p_summary text default null,
  p_visibility public.visibility default 'investors',
  p_source public.financial_source default 'internal',
  p_prepared_by text default null,
  p_notes text default null
)
returns table(report_id uuid, version_id uuid, status public.publication_status)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_report_id uuid;
  v_version_id uuid;
  v_admin_id uuid := auth.uid();
  v_period_status public.period_status;
begin
  if not app.has_permission('financial_reports.create') then
    raise exception 'Missing permission: financial_reports.create' using errcode = '42501';
  end if;

  if p_visibility not in ('investors'::public.visibility, 'internal'::public.visibility) then
    raise exception 'Financial report visibility must be investors or internal.' using errcode = '23514';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'Financial report title is required.' using errcode = '23514';
  end if;

  select fp.status into v_period_status
  from public.financial_periods fp
  where fp.id = p_financial_period_id
  for update;

  if v_period_status is null then
    raise exception 'Financial period not found.' using errcode = 'P0002';
  end if;

  if v_period_status = 'locked' then
    raise exception 'Locked financial period cannot receive a new report.' using errcode = '42501';
  end if;

  insert into public.financial_reports (
    financial_period_id, title, summary, visibility, status, owner_admin_id
  ) values (
    p_financial_period_id, btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''), p_visibility,
    'draft', v_admin_id
  ) returning id into v_report_id;

  insert into public.financial_report_versions (
    financial_report_id, version_number, status, source, prepared_by, notes, created_by
  ) values (
    v_report_id, 1, 'draft', p_source,
    nullif(btrim(coalesce(p_prepared_by, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''), v_admin_id
  ) returning id into v_version_id;

  update public.financial_reports
  set current_version_id = v_version_id
  where id = v_report_id;

  return query select v_report_id, v_version_id, 'draft'::public.publication_status;
end;
$$;

grant execute on function app.create_financial_report_with_draft(uuid,text,text,public.visibility,public.financial_source,text,text) to authenticated;

create or replace function app.transition_financial_report(
  p_report_id uuid,
  p_target public.publication_status
)
returns table(report_id uuid, version_id uuid, previous_status public.publication_status, status public.publication_status)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_report public.financial_reports%rowtype;
  v_version public.financial_report_versions%rowtype;
  v_permission text;
  v_now timestamptz := now();
begin
  select * into v_report from public.financial_reports where id = p_report_id for update;
  if v_report.id is null then
    raise exception 'Financial report not found.' using errcode = 'P0002';
  end if;
  if v_report.current_version_id is null then
    raise exception 'Financial report has no current version.' using errcode = '23514';
  end if;

  select * into v_version from public.financial_report_versions
  where id = v_report.current_version_id and financial_report_id = v_report.id
  for update;
  if v_version.id is null then
    raise exception 'Current financial report version not found.' using errcode = 'P0002';
  end if;

  if v_report.status = 'draft' and p_target = 'review' then
    v_permission := 'financial_reports.review';
  elsif v_report.status = 'review' and p_target = 'approved' then
    v_permission := 'financial_reports.approve';
  elsif v_report.status = 'approved' and p_target = 'published' then
    v_permission := 'financial_reports.publish';
  else
    raise exception 'Invalid financial report transition: % -> %', v_report.status, p_target using errcode = '42501';
  end if;

  if not app.has_permission(v_permission) then
    raise exception 'Missing permission: %', v_permission using errcode = '42501';
  end if;

  if p_target = 'review' then
    update public.financial_report_versions set status = 'review' where id = v_version.id;
    update public.financial_reports set status = 'review' where id = v_report.id;
  elsif p_target = 'approved' then
    update public.financial_report_versions
    set status = 'approved', approved_by = auth.uid(), approved_at = v_now
    where id = v_version.id;
    update public.financial_reports set status = 'approved' where id = v_report.id;
  elsif p_target = 'published' then
    update public.financial_report_versions
    set status = 'published', published_at = v_now
    where id = v_version.id;
    update public.financial_reports
    set status = 'published', published_version_id = v_version.id
    where id = v_report.id;
  end if;

  return query select v_report.id, v_version.id, v_report.status, p_target;
end;
$$;

grant execute on function app.transition_financial_report(uuid,public.publication_status) to authenticated;

drop policy if exists financial_reports_update_admin on public.financial_reports;
create policy financial_reports_update_admin on public.financial_reports
for update to authenticated
using (
  app.has_permission('financial_reports.update') or
  app.has_permission('financial_reports.review') or
  app.has_permission('financial_reports.approve') or
  app.has_permission('financial_reports.publish')
)
with check (
  app.has_permission('financial_reports.update') or
  app.has_permission('financial_reports.review') or
  app.has_permission('financial_reports.approve') or
  app.has_permission('financial_reports.publish')
);

drop policy if exists financial_report_versions_update_admin on public.financial_report_versions;
create policy financial_report_versions_update_admin on public.financial_report_versions
for update to authenticated
using (
  app.has_permission('financial_reports.update') or
  app.has_permission('financial_reports.review') or
  app.has_permission('financial_reports.approve') or
  app.has_permission('financial_reports.publish')
)
with check (
  app.has_permission('financial_reports.update') or
  app.has_permission('financial_reports.review') or
  app.has_permission('financial_reports.approve') or
  app.has_permission('financial_reports.publish')
);
