/**
 * The permission catalogue — defined once, here.
 *
 * This module is the source for:
 *   1. the `Permission` union type used by every guard,
 *   2. the rows seeded into `public.permissions`,
 *   3. the grouping shown in the role editor.
 *
 * `permissions.test.ts` parses the seed migration and fails if the two drift
 * apart, so the duplication between TypeScript and SQL cannot rot.
 *
 * See docs/RBAC.md §2.
 */

export type PermissionDefinition = {
  module: PermissionModule
  action: string
  description: string
  /** Flagged in the role editor and always audited. */
  dangerous?: true
}

export const PERMISSION_MODULES = [
  'dashboard',
  'investors',
  'ownership_offerings',
  'ownership',
  'profit_distributions',
  'profit_distribution_payments',
  'ownership_transfers',
  'ownership_inheritance',
  'investor_documents',
  'documents',
  'company_profile',
  'financial_periods',
  'financial_reports',
  'portal',
  'media',
  'messages',
  'inquiries',
  'admins',
  'roles',
  'permissions',
  'audit_logs',
  'settings',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const MODULE_LABELS: Readonly<Record<PermissionModule, string>> = {
  dashboard: 'Dasbor',
  investors: 'Investor',
  ownership_offerings: 'Penawaran Kepemilikan',
  ownership: 'Kepemilikan Investor',
  profit_distributions: 'Distribusi Bagi Hasil',
  profit_distribution_payments: 'Pembayaran Distribusi Bagi Hasil',
  ownership_transfers: 'Transfer Kepemilikan',
  ownership_inheritance: 'Pewarisan Kepemilikan',
  investor_documents: 'Dokumen investor',
  documents: 'Dokumen',
  company_profile: 'Profil perusahaan',
  financial_periods: 'Periode keuangan',
  financial_reports: 'Laporan keuangan',
  portal: 'Portal publik',
  media: 'Media',
  messages: 'Pesan',
  inquiries: 'Permintaan masuk',
  admins: 'Administrator',
  roles: 'Peran',
  permissions: 'Izin',
  audit_logs: 'Log audit',
  settings: 'Pengaturan',
}

/**
 * Note on scope: investor reports and business updates are *documents*
 * (`document_kind`), so they are governed by `documents.*` rather than a
 * parallel module. Notifications are personal and governed by ownership, not by
 * a permission. Modelling either twice would create two answers to the same
 * question.
 */
export const PERMISSIONS = [
  /* ------------------------------------------------------------------------ */
  /* Dashboard                                                                */
  /* ------------------------------------------------------------------------ */

  {
    module: 'dashboard',
    action: 'view',
    description: 'Melihat dasbor admin.',
  },

  /* ------------------------------------------------------------------------ */
  /* Investors                                                                */
  /* ------------------------------------------------------------------------ */

  {
    module: 'investors',
    action: 'view',
    description: 'Melihat daftar dan profil investor.',
  },
  {
    module: 'investors',
    action: 'create',
    description: 'Membuat catatan investor secara manual.',
  },
  {
    module: 'investors',
    action: 'update',
    description: 'Mengubah data profil investor.',
  },
  {
    module: 'investors',
    action: 'delete',
    description: 'Menghapus catatan investor.',
    dangerous: true,
  },
  {
    module: 'investors',
    action: 'approve',
    description: 'Menyetujui pengajuan investor.',
    dangerous: true,
  },
  {
    module: 'investors',
    action: 'reject',
    description: 'Menolak pengajuan investor.',
  },
  {
    module: 'investors',
    action: 'deactivate',
    description: 'Menonaktifkan investor aktif.',
  },
  {
    module: 'investors',
    action: 'reactivate',
    description: 'Mengaktifkan kembali investor nonaktif.',
  },
  {
    module: 'investors',
    action: 'export',
    description: 'Mengekspor data investor.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Ownership Offerings                                                      */
  /* ------------------------------------------------------------------------ */

  {
    module: 'ownership_offerings',
    action: 'view',
    description: 'Melihat konfigurasi dan penawaran kepemilikan.',
  },
  {
    module: 'ownership_offerings',
    action: 'create',
    description: 'Membuat penawaran kepemilikan baru.',
  },
  {
    module: 'ownership_offerings',
    action: 'update',
    description: 'Mengubah konfigurasi penawaran kepemilikan.',
  },
  {
    module: 'ownership_offerings',
    action: 'publish',
    description: 'Membuka atau menerbitkan penawaran kepemilikan.',
    dangerous: true,
  },  {
    module: 'ownership_offerings',
    action: 'pause',
    description: 'Menghentikan sementara penawaran kepemilikan yang sedang aktif.',
    dangerous: true,
  },
  {
    module: 'ownership_offerings',
    action: 'resume',
    description: 'Membuka kembali penawaran kepemilikan yang sedang dihentikan sementara.',
  },
  {
    module: 'ownership_offerings',
    action: 'close',
    description: 'Menutup penawaran kepemilikan sehingga tidak dapat menerima investasi baru.',
    dangerous: true,
  },
  {
    module: 'ownership_offerings',
    action: 'archive',
    description: 'Mengarsipkan penawaran kepemilikan yang telah ditutup.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Ownership                                                                */
  /* ------------------------------------------------------------------------ */

  {
    module: 'ownership',
    action: 'view',
    description: 'Melihat kepemilikan investor.',
  },
  {
    module: 'ownership',
    action: 'create',
    description: 'Mencatat atau mengalokasikan kepemilikan investor.',
    dangerous: true,
  },
  {
    module: 'ownership',
    action: 'update',
    description: 'Mengubah data kepemilikan investor.',
    dangerous: true,
  },
  {
    module: 'ownership',
    action: 'delete',
    description: 'Membatalkan catatan kepemilikan investor.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Profit Distributions                                                     */
  /* ------------------------------------------------------------------------ */

  {
    module: 'profit_distributions',
    action: 'view',
    description: 'Melihat perhitungan dan distribusi bagi hasil.',
  },
  {
    module: 'profit_distributions',
    action: 'create',
    description: 'Membuat perhitungan distribusi bagi hasil.',
  },
  {
    module: 'profit_distributions',
    action: 'update',
    description: 'Mengubah distribusi bagi hasil yang belum disetujui.',
  },
  {
    module: 'profit_distributions',
    action: 'approve',
    description: 'Menyetujui distribusi bagi hasil.',
    dangerous: true,
  },
  {
    module: 'profit_distributions',
    action: 'publish',
    description: 'Menerbitkan distribusi bagi hasil kepada investor.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Profit Distribution Payments                                             */
  /* ------------------------------------------------------------------------ */

  {
    module: 'profit_distribution_payments',
    action: 'view',
    description: 'Melihat informasi pembayaran distribusi bagi hasil.',
  },
  {
    module: 'profit_distribution_payments',
    action: 'upload_proof',
    description:
      'Mengunggah bukti transfer pembayaran kepada investor.',
  },
  {
    module: 'profit_distribution_payments',
    action: 'replace_proof',
    description:
      'Mengganti bukti transfer pembayaran kepada investor.',
  },
  {
    module: 'profit_distribution_payments',
    action: 'mark_paid',
    description:
      'Menandai pembayaran distribusi bagi hasil sebagai telah dibayar.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Ownership Transfers                                                      */
  /* ------------------------------------------------------------------------ */

  {
    module: 'ownership_transfers',
    action: 'view',
    description: 'Melihat permintaan transfer kepemilikan.',
  },
  {
    module: 'ownership_transfers',
    action: 'create',
    description: 'Mengajukan transfer kepemilikan.',
  },
  {
    module: 'ownership_transfers',
    action: 'approve',
    description: 'Menyetujui transfer kepemilikan.',
    dangerous: true,
  },
  {
    module: 'ownership_transfers',
    action: 'reject',
    description: 'Menolak transfer kepemilikan.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Ownership Inheritance                                                    */
  /* ------------------------------------------------------------------------ */

  {
    module: 'ownership_inheritance',
    action: 'view',
    description: 'Melihat proses pewarisan kepemilikan.',
  },
  {
    module: 'ownership_inheritance',
    action: 'create',
    description: 'Membuat pengajuan pewarisan kepemilikan.',
  },
  {
    module: 'ownership_inheritance',
    action: 'approve',
    description: 'Menyetujui pewarisan kepemilikan.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Investor Documents                                                       */
  /* ------------------------------------------------------------------------ */

  {
    module: 'investor_documents',
    action: 'view',
    description: 'Melihat pemberian akses dokumen per investor.',
  },
  {
    module: 'investor_documents',
    action: 'assign',
    description: 'Memberikan akses dokumen kepada investor.',
  },
  {
    module: 'investor_documents',
    action: 'revoke',
    description: 'Mencabut akses dokumen investor.',
  },

  /* ------------------------------------------------------------------------ */
  /* Documents                                                                */
  /* ------------------------------------------------------------------------ */

  {
    module: 'documents',
    action: 'view',
    description: 'Melihat dokumen dan seluruh versinya.',
  },
  {
    module: 'documents',
    action: 'create',
    description: 'Membuat dokumen dan versi draf.',
  },
  {
    module: 'documents',
    action: 'update',
    description: 'Mengubah dokumen dan versi yang belum terbit.',
  },
  {
    module: 'documents',
    action: 'delete',
    description: 'Menghapus versi yang belum terbit.',
  },
  {
    module: 'documents',
    action: 'review',
    description: 'Mengirim dokumen untuk peninjauan.',
  },
  {
    module: 'documents',
    action: 'approve',
    description: 'Menyetujui dokumen untuk penerbitan.',
  },
  {
    module: 'documents',
    action: 'publish',
    description: 'Menerbitkan dokumen kepada investor.',
    dangerous: true,
  },
  {
    module: 'documents',
    action: 'archive',
    description: 'Mengarsipkan dokumen yang telah terbit.',
  },

  /* ------------------------------------------------------------------------ */
  /* Company Profile                                                          */
  /* ------------------------------------------------------------------------ */

  {
    module: 'company_profile',
    action: 'view',
    description: 'Melihat profil perusahaan dan riwayat versinya.',
  },
  {
    module: 'company_profile',
    action: 'update',
    description: 'Mengubah profil perusahaan.',
  },
  {
    module: 'company_profile',
    action: 'publish',
    description: 'Menerbitkan versi profil perusahaan.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Financial Periods                                                        */
  /* ------------------------------------------------------------------------ */

  {
    module: 'financial_periods',
    action: 'view',
    description: 'Melihat periode pelaporan keuangan.',
  },
  {
    module: 'financial_periods',
    action: 'create',
    description: 'Membuat periode pelaporan baru.',
  },
  {
    module: 'financial_periods',
    action: 'update',
    description: 'Mengubah periode pelaporan.',
  },
  {
    module: 'financial_periods',
    action: 'close',
    description: 'Menutup atau mengunci periode pelaporan.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Financial Reports                                                        */
  /* ------------------------------------------------------------------------ */

  {
    module: 'financial_reports',
    action: 'view',
    description: 'Melihat laporan keuangan dan angka rinciannya.',
  },
  {
    module: 'financial_reports',
    action: 'create',
    description: 'Membuat laporan keuangan dan versi draf.',
  },
  {
    module: 'financial_reports',
    action: 'update',
    description: 'Mengubah angka pada versi yang belum terbit.',
  },
  {
    module: 'financial_reports',
    action: 'delete',
    description: 'Menghapus versi laporan yang belum terbit.',
  },
  {
    module: 'financial_reports',
    action: 'review',
    description: 'Mengirim laporan keuangan untuk peninjauan.',
  },
  {
    module: 'financial_reports',
    action: 'approve',
    description: 'Menyetujui laporan keuangan.',
  },
  {
    module: 'financial_reports',
    action: 'publish',
    description: 'Menerbitkan laporan keuangan kepada investor.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Portal                                                                   */
  /* ------------------------------------------------------------------------ */

  {
    module: 'portal',
    action: 'view',
    description: 'Melihat konten portal termasuk draf.',
  },
  {
    module: 'portal',
    action: 'update',
    description: 'Mengubah halaman dan bagian portal.',
  },
  {
    module: 'portal',
    action: 'publish',
    description: 'Menerbitkan perubahan portal ke publik.',
    dangerous: true,
  },
  {
    module: 'portal',
    action: 'manage_theme',
    description: 'Mengubah tema, logo, dan tipografi portal.',
  },
  {
    module: 'portal',
    action: 'manage_navigation',
    description: 'Mengubah navigasi dan tautan portal.',
  },
  {
    module: 'portal',
    action: 'manage_hero',
    description: 'Mengubah bagian hero portal.',
  },
  {
    module: 'portal',
    action: 'manage_cta',
    description: 'Mengubah ajakan bertindak pada portal.',
  },

  /* ------------------------------------------------------------------------ */
  /* Media                                                                    */
  /* ------------------------------------------------------------------------ */

  {
    module: 'media',
    action: 'view',
    description: 'Melihat pustaka media.',
  },
  {
    module: 'media',
    action: 'upload',
    description: 'Mengunggah berkas ke pustaka media.',
  },
  {
    module: 'media',
    action: 'update',
    description: 'Mengubah metadata berkas media.',
  },
  {
    module: 'media',
    action: 'delete',
    description: 'Menghapus berkas media.',
  },

  /* ------------------------------------------------------------------------ */
  /* Messages                                                                 */
  /* ------------------------------------------------------------------------ */

  {
    module: 'messages',
    action: 'view',
    description: 'Melihat seluruh percakapan investor.',
  },
  {
    module: 'messages',
    action: 'send',
    description: 'Mengirim pesan kepada investor.',
  },
  {
    module: 'messages',
    action: 'broadcast',
    description: 'Mengirim pesan siaran ke banyak investor.',
    dangerous: true,
  },
  {
    module: 'messages',
    action: 'close_thread',
    description: 'Menutup percakapan.',
  },

  /* ------------------------------------------------------------------------ */
  /* Inquiries                                                                */
  /* ------------------------------------------------------------------------ */

  {
    module: 'inquiries',
    action: 'view',
    description: 'Melihat permintaan dari portal publik.',
  },
  {
    module: 'inquiries',
    action: 'handle',
    description: 'Menindaklanjuti permintaan masuk.',
  },
  {
    module: 'inquiries',
    action: 'convert',
    description: 'Mengubah permintaan menjadi pengajuan investor.',
  },

  /* ------------------------------------------------------------------------ */
  /* Admins                                                                   */
  /* ------------------------------------------------------------------------ */

  {
    module: 'admins',
    action: 'view',
    description: 'Melihat daftar administrator.',
  },
  {
    module: 'admins',
    action: 'create',
    description: 'Membuat administrator internal baru.',
    dangerous: true,
  },
  {
    module: 'admins',
    action: 'update',
    description: 'Mengubah data administrator.',
  },
  {
    module: 'admins',
    action: 'disable',
    description: 'Menonaktifkan administrator.',
    dangerous: true,
  },
  {
    module: 'admins',
    action: 'reset_password',
    description:
      'Mengirim tautan atur ulang kata sandi administrator.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Roles                                                                    */
  /* ------------------------------------------------------------------------ */

  {
    module: 'roles',
    action: 'view',
    description: 'Melihat peran dan izinnya.',
  },
  {
    module: 'roles',
    action: 'create',
    description: 'Membuat peran khusus.',
    dangerous: true,
  },
  {
    module: 'roles',
    action: 'update',
    description: 'Mengubah izin yang dimiliki sebuah peran.',
    dangerous: true,
  },
  {
    module: 'roles',
    action: 'delete',
    description: 'Menghapus peran khusus.',
    dangerous: true,
  },
  {
    module: 'roles',
    action: 'assign',
    description: 'Memberikan peran kepada administrator.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Permissions                                                              */
  /* ------------------------------------------------------------------------ */

  {
    module: 'permissions',
    action: 'view',
    description: 'Melihat katalog izin.',
  },

  /* ------------------------------------------------------------------------ */
  /* Audit Logs                                                               */
  /* ------------------------------------------------------------------------ */

  {
    module: 'audit_logs',
    action: 'view',
    description: 'Melihat log audit.',
  },
  {
    module: 'audit_logs',
    action: 'export',
    description: 'Mengekspor log audit.',
    dangerous: true,
  },

  /* ------------------------------------------------------------------------ */
  /* Settings                                                                 */
  /* ------------------------------------------------------------------------ */

  {
    module: 'settings',
    action: 'view',
    description: 'Melihat pengaturan sistem.',
  },
  {
    module: 'settings',
    action: 'update',
    description: 'Mengubah pengaturan sistem.',
    dangerous: true,
  },
] as const satisfies readonly PermissionDefinition[]

export type Permission =
  `${(typeof PERMISSIONS)[number]['module']}.${(typeof PERMISSIONS)[number]['action']}`

/** Every permission key, in catalogue order. */
export const PERMISSION_KEYS: readonly string[] = PERMISSIONS.map(
  (permission) => `${permission.module}.${permission.action}`,
)

const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(PERMISSION_KEYS)

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && PERMISSION_KEY_SET.has(value)
}

export function permissionKey(definition: PermissionDefinition): string {
  return `${definition.module}.${definition.action}`
}

export const DANGEROUS_PERMISSIONS: readonly string[] = PERMISSIONS.filter(
  (permission) => 'dangerous' in permission,
).map(permissionKey)

/** Catalogue grouped by module, for the role editor. */
export function permissionsByModule(): ReadonlyArray<{
  module: PermissionModule
  label: string
  permissions: readonly PermissionDefinition[]
}> {
  return PERMISSION_MODULES.map((module) => ({
    module,
    label: MODULE_LABELS[module],
    permissions: PERMISSIONS.filter(
      (permission) => permission.module === module,
    ),
  }))
}

/* -------------------------------------------------------------------------- */
/* System roles                                                               */
/* -------------------------------------------------------------------------- */

export const SYSTEM_ROLE_KEYS = ['super_admin', 'admin_internal'] as const
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number]

/**
 * `super_admin` is intentionally absent from this map: it is resolved as
 * "holds everything" inside `app.has_permission`, so a newly added permission is
 * covered automatically and is never silently granted to another role.
 */
export const ADMIN_INTERNAL_EXCLUSIONS: readonly string[] = [
  // Managing staff and roles is a Super Admin power. `admins.view` is
  // deliberately *not* excluded: seeing who your colleagues are is benign and
  // is needed to assign a relationship manager.
  'admins.create',
  'admins.update',
  'admins.disable',
  'admins.reset_password',
  'roles.create',
  'roles.update',
  'roles.delete',
  'roles.assign',

  // Changing system configuration, exporting personal data, and destroying an
  // investor record are all irreversible or externally consequential.
  'settings.update',
  'investors.delete',
  'investors.export',
  'audit_logs.export',
]

export function adminInternalPermissions(): readonly string[] {
  const excluded = new Set(ADMIN_INTERNAL_EXCLUSIONS)

  return PERMISSION_KEYS.filter(
    (key) => !excluded.has(key),
  )
}
