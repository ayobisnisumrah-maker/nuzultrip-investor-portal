with target_sections as (
  select id, current_version_id, published_version_id
  from public.portal_sections
  where section_kind = 'stat_grid'
), target_versions as (
  select distinct version_id
  from target_sections
  cross join lateral unnest(array[current_version_id, published_version_id]) as version_id
  where version_id is not null
)
update public.portal_section_versions v
set content = jsonb_set(
  v.content,
  '{metrics}',
  coalesce(v.content -> 'metrics', '[]'::jsonb)
    || jsonb_build_array(
      jsonb_build_object(
        'label', 'Total Nilai Penawaran',
        'value', 'Rp5 Miliar',
        'description', '50 Unit × Rp100 Juta'
      )
    ),
  true
)
where v.id in (select version_id from target_versions)
  and jsonb_typeof(v.content -> 'metrics') = 'array'
  and not exists (
    select 1
    from jsonb_array_elements(v.content -> 'metrics') metric
    where lower(coalesce(metric ->> 'label', '')) = 'total nilai penawaran'
  );

update public.portal_sections
set updated_at = now()
where section_kind = 'stat_grid';
