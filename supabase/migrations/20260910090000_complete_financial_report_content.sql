-- Complete financial report drafts atomically: structured figures, KPIs, and
-- an optional restricted attachment are committed as one unit.
create or replace function app.save_financial_report_draft_content(
  p_report_id uuid,
  p_document_asset_id uuid,
  p_line_items jsonb,
  p_kpis jsonb
)
returns table(line_item_count integer, kpi_count integer, document_asset_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_report public.financial_reports%rowtype;
  v_version public.financial_report_versions%rowtype;
  v_period_status public.period_status;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Missing permission: financial_reports.update' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_line_items, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_kpis, '[]'::jsonb)) <> 'array' then
    raise exception 'Financial report content must be JSON arrays.' using errcode = '22023';
  end if;

  if jsonb_array_length(coalesce(p_line_items, '[]'::jsonb)) > 200
     or jsonb_array_length(coalesce(p_kpis, '[]'::jsonb)) > 100 then
    raise exception 'Financial report content exceeds the allowed size.' using errcode = '22023';
  end if;

  select * into v_report
  from public.financial_reports
  where id = p_report_id
  for update;

  if v_report.id is null or v_report.current_version_id is null then
    raise exception 'Financial report or current version not found.' using errcode = 'P0002';
  end if;

  select * into v_version
  from public.financial_report_versions
  where id = v_report.current_version_id
    and financial_report_id = v_report.id
  for update;

  if v_report.status <> 'draft' or v_version.status <> 'draft' then
    raise exception 'Only draft financial reports can be edited.' using errcode = '42501';
  end if;

  select status into v_period_status
  from public.financial_periods
  where id = v_report.financial_period_id;

  if v_period_status = 'locked' then
    raise exception 'Locked financial periods cannot be edited.' using errcode = '42501';
  end if;

  if p_document_asset_id is not null and not exists (
    select 1
    from public.media_assets a
    where a.id = p_document_asset_id
      and a.finalized_at is not null
      and a.visibility = 'restricted'
      and a.bucket = 'financial-documents'
  ) then
    raise exception 'Financial report attachment is invalid.' using errcode = '23503';
  end if;

  delete from public.financial_line_items
  where financial_report_version_id = v_version.id;

  insert into public.financial_line_items (
    financial_report_version_id, statement, category, line_key, label,
    amount, currency, position, note
  )
  select
    v_version.id,
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

  delete from public.financial_kpis
  where financial_report_version_id = v_version.id;

  insert into public.financial_kpis (
    financial_report_version_id, kpi_key, label, value, unit, basis, position
  )
  select
    v_version.id,
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

  update public.financial_report_versions
  set document_asset_id = p_document_asset_id
  where id = v_version.id;

  update public.financial_reports set updated_at = now() where id = v_report.id;

  return query select
    jsonb_array_length(coalesce(p_line_items, '[]'::jsonb)),
    jsonb_array_length(coalesce(p_kpis, '[]'::jsonb)),
    p_document_asset_id;
end;
$$;

revoke all on function app.save_financial_report_draft_content(uuid,uuid,jsonb,jsonb) from public, anon;
grant execute on function app.save_financial_report_draft_content(uuid,uuid,jsonb,jsonb) to authenticated;

create policy media_assets_select_financial_report_admin
  on public.media_assets for select to authenticated
  using (
    app.has_permission('financial_reports.view')
    and (
      (app.has_permission('financial_reports.update') and uploaded_by = auth.uid())
      or exists (
        select 1
        from public.financial_report_versions v
        where v.document_asset_id = public.media_assets.id
      )
    )
  );

-- A report sent for review must be useful to an investor. Prevent incomplete
-- drafts from entering the approval chain even if the RPC is called directly.
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
    if v_version.document_asset_id is null
       or not exists (select 1 from public.financial_line_items where financial_report_version_id = v_version.id)
       or not exists (select 1 from public.financial_kpis where financial_report_version_id = v_version.id) then
      raise exception 'Add an attachment, financial line items, and KPIs before review.' using errcode = '23514';
    end if;
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

revoke all on function app.transition_financial_report(uuid,public.publication_status) from public, anon;
grant execute on function app.transition_financial_report(uuid,public.publication_status) to authenticated;
