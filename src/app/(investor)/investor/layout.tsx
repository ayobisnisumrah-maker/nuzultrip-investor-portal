import type { Metadata } from 'next'
import { topics } from '@/core/realtime/events'
import { AppShell, Brand } from '@/ui/shell'
import { Avatar } from '@/ui/primitives'
import { LiveNavBadge } from '@/features/investor/live-nav-badge'
import { SignOutButton } from '@/features/shell/sign-out-button'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { RealtimeStatus } from '@/features/realtime/realtime-status'
import { NotificationSoundListener } from '@/features/notifications/notification-sound-listener'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getUnreadMessageCount } from '@/server/messaging/lifecycle'
import { getNotificationSoundSettings } from '@/server/settings/notification-sound'
import { getServerSupabase } from '@/server/supabase/server'
import { getPublicBrandLogo } from '@/server/portal/public-branding'
import { ToastProvider } from '@/ui/toast'
import { TooltipProvider } from '@/ui/menu'

export const metadata: Metadata = {
  title: { default: 'Investor', template: '%s · Investor Nuzultrip' },
  robots: { index: false, follow: false },
}

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireInvestorPage()
  const [sound, brandLogoUrl] = await Promise.all([
    getNotificationSoundSettings(),
    getPublicBrandLogo(),
  ])
  const supabase = await getServerSupabase()

  const [unreadMessages, unreadNotificationsResult] = principal.hasDataAccess
    ? await Promise.all([
        getUnreadMessageCount(supabase),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', principal.userId)
          .is('read_at', null),
      ])
    : [0, { count: 0, error: null }]

  const unreadNotifications = unreadNotificationsResult.error
    ? 0
    : (unreadNotificationsResult.count ?? 0)

  const investorTopic = topics.investor(principal.investorId)
  const userTopic = topics.user(principal.userId)

  const sections = principal.hasDataAccess
    ? [
        {
          items: [
            { href: '/investor', label: 'Ringkasan', exact: true },
            { href: '/investor/profile', label: 'Profil' },
            { href: '/investor/documents', label: 'Dokumen & Data Room' },
            { href: '/investor/ownership', label: 'Kepemilikan' },
            { href: '/investor/financials', label: 'Keuangan' },
            { href: '/investor/distributions', label: 'Bagi Hasil' },
            {
              href: '/investor/messages',
              label: 'Pesan',
              badge: (
                <LiveNavBadge
                  initialCount={unreadMessages}
                  topic={investorTopic}
                  eventKind="message.received"
                />
              ),
            },
            {
              href: '/investor/notifications',
              label: 'Notifikasi',
              badge: (
                <LiveNavBadge
                  initialCount={unreadNotifications}
                  topic={userTopic}
                  eventKind="notification.created"
                />
              ),
            },
          ],
        },
      ]
    : []

  const subscribed = [
    investorTopic,
    userTopic,
    ...(principal.hasDataAccess ? [topics.allInvestors()] : []),
  ]

  return (
    <RealtimeProvider topics={subscribed}>
      <NotificationSoundListener
        topics={subscribed}
        role="investor"
        enabled={sound.enabled}
        soundUrl={sound.publicUrl}
        volume={sound.volume}
      />
      <ToastProvider>
        <TooltipProvider delayDuration={200}>
          <AppShell
            homeHref="/investor"
            sections={sections}
            brand={<Brand sublabel="Investor" logoUrl={brandLogoUrl} />}
            mobileSidebarFooter={
              <div className="[&>button]:w-full [&>button]:justify-start">
                <SignOutButton />
              </div>
            }
            topbarActions={
              <div className="flex items-center gap-3">
                <div className="hidden flex-col items-end leading-tight sm:flex">
                  <span className="text-body-sm text-fg font-medium">{principal.fullName}</span>
                  <span className="text-caption text-fg-subtle font-mono">
                    {principal.referenceCode}
                  </span>
                </div>
                <RealtimeStatus />
                <Avatar name={principal.fullName} size="sm" />
                <div className="hidden lg:block">
                  <SignOutButton compact />
                </div>
              </div>
            }
          >
            {children}
          </AppShell>
        </TooltipProvider>
      </ToastProvider>
    </RealtimeProvider>
  )
}
