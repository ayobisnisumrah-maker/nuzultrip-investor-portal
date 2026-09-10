-- Refund policy hardening after initial implementation.
-- 1) Index the invoice letterhead FK used by policies / joins.
-- 2) Reject overlapping refund tiers at the database boundary as well as in TypeScript.

create index if not exists finance_invoices_terms_letterhead_asset_id_idx
  on public.finance_invoices(terms_letterhead_asset_id)
  where terms_letterhead_asset_id is not null;

create or replace function app.update_finance_policy_settings(
  p_terms_body text,
  p_terms_letterhead_asset_id uuid,
  p_refund_processing_days integer,
  p_refund_day_basis text,
  p_refund_tiers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Missing permission' using errcode = '42501';
  end if;

  if p_refund_processing_days not between 1 and 365 then
    raise exception 'Refund processing days must be between 1 and 365' using errcode = '22023';
  end if;
  if p_refund_day_basis not in ('business_days', 'calendar_days') then
    raise exception 'Invalid refund day basis' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_refund_tiers, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_refund_tiers, '[]'::jsonb)) > 20 then
    raise exception 'Refund tiers must be an array with at most 20 entries' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_refund_tiers, '[]'::jsonb))
      as x("minDaysBeforeDeparture" integer, "maxDaysBeforeDeparture" integer, "refundPercent" numeric)
    where x."minDaysBeforeDeparture" is null
       or x."minDaysBeforeDeparture" < 0
       or x."minDaysBeforeDeparture" > 3650
       or (x."maxDaysBeforeDeparture" is not null and x."maxDaysBeforeDeparture" < x."minDaysBeforeDeparture")
       or (x."maxDaysBeforeDeparture" is not null and x."maxDaysBeforeDeparture" > 3650)
       or x."refundPercent" is null
       or x."refundPercent" < 0
       or x."refundPercent" > 100
  ) then
    raise exception 'Invalid refund tier' using errcode = '22023';
  end if;

  if exists (
    with tiers as (
      select
        row_number() over () as ordinal,
        x."minDaysBeforeDeparture" as min_days,
        x."maxDaysBeforeDeparture" as max_days
      from jsonb_to_recordset(coalesce(p_refund_tiers, '[]'::jsonb))
        as x("minDaysBeforeDeparture" integer, "maxDaysBeforeDeparture" integer, "refundPercent" numeric)
    )
    select 1
    from tiers a
    join tiers b on a.ordinal < b.ordinal
    where a.min_days <= coalesce(b.max_days, 2147483647)
      and b.min_days <= coalesce(a.max_days, 2147483647)
  ) then
    raise exception 'Refund tier ranges must not overlap' using errcode = '22023';
  end if;

  if p_terms_letterhead_asset_id is not null and not exists (
    select 1
    from public.media_assets a
    where a.id = p_terms_letterhead_asset_id
      and a.finalized_at is not null
      and a.mime_type in ('image/png', 'image/jpeg', 'image/webp')
  ) then
    raise exception 'Letterhead asset is not a finalized supported image' using errcode = '22023';
  end if;

  update public.finance_settings
  set
    invoice_terms_body = nullif(btrim(coalesce(p_terms_body, '')), ''),
    terms_letterhead_asset_id = p_terms_letterhead_asset_id,
    refund_processing_days = p_refund_processing_days,
    refund_day_basis = p_refund_day_basis,
    refund_tiers = coalesce(p_refund_tiers, '[]'::jsonb),
    updated_by = auth.uid()
  where singleton = true
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function app.update_finance_policy_settings(text, uuid, integer, text, jsonb)
  from public, anon;
grant execute on function app.update_finance_policy_settings(text, uuid, integer, text, jsonb)
  to authenticated;
