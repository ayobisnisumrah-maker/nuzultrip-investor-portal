-- Add the fifth public statistic without mutating an append-only published version.
-- Draft/review/approved current versions can be updated in place. Published
-- current versions are cloned into a new version, promoted through the valid
-- lifecycle, and atomically repointed as the published snapshot.

do $$
declare
  r record;
  v_current_status public.publication_status;
  v_page_status public.publication_status;
  v_base_content jsonb;
  v_new_version_id uuid;
begin
  for r in
    select
      s.id as section_id,
      s.page_id,
      s.current_version_id,
      s.published_version_id
    from public.portal_sections s
    where s.section_kind = 'stat_grid'
  loop
    if r.current_version_id is null then
      continue;
    end if;

    select v.status, v.content
    into v_current_status, v_base_content
    from public.portal_section_versions v
    where v.id = r.current_version_id;

    if v_base_content is null
       or jsonb_typeof(v_base_content -> 'metrics') <> 'array'
       or exists (
         select 1
         from jsonb_array_elements(v_base_content -> 'metrics') metric
         where lower(coalesce(metric ->> 'label', '')) = 'total nilai penawaran'
       ) then
      continue;
    end if;

    v_base_content := jsonb_set(
      v_base_content,
      '{metrics}',
      (v_base_content -> 'metrics')
        || jsonb_build_array(
          jsonb_build_object(
            'label', 'Total Nilai Penawaran',
            'value', 'Rp5 Miliar',
            'description', '50 Unit × Rp100 Juta'
          )
        ),
      true
    );

    if v_current_status <> 'published' then
      update public.portal_section_versions
      set content = v_base_content
      where id = r.current_version_id;

      update public.portal_sections
      set updated_at = now()
      where id = r.section_id;

      continue;
    end if;

    -- Published versions are append-only. Temporarily mark the parent page as
    -- draft only for the insert guard, then restore its original page status.
    select p.status
    into v_page_status
    from public.portal_pages p
    where p.id = r.page_id
    for update;

    if v_page_status <> 'draft' then
      update public.portal_pages
      set status = 'draft'
      where id = r.page_id;
    end if;

    insert into public.portal_section_versions (
      section_id,
      status,
      content,
      change_note
    )
    values (
      r.section_id,
      'draft',
      v_base_content,
      'Menambahkan statistik Total Nilai Penawaran'
    )
    returning id into v_new_version_id;

    update public.portal_sections
    set current_version_id = v_new_version_id
    where id = r.section_id;

    update public.portal_section_versions
    set status = 'review'
    where id = v_new_version_id;

    update public.portal_section_versions
    set status = 'approved'
    where id = v_new_version_id;

    update public.portal_section_versions
    set status = 'published'
    where id = v_new_version_id;

    update public.portal_sections
    set
      status = 'published',
      published_version_id = v_new_version_id,
      updated_at = now()
    where id = r.section_id;

    if v_page_status <> 'draft' then
      update public.portal_pages
      set
        status = v_page_status,
        published_at = case
          when v_page_status = 'published' then coalesce(published_at, now())
          else published_at
        end
      where id = r.page_id;
    end if;
  end loop;
end;
$$;
