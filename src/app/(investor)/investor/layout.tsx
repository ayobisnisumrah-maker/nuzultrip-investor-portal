import type { Metadata } from 'next'
import { topics } from '@/core/realtime/events'
import { AppShell, Brand } from '@/ui/shell'
import { Avatar } from '@/ui/primitives'
import { SignOutButton } from '@/features/shell/sign-out-button'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { RealtimeStatus } from '@/features/realtime/realtime-status'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { ToastProvider } from '@/ui/toast'
import { TooltipProvider } from '@/ui/menu'

export const metadata: Metadata = {
  title: { default: 'Investor', template: '%s · Investor Nuzultrip' },
  robots: { index: false, follow: false },
}

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireInvestorPage()

  // Navigation is intentionally minimal until the investor surface is built
  // (Phase 10). An investor whose application is still pending has nothing to
  // navigate to, and a sidebar full of links they cannot open would be worse
  // than none.
  const sections = principal.hasDataAccess
    ? [{ items: [{ href: '/investor', label: 'Ringkasan', exact: true }] }]
    : []

  // A pending investor still subscribes to their own channels — that is how
  // they find out, without refreshing, that their application was approved.
  const subscribed = [
    topics.investor(principal.investorId),
    topics.user(principal.userId),
    ...(principal.hasDataAccess ? [topics.allInvestors()] : []),
  ]

  return (
    <RealtimeProvider topics={subscribed}>
      <ToastProvider>
        <TooltipProvider delayDuration={200}>
          <AppShell
            homeHref="/investor"
            sections={sections}
            brand={<Brand sublabel="Investor" />}
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
                <SignOutButton compact />
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
