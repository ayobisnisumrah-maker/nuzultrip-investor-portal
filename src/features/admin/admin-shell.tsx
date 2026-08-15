'use client'

import { motion } from 'framer-motion'
import {
  FileText,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Shield,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { AppShell, Brand, type NavSection } from '@/ui/shell'
import { Avatar } from '@/ui/primitives'
import { SignOutButton } from '@/features/shell/sign-out-button'
import { RealtimeStatus } from '@/features/realtime/realtime-status'

/**
 * Admin shell.
 *
 * Important:
 * - Navigation remains permission-aware.
 * - Server authorization remains authoritative.
 * - This component only controls presentation.
 * - No privileged action is performed from this client shell.
 */

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  KeyRound,
  ScrollText,
  FileText,
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

export function AdminShell({
  sections,
  fullName,
  roleName,
  children,
}: {
  sections: readonly SerializableNavSection[]
  fullName: string
  roleName: string
  children: ReactNode
}) {
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
              icon: (
                <Icon
                  aria-hidden="true"
                  className="transition-transform duration-200"
                />
              ),
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
          <div className="hidden h-8 items-center rounded-full border border-border bg-surface px-3 sm:flex">
            <span className="mr-2 size-1.5 rounded-full bg-success-solid" />
            <span className="text-caption font-medium text-fg-muted">
              Sistem aktif
            </span>
          </div>

          <RealtimeStatus />

          <div className="hidden h-8 w-px bg-border sm:block" />

          <div className="hidden flex-col items-end leading-tight md:flex">
            <span className="text-body-sm font-medium text-fg">
              {fullName}
            </span>
            <span className="text-caption text-fg-subtle">
              {roleName}
            </span>
          </div>

          <Avatar
            name={fullName}
            size="sm"
          />

          <SignOutButton compact />
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.28,
          ease: 'easeOut',
        }}
        className="mx-auto w-full max-w-[1600px]"
      >
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="relative px-5 py-5 sm:px-6 sm:py-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 size-48 translate-x-16 -translate-y-20 rounded-full bg-primary-subtle blur-3xl"
            />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-caption mb-1 font-medium uppercase tracking-[0.14em] text-fg-subtle">
                  Nuzultrip Investor Relations
                </p>

                <h1 className="font-display text-heading-lg text-fg">
                  Admin Console
                </h1>

                <p className="mt-1 max-w-2xl text-body-sm text-fg-muted">
                  Kelola investor, komunikasi, dokumen, laporan, dan portal
                  hubungan investor dari satu tempat.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2">
                <Shield
                  aria-hidden="true"
                  className="size-4 text-accent-solid"
                />

                <div className="leading-tight">
                  <p className="text-caption font-medium text-fg">
                    {roleName}
                  </p>
                  <p className="text-[0.6875rem] text-fg-subtle">
                    Akses terotorisasi
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {children}
      </motion.div>
    </AppShell>
  )
}
