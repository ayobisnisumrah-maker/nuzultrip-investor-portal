/**
 * The permission catalogue â€” defined once, here.
 *
 * This module is the source for:
 *   1. the `Permission` union type used by every guard,
 *   2. the rows seeded into `public.permissions`,
 *   3. the grouping shown in the role editor.
 *
 * `permissions.test.ts` parses the seed migration and fails if the two drift
 * apart, so the duplication between TypeScript and SQL cannot rot.
 *
 * See docs/RBAC.md Â§2.
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
  },
  {
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
    description: 'Melihat informasi pembayaran distribu²È="24€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€µ•‘¥„œ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…ĞÁÕÍÑ…­„µ•‘¥„¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€µ•‘¥„œ°(€€€…Ñ¥½¸è€ÕÁ±½…œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹Õ¹… ‰•É­…Ì­”ÁÕÍÑ…­„µ•‘¥„¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€µ•‘¥„œ°(€€€…Ñ¥½¸è€ÕÁ‘…Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹Õ‰… µ•Ñ…‘…Ñ„‰•É­…Ìµ•‘¥„¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€µ•‘¥„œ°(€€€…Ñ¥½¸è€‘•±•Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹¡…ÁÕÌ‰•É­…Ìµ•‘¥„¸œ°(€ô°((€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(€€¼¨5•ÍÍ…•Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€µ•ÍÍ…•Ìœ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…ĞÍ•±ÕÉÕ Á•É…­…Á…¸¥¹Ù•ÍÑ½È¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€µ•ÍÍ…•Ìœ°(€€€…Ñ¥½¸è€Í•¹œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹¥É¥´Á•Í…¸­•Á…‘„¥¹Ù•ÍÑ½È¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€µ•ÍÍ…•Ìœ°(€€€…Ñ¥½¸è€‰É½…‘…ÍĞœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹¥É¥´Á•Í…¸Í¥…É…¸­”‰…¹å…¬¥¹Ù•ÍÑ½È¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°(€ì(€€€µ½‘Õ±”è€µ•ÍÍ…•Ìœ°(€€€…Ñ¥½¸è€±½Í•}Ñ¡É•…œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹ÕÑÕÀÁ•É…­…Á…¸¸œ°(€ô°((€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(€€¼¨%¹ÅÕ¥É¥•Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€¥¹ÅÕ¥É¥•Ìœ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…ĞÁ•Éµ¥¹Ñ……¸‘…É¤Á½ÉÑ…°ÁÕ‰±¥¬¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€¥¹ÅÕ¥É¥•Ìœ°(€€€…Ñ¥½¸è€¡…¹‘±”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹¥¹‘…­±…¹©ÕÑ¤Á•Éµ¥¹Ñ……¸µ…ÍÕ¬¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€¥¹ÅÕ¥É¥•Ìœ°(€€€…Ñ¥½¸è€½¹Ù•ÉĞœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹Õ‰… Á•Éµ¥¹Ñ……¸µ•¹©…‘¤Á•¹…©Õ…¸¥¹Ù•ÍÑ½È¸œ°(€ô°((€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(€€¼¨‘µ¥¹Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€…‘µ¥¹Ìœ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…Ğ‘…™Ñ…È…‘µ¥¹¥ÍÑÉ…Ñ½È¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€…‘µ¥¹Ìœ°(€€€…Ñ¥½¸è€É•…Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•µ‰Õ…Ğ…‘µ¥¹¥ÍÑÉ…Ñ½È¥¹Ñ•É¹…°‰…ÉÔ¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°(€ì(€€€µ½‘Õ±”è€…‘µ¥¹Ìœ°(€€€…Ñ¥½¸è€ÕÁ‘…Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹Õ‰… ‘…Ñ„…‘µ¥¹¥ÍÑÉ…Ñ½È¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€…‘µ¥¹Ìœ°(€€€…Ñ¥½¸è€‘¥Í…‰±”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹½¹…­Ñ¥™­…¸…‘µ¥¹¥ÍÑÉ…Ñ½È¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°(€ì(€€€µ½‘Õ±”è€…‘µ¥¹Ìœ°(€€€…Ñ¥½¸è€É•Í•Ñ}Á…ÍÍİ½Éœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹¥É¥´Ñ…ÕÑ…¸…ÑÕÈÕ±…¹œ­…Ñ„Í…¹‘¤…‘µ¥¹¥ÍÑÉ…Ñ½È¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°((€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(€€¼¨I½±•Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€É½±•Ìœ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…ĞÁ•É…¸‘…¸¥é¥¹¹å„¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€É½±•Ìœ°(€€€…Ñ¥½¸è€É•…Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•µ‰Õ…ĞÁ•É…¸­¡ÕÍÕÌ¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°(€ì(€€€µ½‘Õ±”è€É½±•Ìœ°(€€€…Ñ¥½¸è€ÕÁ‘…Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹Õ‰… ¥é¥¸å…¹œ‘¥µ¥±¥­¤Í•‰Õ… Á•É…¸¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°(€ì(€€€µ½‘Õ±”è€É½±•Ìœ°(€€€…Ñ¥½¸è€‘•±•Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹¡…ÁÕÌÁ•É…¸­¡ÕÍÕÌ¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°(€ì(€€€µ½‘Õ±”è€É½±•Ìœ°(€€€…Ñ¥½¸è€…ÍÍ¥¸œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•µ‰•É¥­…¸Á•É…¸­•Á…‘„…‘µ¥¹¥ÍÑÉ…Ñ½È¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°((€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(€€¼¨A•Éµ¥ÍÍ¥½¹Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€Á•Éµ¥ÍÍ¥½¹Ìœ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…Ğ­…Ñ…±½œ¥é¥¸¸œ°(€ô°((€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(€€¼¨Õ‘¥Ğ1½Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€…Õ‘¥Ñ}±½Ìœ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…Ğ±½œ…Õ‘¥Ğ¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€…Õ‘¥Ñ}±½Ìœ°(€€€…Ñ¥½¸è€•áÁ½ÉĞœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹•­ÍÁ½È±½œ…Õ‘¥Ğ¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°((€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(€€¼¨M•ÑÑ¥¹Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(€€¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼((€ì(€€€µ½‘Õ±”è€Í•ÑÑ¥¹Ìœ°(€€€…Ñ¥½¸è€Ù¥•Üœ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•±¥¡…ĞÁ•¹…ÑÕÉ…¸Í¥ÍÑ•´¸œ°(€ô°(€ì(€€€µ½‘Õ±”è€Í•ÑÑ¥¹Ìœ°(€€€…Ñ¥½¸è€ÕÁ‘…Ñ”œ°(€€€‘•ÍÉ¥ÁÑ¥½¸è€5•¹Õ‰… Á•¹…ÑÕÉ…¸Í¥ÍÑ•´¸œ°(€€€‘…¹•É½ÕÌèÑÉÕ”°(€ô°)t…Ì½¹ÍĞÍ…Ñ¥Í™¥•ÌÉ•…‘½¹±äA•Éµ¥ÍÍ¥½¹•™¥¹¥Ñ¥½¹mt()•áÁ½ÉĞÑåÁ”A•Éµ¥ÍÍ¥½¸€ô(€€‘ì¡ÑåÁ•½˜AI5%MM%=9L¥m¹Õµ‰•Éulµ½‘Õ±”uô¸‘ì¡ÑåÁ•½˜AI5%MM%=9L¥m¹Õµ‰•Éul…Ñ¥½¸uõ€((¼¨¨Ù•ÉäÁ•Éµ¥ÍÍ¥½¸­•ä°¥¸…Ñ…±½Õ”½É‘•È¸€¨¼)•áÁ½ÉĞ½¹ÍĞAI5%MM%=9}-eLèÉ•…‘½¹±äÍÑÉ¥¹mt€ôAI5%MM%=9L¹µ…À (€€¡Á•Éµ¥ÍÍ¥½¸¤€ôø€‘íÁ•Éµ¥ÍÍ¥½¸¹µ½‘Õ±•ô¸‘íÁ•Éµ¥ÍÍ¥½¸¹…Ñ¥½¹õ€°(¤()½¹ÍĞAI5%MM%=9}-e}MPèI•…‘½¹±åM•ĞñÍÑÉ¥¹œø€ô¹•ÜM•Ğ¡AI5%MM%=9}-eL¤()•áÁ½ÉĞ™Õ¹Ñ¥½¸¥ÍA•Éµ¥ÍÍ¥½¸¡Ù…±Õ”èÕ¹­¹½İ¸¤èÙ…±Õ”¥ÌA•Éµ¥ÍÍ¥½¸ì(€É•ÑÕÉ¸ÑåÁ•½˜Ù…±Õ”€ôôô€ÍÑÉ¥¹œœ€˜˜AI5%MM%=9}-e}MP¹¡…Ì¡Ù…±Õ”¤)ô()•áÁ½ÉĞ™Õ¹Ñ¥½¸Á•Éµ¥ÍÍ¥½¹-•ä¡‘•™¥¹¥Ñ¥½¸èA•Éµ¥ÍÍ¥½¹•™¥¹¥Ñ¥½¸¤èÍÑÉ¥¹œì(€É•ÑÕÉ¸€‘í‘•™¥¹¥Ñ¥½¸¹µ½‘Õ±•ô¸‘í‘•™¥¹¥Ñ¥½¸¹…Ñ¥½¹õ€)ô()•áÁ½ÉĞ½¹ÍĞ9I=UM}AI5%MM%=9LèÉ•…‘½¹±äÍÑÉ¥¹mt€ôAI5%MM%=9L¹™¥±Ñ•È (€€¡Á•Éµ¥ÍÍ¥½¸¤€ôø€‘…¹•É½ÕÌœ¥¸Á•Éµ¥ÍÍ¥½¸°(¤¹µ…À¡Á•Éµ¥ÍÍ¥½¹-•ä¤((¼¨¨…Ñ…±½Õ”É½ÕÁ•‰äµ½‘Õ±”°™½ÈÑ¡”É½±”•‘¥Ñ½È¸€¨¼)•áÁ½ÉĞ™Õ¹Ñ¥½¸Á•Éµ¥ÍÍ¥½¹Í	å5½‘Õ±” ¤èI•…‘½¹±åÉÉ…äñì(€µ½‘Õ±”èA•Éµ¥ÍÍ¥½¹5½‘Õ±”(€±…‰•°èÍÑÉ¥¹œ(€Á•Éµ¥ÍÍ¥½¹ÌèÉ•…‘½¹±äA•Éµ¥ÍÍ¥½¹•™¥¹¥Ñ¥½¹mt)ôøì(€É•ÑÕÉ¸AI5%MM%=9}5=U1L¹µ…À ¡µ½‘Õ±”¤€ôø€¡ì(€€€µ½‘Õ±”°(€€€±…‰•°è5=U1}1	1Mmµ½‘Õ±•t°(€€€Á•Éµ¥ÍÍ¥½¹ÌèAI5%MM%=9L¹™¥±Ñ•È ¡Á•Éµ¥ÍÍ¥½¸¤€ôøÁ•Éµ¥ÍÍ¥½¸¹µ½‘Õ±”€ôôôµ½‘Õ±”¤°(€ô¤¤)ô((¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼(¼¨MåÍÑ•´É½±•Ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¨¼(¼¨€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´€¨¼()•áÁ½ÉĞ½¹ÍĞMeMQ5}I=1}-eL€ôlÍÕÁ•É}…‘µ¥¸œ°€…‘µ¥¹}¥¹Ñ•É¹…°t…Ì½¹ÍĞ)•áÁ½ÉĞÑåÁ”MåÍÑ•µI½±•-•ä€ô€¡ÑåÁ•½˜MeMQ5}I=1}-eL¥m¹Õµ‰•Ét((¼¨¨(€¨ÍÕÁ•É}…‘µ¥¹€¥Ì¥¹Ñ•¹Ñ¥½¹…±±ä…‰Í•¹Ğ™É½´Ñ¡¥Ìµ…Àè¥Ğ¥ÌÉ•Í½±Ù•…Ì(€¨€‰¡½±‘Ì•Ù•ÉåÑ¡¥¹œˆ¥¹Í¥‘”…ÁÀ¹¡…Í}Á•Éµ¥ÍÍ¥½¹€°Í¼„¹•İ±ä…‘‘•Á•Éµ¥ÍÍ¥½¸¥Ì(€¨½Ù•É•…ÕÑ½µ…Ñ¥…±±ä…¹¥Ì¹•Ù•ÈÍ¥±•¹Ñ±äÉ…¹Ñ•Ñ¼…¹½Ñ¡•ÈÉ½±”¸(€¨¼)•áÁ½ÉĞ½¹ÍĞ5%9}%9QI91}a1UM%=9LèÉ•…‘½¹±äÍÑÉ¥¹mt€ôl(€€¼¼5…¹…¥¹œÍÑ…™˜…¹É½±•Ì¥Ì„MÕÁ•È‘µ¥¸Á½İ•È¸…‘µ¥¹Ì¹Ù¥•İ€¥Ì(€€¼¼‘•±¥‰•É…Ñ•±ä€©¹½Ğ¨•á±Õ‘•èÍ••¥¹œİ¡¼å½ÕÈ½±±•…Õ•Ì…É”¥Ì‰•¹¥¸…¹(€€¼¼¥Ì¹••‘•Ñ¼…ÍÍ¥¸„É•±…Ñ¥½¹Í¡¥Àµ…¹…•È¸(€€…‘µ¥¹Ì¹É•…Ñ”œ°(€€…‘µ¥¹Ì¹ÕÁ‘…Ñ”œ°(€€…‘µ¥¹Ì¹‘¥Í…‰±”œ°(€€…‘µ¥¹Ì¹É•Í•Ñ}Á…ÍÍİ½Éœ°(€€É½±•Ì¹É•…Ñ”œ°(€€É½±•Ì¹ÕÁ‘…Ñ”œ°(€€É½±•Ì¹‘•±•Ñ”œ°(€€É½±•Ì¹…ÍÍ¥¸œ°((€€¼¼¡…¹¥¹œÍåÍÑ•´½¹™¥ÕÉ…Ñ¥½¸°•áÁ½ÉÑ¥¹œÁ•ÉÍ½¹…°‘…Ñ„°…¹‘•ÍÑÉ½å¥¹œ…¸(€€¼¼¥¹Ù•ÍÑ½ÈÉ•½É…É”…±°¥ÉÉ•Ù•ÉÍ¥‰±”½È•áÑ•É¹…±±ä½¹Í•ÅÕ•¹Ñ¥…°¸(€€Í•ÑÑ¥¹Ì¹ÕÁ‘…Ñ”œ°(€€¥¹Ù•ÍÑ½ÉÌ¹‘•±•Ñ”œ°(€€¥¹Ù•ÍÑ½ÉÌ¹•áÁ½ÉĞœ°(€€…Õ‘¥Ñ}±½Ì¹•áÁ½ÉĞœ°)t()•áÁ½ÉĞ™Õ¹Ñ¥½¸…‘µ¥¹%¹Ñ•É¹…±A•Éµ¥ÍÍ¥½¹Ì ¤èÉ•…‘½¹±äÍÑÉ¥¹mtì(€½¹ÍĞ•á±Õ‘•€ô¹•ÜM•Ğ¡5%9}%9QI91}a1UM%=9L¤((€É•ÑÕÉ¸AI5%MM%=9}-eL¹™¥±Ñ•È ¡­•ä¤€ôø€…•á±Õ‘•¹¡…Ì¡­•ä¤¤)ô(