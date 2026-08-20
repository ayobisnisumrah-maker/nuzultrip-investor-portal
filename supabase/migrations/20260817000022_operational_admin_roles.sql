-- =============================================================================
-- Split operational administrator role into four dedicated roles.
--
-- Super Admin remains the immutable system authority.
-- admin_internal is retained as a legacy system role for compatibility.
-- New administrators must use one of the four dedicated operational roles.
-- =============================================================================

do $$
declare
  v_role_id uuid;
  v_permission_id uuid;
begin

  -- ---------------------------------------------------------------------------
  -- 1. Admin Investor Relations
  -- ---------------------------------------------------------------------------

  insert into public.roles (
    key,
    name,
    description,
    is_system,
    permission_version
  )
  values (
    'admin_investor_relations',
    'Admin Investor Relations',
    'Mengelola hubungan investor, data investor, inquiry, dan komunikasi investor.',
    true,
    1
  )
  on conflict (key) do update
    set
      name = excluded.name,
      description = excluded.description;

  select id
    into v_role_id
  from public.roles
  where key = 'admin_investor_relations';

  delete from public.role_permissions
  where role_id = v_role_id;

  for v_permission_id in
    select p.id
    from public.permissions p
    where p.key = any(array[
      'dashboard.view',
      'admins.view',
      'investors.view',
      'investors.create',
      'investors.update',
      'investors.approve',
      'investors.reject',
      'investors.deactivate',
      'investors.reactivate',
      'inquiries.view',
      'inquiries.handle',
      'inquiries.convert',
      'messages.view',
      'messages.send',
      'messages.close_thread',
      'investor_documents.view',
      'audit_logs.view'
    ])
  loop
    insert into public.role_permissions (
      role_id,
      permission_id
    )
    values (
      v_role_id,
      v_permission_id
    )
    on conflict do nothing;
  end loop;

  update public.roles
  set permission_version = permission_version + 1
  where id = v_role_id;


  -- ---------------------------------------------------------------------------
  -- 2. Admin Dokumen & Verifikasi
  -- ---------------------------------------------------------------------------

  insert into public.roles (
    key,
    name,
    description,
    is_system,
    permission_version
  )
  values (
    'admin_document_verification',
    'Admin Dokumen & Verifikasi',
    'Mengelola dokumen, pemeriksaan, verifikasi, assignment, dan status dokumen investor.',
    true,
    1
  )
  on conflict (key) do update
    set
      name = excluded.name,
      description = excluded.description;

  select id
    into v_role_id
  from public.roles
  where key = 'admin_document_verification';

  delete from public.role_permissions
  where role_id = v_role_id;

  for v_permission_id in
    select p.id
    from public.permissions p
    where p.key = any(array[
      'dashboard.view',
      'investors.view',
      'investor_documents.view',
      'investor_documents.assign',
      'investor_documents.revoke',
      'documents.view',
      'documents.create',
      'documents.update',
      'documents.review',
      'documents.approve',
      'documents.archive',
      'documents.publish',
      'documents.delete',
      'media.view',
      'media.upload',
      'media.update',
      'audit_logs.view'
    ])
  loop
    insert into public.role_permissions (
      role_id,
      permission_id
    )
    values (
      v_role_id,
      v_permission_id
    )
    on conflict do nothing;
  end loop;

  update public.roles
  set permission_version = permission_version + 1
  where id = v_role_id;


  -- ---------------------------------------------------------------------------
  -- 3. Admin Laporan & Keuangan
  -- ---------------------------------------------------------------------------

  insert into public.roles (
    key,
    name,
    description,
    is_system,
    permission_version
  )
  values (
    'admin_finance_reporting',
    'Admin Laporan & Keuangan',
    'Menyiapkan, mengelola, mereview, dan menerbitkan laporan serta periode keuangan.',
    true,
    1
  )
  on conflict (key) do update
    set
      name = excluded.name,
      description = excluded.description;

  select id
    into v_role_id
  from public.roles
  where key = 'admin_finance_reporting';

  delete from public.role_permissions
  where role_id = v_role_id;

  for v_permission_id in
    select p.id
    from public.permissions p
    where p.key = any(array[
      'dashboard.view',
      'investors.view',
      'investor_documents.view',
      'documents.view',
      'financial_periods.view',
      'financial_periods.create',
      'financial_periods.update',
      'financial_periods.close',
      'financial_reports.view',
      'financial_reports.create',
      'financial_reports.update',
      'financial_reports.review',
      'financial_reports.approve',
      'financial_reports.publish',
      'financial_reports.delete',
      'audit_logs.view'
    ])
  loop
    insert into public.role_permissions (
      role_id,
      permission_id
    )
    values (
      v_role_id,
      v_permission_id
    )
    on conflict do nothing;
  end loop;

  update public.roles
  set permission_version = permission_version + 1
  where id = v_role_id;


  -- ---------------------------------------------------------------------------
  -- 4. Admin Portal & Komunikasi
  -- ---------------------------------------------------------------------------

  insert into public.roles (
    key,
    name,
    description,
    is_system,
    permission_version
  )
  values (
    'admin_portal_communications',
    'Admin Portal & Komunikasi',
    'Mengelola portal investor, company profile, media, pesan, dan komunikasi publik.',
    true,
    1
  )
  on conflict (key) do update
    set
      name = excluded.name,
      description = excluded.description;

  select id
    into v_role_id
  from public.roles
  where key = 'admin_portal_communications';

  delete from public.role_permissions
  where role_id = v_role_id;

  for v_permission_id in
    select p.id
    from public.permissions p
    where p.key = any(array[
      'dashboard.view',
      'company_profile.view',
      'company_profile.update',
      'company_profile.publish',
      'portal.view',
      'portal.update',
      'portal.manage_hero',
      'portal.manage_navigation',
      'portal.manage_theme',
      'portal.manage_cta',
      'portal.publish',
      'media.view',
      'media.upload',
      'media.update',
      'media.delete',
      'messages.view',
      'messages.send',
      'messages.broadcast',
      'messages.close_thread',
      'inquiries.view',
      'inquiries.handle',
      'audit_logs.view'
    ])
  loop
    insert into public.role_permissions (
      role_id,
      permission_id
    )
    values (
      v_role_id,
      v_permission_id
    )
    on conflict do nothing;
  end loop;

  update public.roles
  set permission_version = permission_version + 1
  where id = v_role_id;

end;
$$;

-- =============================================================================
-- Protect operational system-role identity.
-- Permission membership remains manageable through the dedicated role editor.
-- =============================================================================


