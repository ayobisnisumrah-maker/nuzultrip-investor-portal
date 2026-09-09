import type { Metadata } from 'next'
import { hasPermission } from '@/core/auth/principal'
import { topics } from '@/core/realtime/events'
import { ADMIN_NAVIGATION } from '@/features/admin/navigation'
import { AdminShell, type SerializableNavSection } from '@/features/admin/admin-shell'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { NotificationSoundListener } from '@/features/notifications/notification-sound-listener'
import { requireAdminPage } from '@/server/auth/page-guards'
import { expireMessageThreads, getUnreadMessageCount } from '@/server/messaging/lifecycle'
import { getNotificationSoundSettings } from '@/server/settings/notification-sound'
import { getPublicBrandName } from '@/server/settings/brand'
import { getServerSupabase } from '@/server/supabase/server'
import { getPublicBrandLogo } from '@/server/portal/public-branding'
import { ToastProvider } from '@/ui/toast'
import { TooltipProvider } from '@/ui/menu'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireAdminPage()
  const [sound, brandLogoUrl, brandName] = await Promise.all([
    getNotificationSoundSettings(),
    getPublicBrandLogo(),
    getPublicBrandName(),
  ])
  const supabase = await getServerSupabase()

  await expireMessageThreads(supabase)

  const [initialUnreadMessages, newInquiryResult] = await Promise.all([
    principal.permissions.has('messages.view')
      ? getUnreadMessageCount(supabase)
      : Promise.resolve(0),
    principal.permissions.has('inquiries.view')
      ? supabase
          .from('portal_inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new')
      : Promise.resolve({ count: 0, error: null }),
  ])

  const initialNewInquiries = newInquiryResult.error ? 0 : (newInquiryResult.count ?? 0)

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
            initialUnreadMessages={initialUnreadMessages}
            initialNewInquiries={initialNewInquiries}
            brandLogoUrl={brandLogoUrl}
            brandName={brandName}
          >
            {children}
          </AdminShell>
        </TooltipProvider>
      </ToastProvider>
    </RealtimeProvider>
  )
}
