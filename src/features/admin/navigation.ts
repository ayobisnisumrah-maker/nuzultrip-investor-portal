import type { Permission } from '@/core/rbac/permissions'

/**
 * The admin navigation.
 *
 * Entries are added here as their pages are built, so the sidebar never offers
 * a link to a route that does not exist. Each entry declares the permission it
 * requires; the shell filters by the principal's effective set.
 *
 * Filtering is presentation only. Hiding a link is a courtesy — the page
 * itself, its actions, and RLS all check again.
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
