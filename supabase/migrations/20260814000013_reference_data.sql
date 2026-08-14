-- =============================================================================
-- Reference data
--
-- Structural, non-business data that the authorisation model and the portal
-- shell require in order to function. Idempotent: safe to re-run.
--
-- This migration contains NO business data — no investors, no documents, no
-- financial figures, and no marketing copy. Portal content is authored in Admin
-- (docs/ROADMAP.md, continuous obligations).
--
-- The catalogue below mirrors src/core/rbac/permissions.ts exactly.
-- `src/core/rbac/permissions.test.ts` parses this file and fails on drift.
-- =============================================================================

-- Migrations run inside a transaction, so these staging tables disappear on
-- commit. They exist so the catalogue is written once and drives both the
-- upsert and the prune, rather than being repeated per statement.
create temporary table _permission_catalogue (
  key text primary key,
  module text not null,
  action text not null,
  description text not null,
  is_dangerous boolean not null
) on commit drop;

insert into _permission_catalogue (key, module, action, description, is_dangerous) values
  ('dashboard.view', 'dashboard', 'view', 'Melihat dasbor admin.', false),

  ('investors.view', 'investors', 'view', 'Melihat daftar dan profil investor.', false),
  ('investors.create', 'investors', 'create', 'Membuat catatan investor secara manual.', false),
  ('investors.update', 'investors', 'update', 'Mengubah data profil investor.', false),
  ('investors.delete', 'investors', 'delete', 'Menghapus catatan investor.', true),
  ('investors.approve', 'investors', 'approve', 'Menyetujui pengajuan investor.', true),
  ('investors.reject', 'investors', 'reject', 'Menolak pengajuan investor.', false),
  ('investors.deactivate', 'investors', 'deactivate', 'Menonaktifkan investor aktif.', false),
  ('investors.reactivate', 'investors', 'reactivate', 'Mengaktifkan kembali investor nonaktif.', false),
  ('investors.export', 'investors', 'export', 'Mengekspor data investor.', true),

  ('investor_documents.view', 'investor_documents', 'view', 'Melihat pemberian akses dokumen per investor.', false),
  ('investor_documents.assign', 'investor_documents', 'assign', 'Memberikan akses dokumen kepada investor.', false),
  ('investor_documents.revoke', 'investor_documents', 'revoke', 'Mencabut akses dokumen investor.', false),

  ('documents.view', 'documents', 'view', 'Melihat dokumen dan seluruh versinya.', false),
  ('documents.create', 'documents', 'create', 'Membuat dokumen dan versi draf.', false),
  ('documents.update', 'documents', 'update', 'Mengubah dokumen dan versi yang belum terbit.', false),
  ('documents.delete', 'documents', 'delete', 'Menghapus versi yang belum terbit.', false),
  ('documents.review', 'documents', 'review', 'Mengirim dokumen untuk peninjauan.', false),
  ('documents.approve', 'documents', 'approve', 'Menyetujui dokumen untuk penerbitan.', false),
  ('documents.publish', 'documents', 'publish', 'Menerbitkan dokumen kepada investor.', true),
  ('documents.archive', 'documents', 'archive', 'Mengarsipkan dokumen yang telah terbit.', false),

  ('company_profile.view', 'company_profile', 'view', 'Melihat profil perusahaan dan riwayat versinya.', false),
  ('company_profile.update', 'company_profile', 'update', 'Mengubah profil perusahaan.', false),
  ('company_profile.publish', 'company_profile', 'publish', 'Menerbitkan versi profil perusahaan.', true),

  ('financial_periods.view', 'financial_periods', 'view', 'Melihat periode pelaporan keuangan.', false),
  ('financial_periods.create', 'financial_periods', 'create', 'Membuat periode pelaporan baru.', false),
  ('financial_periods.update', 'financial_periods', 'update', 'Mengubah periode pelaporan.', false),
  ('financial_periods.close', 'financial_periods', 'close', 'Menutup atau mengunci periode pelaporan.', true),

  ('financial_reports.view', 'financial_reports', 'view', 'Melihat laporan keuangan dan angka rinciannya.', false),
  ('financial_reports.create', 'financial_reports', 'create', 'Membuat laporan keuangan dan versi draf.', false),
  ('financial_reports.update', 'financial_reports', 'update', 'Mengubah angka pada versi yang belum terbit.', false),
  ('financial_reports.delete', 'financial_reports', 'delete', 'Menghapus versi laporan yang belum terbit.', false),
  ('financial_reports.review', 'financial_reports', 'review', 'Mengirim laporan keuangan untuk peninjauan.', false),
  ('financial_reports.approve', 'financial_reports', 'approve', 'Menyetujui laporan keuangan.', false),
  ('financial_reports.publish', 'financial_reports', 'publish', 'Menerbitkan laporan keuangan kepada investor.', true),

  ('portal.view', 'portal', 'view', 'Melihat konten portal termasuk draf.', false),
  ('portal.update', 'portal', 'update', 'Mengubah halaman dan bagian portal.', false),
  ('portal.publish', 'portal', 'publish', 'Menerbitkan perubahan portal ke publik.', true),
  ('portal.manage_theme', 'portal', 'manage_theme', 'Mengubah tema, logo, dan tipografi portal.', false),
  ('portal.manage_navigation', 'portal', 'manage_navigation', 'Mengubah navigasi dan tautan portal.', false),
  ('portal.manage_hero', 'portal', 'manage_hero', 'Mengubah bagian hero portal.', false),
  ('portal.manage_cta', 'portal', 'manage_cta', 'Mengubah ajakan bertindak pada portal.', false),

  ('media.view', 'media', 'view', 'Melihat pustaka media.', false),
  ('media.upload', 'media', 'upload', 'Mengunggah berkas ke pustaka media.', false),
  ('media.update', 'media', 'update', 'Mengubah metadata berkas media.', false),
  ('media.delete', 'media', 'delete', 'Menghapus berkas media.', false),

  ('messages.view', 'messages', 'view', 'Melihat seluruh percakapan investor.', false),
  ('messages.send', 'messages', 'send', 'Mengirim pesan kepada investor.', false),
  ('messages.broadcast', 'messages', 'broadcast', 'Mengirim pesan siaran ke banyak investor.', true),
  ('messages.close_thread', 'messages', 'close_thread', 'Menutup percakapan.', false),

  ('inquiries.view', 'inquiries', 'view', 'Melihat permintaan dari portal publik.', false),
  ('inquiries.handle', 'inquiries', 'handle', 'Menindaklanjuti permintaan masuk.', false),
  ('inquiries.convert', 'inquiries', 'convert', 'Mengubah permintaan menjadi pengajuan investor.', false),

  ('admins.view', 'admins', 'view', 'Melihat daftar administrator.', false),
  ('admins.create', 'admins', 'create', 'Membuat administrator internal baru.', true),
  ('admins.update', 'admins', 'update', 'Mengubah data administrator.', false),
  ('admins.disable', 'admins', 'disable', 'Menonaktifkan administrator.', true),
  ('admins.reset_password', 'admins', 'reset_password', 'Mengirim tautan atur ulang kata sandi administrator.', true),

  ('roles.view', 'roles', 'view', 'Melihat peran dan izinnya.', false),
  ('roles.create', 'roles', 'create', 'Membuat peran khusus.', true),
  ('roles.update', 'roles', 'update', 'Mengubah izin yang dimiliki sebuah peran.', true),
  ('roles.delete', 'roles', 'delete', 'Menghapus peran khusus.', true),
  ('roles.assign', 'roles', 'assign', 'Memberikan peran kepada administrator.', true),

  ('permissions.view', 'permissions', 'view', 'Melihat katalog izin.', false),

  ('audit_logs.view', 'audit_logs', 'view', 'Melihat log audit.', false),
  ('audit_logs.export', 'audit_logs', 'export', 'Mengekspor log audit.', true),

  ('settings.view', 'settings', 'view', 'Melihat pengaturan sistem.', false),
  ('settings.update', 'settings', 'update', 'Mengubah pengaturan sistem.', true);

insert into public.permissions (key, module, action, description, is_dangerous)
select key, module, action, description, is_dangerous from _permission_catalogue
on conflict (key) do update
  set module = excluded.module,
      action = excluded.action,
      description = excluded.description,
      is_dangerous = excluded.is_dangerous;

-- A permission dropped from the catalogue must not linger: it would keep
-- granting access through every role that still references it.
delete from public.permissions p
where not exists (select 1 from _permission_catalogue c where c.key = p.key);

-- -----------------------------------------------------------------------------
-- System roles
-- -----------------------------------------------------------------------------
insert into public.roles (key, name, description, is_system) values
  (
    'super_admin',
    'Super Admin',
    'Akses penuh. Ditentukan sebagai "memiliki seluruh izin" di dalam app.has_permission, bukan melalui baris role_permissions.',
    true
  ),
  (
    'admin_internal',
    'Admin Internal',
    'Operasional harian hubungan investor: investor, dokumen, laporan, portal, dan pesan. Tidak dapat mengelola administrator, peran, atau pengaturan sistem.',
    true
  )
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description;

-- Admin Internal holds everything except staff management, role management,
-- system settings, and irreversible data operations.
--
-- Expressed as an exclusion list rather than an allow-list on purpose: a newly
-- added permission should reach the operational role by default. An allow-list
-- would silently leave every new feature unusable until someone noticed.
--
-- Mirrors ADMIN_INTERNAL_EXCLUSIONS in src/core/rbac/permissions.ts.
create temporary table _admin_internal_exclusions (key text primary key) on commit drop;

insert into _admin_internal_exclusions (key) values
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
  ('audit_logs.export');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key = 'admin_internal'
  and not exists (select 1 from _admin_internal_exclusions e where e.key = p.key)
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.key = 'admin_internal'
  and exists (select 1 from _admin_internal_exclusions e where e.key = p.key);

-- -----------------------------------------------------------------------------
-- Portal shell
--
-- Structure only. Sections and copy are authored in Admin — nothing here
-- pretends to be finished content.
-- -----------------------------------------------------------------------------
insert into public.portal_pages (slug, title, page_kind, status, position, is_system)
values ('home', 'Beranda', 'home', 'draft', 0, true)
on conflict (slug) do nothing;

insert into public.portal_theme (name, is_active, radius_preset, typography_preset, default_color_scheme)
select 'Mizan', true, 'balanced', 'mizan', 'system'
where not exists (select 1 from public.portal_theme);

-- -----------------------------------------------------------------------------
-- Site settings
--
-- `is_public` is opt-in per key: a setting is invisible to anonymous visitors
-- unless someone deliberately marks it readable. Values that are the company's
-- to supply are seeded as null rather than invented.
-- -----------------------------------------------------------------------------
insert into public.site_settings (key, value, description, is_public) values
  ('organization.name', '"Nuzultrip"'::jsonb,
   'Nama tampilan organisasi pada portal dan surel.', true),
  ('organization.tagline', '"Berjalan bersama dan berkembang bersama."'::jsonb,
   'Semboyan yang ditampilkan pada portal.', true),
  ('contact.investor_relations_email', 'null'::jsonb,
   'Alamat surel hubungan investor yang ditampilkan pada portal.', true),
  ('legal.disclaimer', 'null'::jsonb,
   'Pernyataan informasional standar yang menyertai bagian keuangan dan proyeksi.', true),
  ('workflow.require_separate_approver', 'true'::jsonb,
   'Bila aktif, penyetuju sebuah versi harus berbeda dari penyusunnya.', false),
  -- Public: the portal has to know whether to render the application form at
  -- all, and the fact that applications are open is not sensitive.
  ('workflow.investor_application_open', 'true'::jsonb,
   'Bila nonaktif, formulir pengajuan investor pada portal ditutup.', true),
  ('notifications.default_email_enabled', 'true'::jsonb,
   'Nilai bawaan preferensi notifikasi surel untuk akun baru.', false)
on conflict (key) do update
  set description = excluded.description,
      is_public = excluded.is_public;
