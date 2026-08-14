import type { Metadata } from 'next'
import { hasPermission } from '@/core/auth/principal'
import { ADMIN_NAVIGATION } from '@/features/admin/navigation'
import { AdminShell, type SerializableNavSection } from '@/features/admin/admin-shell'
import { requireAdminPage } from '@/server/auth/page-guards'
import { ToastProvider } from '@/ui/toast'
import { TooltipProvider } from '@/ui/menu'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin Nuzultrip' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireAdminPage()

  // Sections with no visible items are dropped entirely, so a restricted role
  // does not see an empty heading and wonder what is missing.
  const sections: SerializableNavSection[] = ADMIN_NAVIGATION.map((section) => ({
    ...(section.title ? { title: section.title } : {}),
    items: section.items
      .filter((item) => hasPermission(principal, item.permission))
      .map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        ...(item.exact ? { exact: true } : {}),
      })),
  })).filter((section) => section.items.length > 0)

  return (
    <ToastProvider>
      <TooltipProvider delayDuration={200}>
        <AdminShell sections={sections} fullName={principal.fullName} roleName={principal.roleName}>
          {children}
        </AdminShell>
      </TooltipProvider>
    </ToastProvider>
  )
}
