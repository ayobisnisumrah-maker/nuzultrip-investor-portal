import type { Metadata } from 'next'
import { hasPermission } from '@/core/auth/principal'
import { topics } from '@/core/realtime/events'
import { ADMIN_NAVIGATION } from '@/features/admin/navigation'
import { AdminShell, type SerializableNavSection } from '@/features/admin/admin-shell'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { NotificationSoundListener } from '@/features/notifications/notification-sound-listener'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getNotificationSoundSettings } from '@/server/settings/notification-sound'
import { ToastProvider } from '@/ui/toast'
import { TooltipProvider } from '@/ui/menu'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin Nuzultrip' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireAdminPage()
  const sound = await getNotificationSoundSettings()

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

  const subscribed = [topics.admin(), topics.user(principal.userId)]

  return (
    <RealtimeProvider topics={subscribed}>
      <NotificationSoundListener
        topics={subscribed}
        role="admin"
        enabled={sound.enabled}
        soundUrl={sound.publicUrl}
        volume={sound.volume}
      />
      <ToastProvider>
        <TooltipProvider delayDuration={200}>
          <AdminShell
            sections={sections}
            fullName={principal.fullName}
            roleName={principal.roleName}
          >
            {children}
          </AdminShell>
        </TooltipProvider>
      </ToastProvider>
    </RealtimeProvider>
  )
}
