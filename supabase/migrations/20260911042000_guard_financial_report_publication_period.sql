-- Official financial reports must not be published from an open or future period.
-- This migration hardens both period closure and report publication so investor-facing
-- reports can only become authoritative after the reporting period has ended.

create or replace function app.guard_financial_period_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /*
   * Metadata changes require financial_periods.update.
   * Status changes are handled separately and require financial_periods.close.
   */
  if new.status is distinct from old.status then
    if not app.has_permission('financial_periods.close') then
      raise exception
        'Changing financial period status requires financial_periods.close.'
        using errcode = '42501';
    end if;

    /*
     * A period cannot become closed/locked before its configured end date.
     * This prevents future periods from becoming authoritative sources for
     * investor distributions.
     */
    if new.status in ('closed', 'locked') and old.ends_on > current_date then
      raise exception
        'Financial period cannot be closed or locked before its end date (%).',
        old.ends_on
        using errcode = '23514';
    end if;

    /*
     * Allowed lifecycle:
     * open   -> closed
     * open   -> locked
     * closed -> locked
     * locked has no outgoing transition.
     */
    if old.status = 'open' and new.status in ('closed', 'locked') then
      return new;
    end if;

    if old.status = 'closed' and new.status = 'locked' then
      return new;
    end if;

    raise exception
      'Financial period status cannot move from % to %.',
      old.status,
      new.status
      using errcode = '23514';
  end if;

  if old.status = 'locked' then
    raise exception
      'Locked financial periods cannot be modified.'
      using errcode = '42501';
  end if;

  if not app.has_permission('financial_periods.update') then
    raise exception
      'Updating financial period metadata requires financial_periods.update.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function app.transition_financial_report(
  p_report_id uuid,
  p_target public.publication_status
)
returns table(
  report_id uuid,
  version_id uuid,
  previous_status public.publication_status,
  status public.publication_status
)
language plpgsql
set search_path = ''
as $$
declare
  v_report public.financial_reports%rowtype;
  v_version public.financial_report_versions%rowtype;
  v_period_status public.period_status;
  v_period_end date;
  v_permission text;
  v_now timestamptz := now();
begin
  select * into v_report
  from public.financial_reports
  where id = p_report_id
  for update;

  if v_report.id is null then
    raise exception 'Financial report not found.' using errcode = 'P0002';
  end if;

  if v_report.current_version_id is null then
    raise exception 'Financial report has no current version.' using errcode = '23514';
  end if;

  select * into v_version
  from public.financial_report_versions
  where id = v_report.current_version_id
    and financial_report_id = v_report.id
  for update;

  if v_version.id is null then
    raise exception 'Current financial report version not found.' using errcode = 'P0002';
  end if;

  if v_report.status = 'draft' and p_target = 'review' then
    v_permission := 'financial_reports.review';

    if v_version.document_asset_id is null
       or not exists (
         select 1
         from public.financial_line_items
         where financial_report_version_id = v_version.id
       )
       or not exists (
         select 1
         from public.financial_kpis
         where financial_report_version_id = v_version.id
       ) then
      raise exception
        'Add an attachment, financial line items, and KPIs before review.'
        using errcode = '23514';
    end if;
  elsif v_report.status = 'review' and p_target = 'approved' then
    v_permission := 'financial_reports.approve';
  elsif v_report.status = 'approved' and p_target = 'published' then
    v_permission := 'financial_reports.publish';

    select fp.status, fp.ends_on
      into v_period_status, v_period_end
    from public.financial_periods fp
    where fp.id = v_report.financial_period_id
    for share;

    if v_period_status is null then
      raise exception 'Financial period not found.' using errcode = 'P0002';
    end if;

    if v_period_status not in ('closed', 'locked') then
      raise exception
        'Financial period must be closed or locked before publishing the report.'
        using errcode = '23514';
    end if;

    if v_period_end > current_date then
      raise exception
        'Financial report cannot be published before the period end date (%).',
        v_period_end
        using errcode = '23514';
    end if;
  else
    raise exception
      'Invalid financial report transition: % -> %',
      v_report.status,
      p_target
      using errcode = '42501';
  end if;

  if not app.has_permission(v_permission) then
    raise exception 'Missing permission: %', v_permission using errcode = '42501';
  end if;

  if p_target = 'review' then
    update public.financial_report_versions
    set status = 'review'
    where id = v_version.id;

    update public.financial_reports
    set status = 'review'
    where id = v_report.id;
  elsif p_target = 'approved' then
    update public.financial_report_versions
    set status = 'approved',
        approved_by = auth.uid(),
        approved_at = v_now
    where id = v_version.id;

    update public.financial_reports
    set status = 'approved'
    where id = v_report.id;
  elsif p_target = 'published' then
    update public.financial_report_versions
    set status = 'published',
        published_at = v_now
    where id = v_version.id;

    update public.financial_reports
    set status = 'published',
        published_version_id = v_version.id
    where id = v_report.id;
  end if;

  return query
  select v_report.id, v_version.id, v_report.status, p_target;
end;
$$;
