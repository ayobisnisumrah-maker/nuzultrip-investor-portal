import type { Permission } from '@/core/rbac/permissions'

/**
 * Complete admin navigation.
 *
 * Navigation is presentation only.
 * Effective permissions are still enforced by page guards,
 * server actions, and database RLS.
 */
export type AdminNavItem = {
  href: string
  label: string
  icon: string
  permission: Permission
  exact?: boolean
}

export type AdminNavSection = {
  title?: string
  items: readonly AdminNavItem[]
}

export const ADMIN_NAVIGATION: readonly AdminNavSection[] = [
  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  {
    items: [
      {
        href: '/admin',
        label: 'Dasbor',
        icon: 'LayoutDashboard',
        permission: 'dashboard.view',
        exact: true,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Investor Relations
  // ---------------------------------------------------------------------------
  {
    title: 'Hubungan Investor',
    items: [
      {
        href: '/admin/investors',
        label: 'Investor',
        icon: 'Users',
        permission: 'investors.view',
      },
      {
        href: '/admin/investors/applications',
        label: 'Pengajuan Investor',
        icon: 'UserCheck',
        permission: 'investors.view',
      },
      {
        href: '/admin/investor-documents',
        label: 'Dokumen Investor',
        icon: 'FileCheck',
        permission: 'investor_documents.view',
      },
      {
        href: '/admin/messages',
        label: 'Pesan',
        icon: 'MessagesSquare',
        permission: 'messages.view',
      },
      {
        href: '/admin/inquiries',
        label: 'Permintaan Masuk',
        icon: 'Inbox',
        permission: 'inquiries.view',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Ownership
  // ---------------------------------------------------------------------------
  {
    title: 'Kepemilikan',
    items: [
      {
        href: '/admin/ownership/offerings',
        label: 'Penawaran Kepemilikan',
        icon: 'BadgePercent',
        permission: 'ownership_offerings.view',
      },
      {
        href: '/admin/ownership',
        label: 'Kepemilikan Investor',
        icon: 'Landmark',
        permission: 'ownership.view',
        exact: true,
      },
      {
        href: '/admin/ownership/transfers',
        label: 'Transfer Kepemilikan',
        icon: 'ArrowLeftRight',
        permission: 'ownership_transfers.view',
      },
      {
        href: '/admin/ownership/inheritance',
        label: 'Pewarisan Kepemilikan',
        icon: 'GitBranch',
        permission: 'ownership_inheritance.view',
      },

    ],
  },

  // ---------------------------------------------------------------------------
  // Finance & Reporting
  // ---------------------------------------------------------------------------
  {
    title: 'Laporan & Keuangan',
    items: [
      {
        href: '/admin/financials',
        label: 'Ringkasan Keuangan',
        icon: 'ChartNoAxesCombined',
        permission: 'financial_reports.view',
        exact: true,
      },
      {
        href: '/admin/financials/periods',
        label: 'Periode Keuangan',
        icon: 'CalendarRange',
        permission: 'financial_periods.view',
      },
      {
        href: '/admin/financials/reports',
        label: 'Laporan Keuangan',
        icon: 'FileBarChart',
        permission: 'financial_reports.view',
      },
      {
        href: '/admin/financials/kpis',
        label: 'KPI Keuangan',
        icon: 'ChartNoAxesColumnIncreasing',
        permission: 'financial_reports.view',
      },      {
        href: '/admin/profit-distributions',
        label: 'Distribusi Bagi Hasil',
        icon: 'WalletCards',
        permission: 'profit_distributions.view',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------
  {
    title: 'Dokumen',
    items: [
      {
        href: '/admin/documents',
        label: 'Pustaka Dokumen',
        icon: 'Files',
        permission: 'documents.view',
      },
      {
        href: '/admin/documents/verification',
        label: 'Verifikasi Dokumen',
        icon: 'FileCheck2',
        permission: 'documents.review',
      },
      {
        href: '/admin/data-room',
        label: 'Data Room',
        icon: 'FolderLock',
        permission: 'documents.view',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Public Investor Portal
  // ---------------------------------------------------------------------------
  {
    title: 'Portal Investor',
    items: [
      {
        href: '/admin/portal',
        label: 'Ringkasan Portal',
        icon: 'Globe2',
        permission: 'portal.view',
        exact: true,
      },
      {
        href: '/admin/portal/pages',
        label: 'Halaman',
        icon: 'PanelsTopLeft',
        permission: 'portal.view',
      },
      {
        href: '/admin/portal/hero',
        label: 'Hero',
        icon: 'GalleryHorizontalEnd',
        permission: 'portal.manage_hero',
      },
      {
        href: '/admin/portal/navigation',
        label: 'Navigasi',
        icon: 'Menu',
        permission: 'portal.manage_navigation',
      },
      {
        href: '/admin/portal/cta',
        label: 'CTA',
        icon: 'MousePointerClick',
        permission: 'portal.manage_cta',
      },
      {
        href: '/admin/portal/faq',
        label: 'FAQ',
        icon: 'CircleHelp',
        permission: 'portal.update',
      },
      {
        href: '/admin/portal/media',
        label: 'Media',
        icon: 'Image',
        permission: 'media.view',
      },
      {
        href: '/admin/portal/documents',
        label: 'Dokumen Portal',
        icon: 'FileText',
        permission: 'portal.view',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Company
  // ---------------------------------------------------------------------------
  {
    title: 'Perusahaan',
    items: [
      {
        href: '/admin/company-profile',
        label: 'Profil Perusahaan',
        icon: 'Building2',
        permission: 'company_profile.view',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // System
  // ---------------------------------------------------------------------------
  {
    title: 'Sistem',
    items: [
      {
        href: '/admin/administrators',
        label: 'Administrator',
        icon: 'UserCog',
        permission: 'admins.view',
      },
      {
        href: '/admin/roles',
        label: 'Role & Permission',
        icon: 'ShieldCheck',
        permission: 'roles.view',
      },
      {
        href: '/admin/settings',
        label: 'Pengaturan',
        icon: 'Settings',
        permission: 'settings.view',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Security
  // ---------------------------------------------------------------------------
  {
    title: 'Keamanan',
    items: [
      {
        href: '/admin/audit-logs',
        label: 'Audit Log',
        icon: 'ScrollText',
        permission: 'audit_logs.view',
      },
    ],
  },
]

