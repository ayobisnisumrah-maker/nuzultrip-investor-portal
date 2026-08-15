import type { Permission } from '@/core/rbac/permissions'

/**
 * The admin navigation.
 *
 * Entries are added here only when their destination route exists.
 * The shell filters entries by the principal's effective permissions.
 *
 * Filtering is presentation only. Every page, server action, and database RLS
 * policy remains responsible for enforcing authorization independently.
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
        href: '/admin/documents',
        label: 'Dokumen',
        icon: 'FileText',
        permission: 'documents.view',
      },
    ],
  },
]
