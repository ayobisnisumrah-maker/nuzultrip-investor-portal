'use client'

import {
  ArrowLeftRight,
  BadgePercent,
  Building2,
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  CircleHelp,
  FileBarChart,
  FileCheck,
  FileCheck2,
  FileText,
  Files,
  FolderLock,
  GalleryHorizontalEnd,
  GitBranch,
  Globe2,
  Image,
  Inbox,
  Landmark,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  MousePointerClick,
  PanelsTopLeft,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { topics } from '@/core/realtime/events'
import { useRealtime } from '@/features/realtime/realtime-provider'
import { RealtimeStatus } from '@/features/realtime/realtime-status'
import { SignOutButton } from '@/features/shell/sign-out-button'
import { Avatar } from '@/ui/primitives'
import { AppShell, Brand, type NavSection } from '@/ui/shell'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserCheck,
  FileCheck,
  MessagesSquare,
  Inbox,
  BadgePercent,
  Landmark,
  ArrowLeftRight,
  GitBranch,
  WalletCards,
  ChartNoAxesCombined,
  CalendarRange,
  FileBarChart,
  ChartNoAxesColumnIncreasing,
  Files,
  FileCheck2,
  FolderLock,
  Globe2,
  PanelsTopLeft,
  GalleryHorizontalEnd,
  Menu,
  MousePointerClick,
  CircleHelp,
  Image,
  FileText,
  Building2,
  UserCog,
  ShieldCheck,
  Settings,
  ScrollText,
  Shield,
}

export type SerializableNavSection = {
  title?: string
  items: ReadonlyArray<{
    href: string
    label: string
    icon: string
    exact?: boolean
  }>
}

function CountBadge({ count, label }: { count: number; label: string }) {
  if (!count) return null
  return (
    <span
      aria-label={`${count} ${label}`}
      className="bg-accent-solid text-on-accent inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function AdminShell({
  sections,
  fullName,
  roleName,
  initialUnreadMessages,
  initialNewInquiries,
  children,
}: {
  sections: readonly SerializableNavSection[]
  fullName: string
  roleName: string
  initialUnreadMessages: number
  initialNewInquiries: number
  children: ReactNode
}) {
  const router = useRouter()
  const realtime = useRealtime()

  useEffect(() => {
    const unsubscribe = realtime.subscribe(topics.admin(), (event) => {
      if (
        event.kind === 'message.received' ||
        event.kind === 'inquiry.received' ||
        event.kind === 'ownership.changed' ||
        event.kind === 'profit_distribution.changed'
      ) {
        router.refresh()
      }
    })
    return unsubscribe
  }, [realtime, router])

  useEffect(() => {
    if (realtime.resumeToken > 0) router.refresh()
  }, [realtime.resumeToken, router])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [router])

  const resolved: NavSection[] = sections.map((section) => ({
    ...(section.title ? { title: section.title } : {}),
    items: section.items.map((item) => {
      const Icon = ICONS[item.icon]

      return {
        href: item.href,
        label: item.label,
        ...(item.exact ? { exact: true } : {}),
        ...(Icon
          ? {
              icon: <Icon aria-hidden="true" className="transition-transform duration-200" />,
            }
          : {}),
        ...(item.href === '/admin/messages'
          ? {
              badge: (
                <CountBadge count={initialUnreadMessages} label="pesan belum dibaca" />
              ),
            }
          : {}),
        ...(item.href === '/admin/inquiries'
          ? {
              badge: <CountBadge count={initialNewInquiries} label="permintaan baru" />,
            }
          : {}),
      }
    }),
  }))

  return (
    <AppShell
      homeHref="/admin"
      sections={resolved}
      brand={<Brand sublabel="Admin Console" />}
      topbarActions={
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="border-border bg-surface hidden h-8 items-center rounded-full border px-3 sm:flex">
            <span className="bg-success-solid mr-2 size-1.5 rounded-full" />
            <span className="text-caption text-fg-muted font-medium">Sistem aktif</span>
          </div>

          <RealtimeStatus />

          <div className="bg-border hidden h-8 w-px sm:block" />

          <div className="hidden flex-col items-end leading-tight md:flex">
            <span className="text-body-sm text-fg font-medium">{fullName}</span>
            <span className="text-caption text-fg-subtle">{roleName}</span>
          </div>

          <Avatar name={fullName} size="sm" />

          <SignOutButton compact />
        </div>
      }
    >
      <div className="animate-page-enter mx-auto w-full max-w-[1600px]">
        <div className="border-border bg-surface mb-6 overflow-hidden rounded-xl border">
          <div className="relative px-5 py-5 sm:px-6 sm:py-6">
            <div
              aria-hidden="true"
              className="bg-primary-subtle pointer-events-none absolute top-0 right-0 size-48 translate-x-16 -translate-y-20 rounded-full blur-3xl"
            />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-caption text-fg-subtle mb-1 font-medium tracking-[0.14em] uppercase">
                  Nuzultrip Investor Relations
                </p>

                <h1 className="font-display text-heading-lg text-fg">Admin Console</h1>

                <p className="text-body-sm text-fg-muted mt-1 max-w-2xl">
                  Kelola investor, komunikasi, dokumen, laporan, dan portal hubungan investor dari
                  satu tempat.
                </p>
              </div>

              <div className="border-border bg-canvas flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2">
                <Shield aria-hidden="true" className="text-accent-solid size-4" />

                <div className="leading-tight">
                  <p className="text-caption text-fg font-medium">{roleName}</p>
                  <p className="text-fg-subtle text-[0.6875rem]">Akses terotorisasi</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {children}
      </div>
    </AppShell>
  )
}
