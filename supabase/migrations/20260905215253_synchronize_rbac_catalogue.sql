-- =============================================================================
-- Synchronize the application RBAC catalogue with the database.
--
-- The application catalogue is authoritative for display metadata and danger
-- flags. Operational system roles remain database-managed, while the legacy
-- admin_internal role intentionally retains every permission except the
-- documented Super Admin exclusions.
-- =============================================================================

with desired(key, description, is_dangerous) as (
  values
    (
      'ownership_inheritance.approve',
      'Menyetujui pewarisan kepemilikan.',
      true
    ),
    (
      'ownership_offerings.archive',
      'Mengarsipkan penawaran kepemilikan yang telah ditutup.',
      true
    ),
    (
      'ownership_offerings.close',
      'Menutup penawaran kepemilikan sehingga tidak dapat menerima investasi baru.',
      true
    ),
    (
      'ownership_offerings.create',
      'Membuat penawaran kepemilikan baru.',
      false
    ),
    (
      'ownership_offerings.pause',
      'Menghentikan sementara penawaran kepemilikan yang sedang aktif.',
      true
    ),
    (
      'ownership_offerings.publish',
      'Membuka atau menerbitkan penawaran kepemilikan.',
      true
    ),
    (
      'ownership_offerings.resume',
      'Membuka kembali penawaran kepemilikan yang sedang dihentikan sementara.',
      false
    ),
    (
      'ownership_offerings.update',
      'Mengubah konfigurasi penawaran kepemilikan.',
      false
    ),
    (
      'ownership_offerings.view',
      'Melihat konfigurasi dan penawaran kepemilikan.',
      false
    ),
    (
      'ownership.create',
      'Mencatat atau mengalokasikan kepemilikan investor.',
      true
    ),
    (
      'ownership.delete',
      'Membatalkan catatan kepemilikan investor.',
      true
    ),
    (
      'ownership.update',
      'Mengubah data kepemilikan investor.',
      true
    ),
    (
      'profit_distribution_payments.mark_paid',
      'Menandai pembayaran distribusi bagi hasil sebagai telah dibayar.',
      true
    ),
    (
      'profit_distributions.approve',
      'Menyetujui distribusi bagi hasil.',
      true
    ),
    (
      'profit_distributions.publish',
      'Menerbitkan distribusi bagi hasil kepada investor.',
      true
    )
)
update public.permissions as permission
set
  description = desired.description,
  is_dangerous = desired.is_dangerous
from desired
where permission.key = desired.key
  and (
    permission.description is distinct from desired.description
    or permission.is_dangerous is distinct from desired.is_dangerous
  );

with legacy_role as (
  select id
  from public.roles
  where key = 'admin_internal'
),
excluded(key) as (
  values
    ('admins.create'),
    ('admins.update'),
    ('admins.disable'),
    ('admins.reset_password'),
    ('roles.create'),
    ('roles.update'),
    ('roles.delete'),
    ('roles.assign'),
    ('settings.update'),
    ('investors.delete'),
    ('investors.export'),
    ('audit_logs.export')
),
removed as (
  delete from public.role_permissions as grant_row
  using legacy_role, public.permissions as permission
  where grant_row.role_id = legacy_role.id
    and grant_row.permission_id = permission.id
    and permission.key in (select key from excluded)
  returning grant_row.role_id
),
added as (
  insert into public.role_permissions(role_id, permission_id)
  select legacy_role.id, permission.id
  from legacy_role
  cross join public.permissions as permission
  where permission.key not in (select key from excluded)
  on conflict do nothing
  returning role_id
),
touched_roles as (
  select role_id from removed
  union
  select role_id from added
)
update public.roles as role
set permission_version = role.permission_version + 1
where role.id in (select role_id from touched_roles);

-- RLS policies and the document workflow guard invoke these SECURITY DEFINER
-- predicates as the signed-in caller. PostgreSQL therefore requires EXECUTE
-- even though protected reads run as the function owner. Keep them unavailable
-- to anonymous callers and expose only their boolean authorization results.
revoke execute on function app.investor_granted_document(uuid) from public, anon;
revoke execute on function app.participates_in_thread(uuid) from public, anon;
revoke execute on function app.document_workflow_permission_allowed(public.publication_status)
  from public, anon;

grant execute on function app.investor_granted_document(uuid) to authenticated;
grant execute on function app.participates_in_thread(uuid) to authenticated;
grant execute on function app.document_workflow_permission_allowed(public.publication_status)
  to authenticated;

-- These two signed-in workflow RPCs are called by permission-gated Server
-- Actions. Their own SECURITY DEFINER bodies repeat authorization checks; anon
-- remains denied. A remote schema snapshot accidentally removed these grants.
revoke execute on function app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility,
  uuid
) from public, anon;
revoke execute on function app.create_investor_message_thread(uuid, text, text)
  from public, anon;

grant execute on function app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility,
  uuid
) to authenticated;
grant execute on function app.create_investor_message_thread(uuid, text, text)
  to authenticated;
