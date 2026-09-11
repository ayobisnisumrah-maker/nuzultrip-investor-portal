-- Financial reports are calendar reports, not arbitrary labelled date ranges.
-- NOT VALID intentionally preserves historical rows so administrators can repair
-- them explicitly; PostgreSQL still enforces the rule for every new/updated row.
alter table public.financial_periods
  add constraint financial_periods_calendar_aligned
  check (
    case period_type
      when 'monthly' then
        case
          when period_index between 1 and 12 then
            starts_on = make_date(fiscal_year, period_index, 1)
            and ends_on = (make_date(fiscal_year, period_index, 1) + interval '1 month - 1 day')::date
          else false
        end
      when 'quarterly' then
        case
          when period_index between 1 and 4 then
            starts_on = make_date(fiscal_year, ((period_index - 1) * 3) + 1, 1)
            and ends_on = (
              make_date(fiscal_year, ((period_index - 1) * 3) + 1, 1)
              + interval '3 months - 1 day'
            )::date
          else false
        end
      when 'yearly' then
        case
          when period_index = 1 then
            starts_on = make_date(fiscal_year, 1, 1)
            and ends_on = make_date(fiscal_year, 12, 31)
          else false
        end
    end
  ) not valid;

-- Create the report container, first draft version, generated accounting lines,
-- and KPIs in one PostgreSQL transaction. If any generated content is invalid or
-- RLS rejects a write, the whole function rolls back: there is no empty report
-- left behind after a failed "Buat & isi laporan otomatis" operation.
create or replace function app.create_financial_report_with_generated_draft(
  p_financial_period_id uuid,
  p_title text,
  p_summary text,
  p_visibility public.visibility,
  p_source public.financial_source,
  p_prepared_by text,
  p_notes text,
  p_line_items jsonb,
  p_kpis jsonb
)
returns table(
  report_id uuid,
  version_id uuid,
  status public.publication_status,
  line_item_count integer,
  kpi_count integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_report_id uuid;
  v_version_id uuid;
  v_admin_id uuid := auth.uid();
  v_period public.financial_periods%rowtype;
  v_calendar_aligned boolean := false;
begin
  if not app.has_permission('financial_reports.create') then
    raise exception 'Missing permission: financial_reports.create' using errcode = '42501';
  end if;

  if not app.has_permission('financial_reports.update') then
    raise exception 'Missing permission: financial_reports.update' using errcode = '42501';
  end if;

  if p_visibility not in ('investors'::public.visibility, 'internal'::public.visibility) then
    raise exception 'Financial report visibility must be investors or internal.' using errcode = '23514';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'Financial report title is required.' using errcode = '23514';
  end if;

  if jsonb_typeof(coalesce(p_line_items, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_kpis, '[]'::jsonb)) <> 'array' then
    raise exception 'Financial report generated content must be JSON arrays.' using errcode = '22023';
  end if;

  if jsonb_array_length(coalesce(p_line_items, '[]'::jsonb)) > 200
     or jsonb_array_length(coalesce(p_kpis, '[]'::jsonb)) > 100 then
    raise exception 'Financial report generated content exceeds the allowed size.' using errcode = '22023';
  end if;

  select * into v_period
  from public.financial_periods
  where id = p_financial_period_id
  for update;

  if v_period.id is null then
    raise exception 'Financial period not found.' using errcode = 'P0002';
  end if;

  if v_period.status = 'locked' then
    raise exception 'Locked financial period cannot receive a new report.' using errcode = '42501';
  end if;

  v_calendar_aligned := case v_period.period_type
    when 'monthly' then
      case
        when v_period.period_index between 1 and 12 then
          v_period.starts_on = make_date(v_period.fiscal_year, v_period.period_index, 1)
          and v_period.ends_on = (
            make_date(v_period.fiscal_year, v_period.period_index, 1) + interval '1 month - 1 day'
          )::date
        else false
      end
    when 'quarterly' then
      case
        when v_period.period_index between 1 and 4 then
          v_period.starts_on = make_date(v_period.fiscal_year, ((v_period.period_index - 1) * 3) + 1, 1)
          and v_period.ends_on = (
            make_date(v_period.fiscal_year, ((v_period.period_index - 1) * 3) + 1, 1)
            + interval '3 months - 1 day'
          )::date
        else false
      end
    when 'yearly' then
      case
        when v_period.period_index = 1 then
          v_period.starts_on = make_date(v_period.fiscal_year, 1, 1)
          and v_period.ends_on = make_date(v_period.fiscal_year, 12, 31)
        else false
      end
    else false
  end;

  if not v_calendar_aligned then
    raise exception 'Financial period is not calendar aligned.' using errcode = '23514';
  end if;

  insert into public.financial_reports (
    financial_period_id, title, summary, visibility, status, owner_admin_id
  ) values (
    p_financial_period_id,
    btrim(p_title),
    nullif(btrim(coalesce(p_summary, '')), ''),
    p_visibility,
    'draft',
    v_admin_id
  ) returning id into v_report_id;

  insert into public.financial_report_versions (
    financial_report_id, version_number, status, source, prepared_by, notes, created_by
  ) values (
    v_report_id,
    1,
    'draft',
    p_source,
    nullif(btrim(coalesce(p_prepared_by, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_admin_id
  ) returning id into v_version_id;

  update public.financial_reports
  set current_version_id = v_version_id
  where id = v_report_id;

  insert into public.financial_line_items (
    financial_report_version_id,
    statement,
    category,
    line_key,
    label,
    amount,
    currency,
    position,
    note
  )
  select
    v_version_id,
    item.statement::public.financial_statement,
    item.category::public.financial_category,
    btrim(item.line_key),
    btrim(item.label),
    item.amount,
    upper(btrim(item.currency)),
    item.position,
    nullif(btrim(coalesce(item.note, '')), '')
  from jsonb_to_recordset(coalesce(p_line_items, '[]'::jsonb)) as item(
    statement text,
    category text,
    line_key text,
    label text,
    amount numeric,
    currency text,
    position integer,
    note text
  );

  insert into public.financial_kpis (
    financial_report_version_id,
    kpi_key,
    label,
    value,
    unit,
    basis,
    position
  )
  select
    v_version_id,
    btrim(item.kpi_key),
    btrim(item.label),
    item.value,
    btrim(item.unit),
    btrim(item.basis),
    item.position
  from jsonb_to_recordset(coalesce(p_kpis, '[]'::jsonb)) as item(
    kpi_key text,
    label text,
    value numeric,
    unit text,
    basis text,
    position integer
  );

  return query select
    v_report_id,
    v_version_id,
    'draft'::public.publication_status,
    jsonb_array_length(coalesce(p_line_items, '[]'::jsonb)),
    jsonb_array_length(coalesce(p_kpis, '[]'::jsonb));
end;
$$;

revoke all on function app.create_financial_report_with_generated_draft(
  uuid,text,text,public.visibility,public.financial_source,text,text,jsonb,jsonb
) from public, anon;
grant execute on function app.create_financial_report_with_generated_draft(
  uuid,text,text,public.visibility,public.financial_source,text,text,jsonb,jsonb
) to authenticated;
