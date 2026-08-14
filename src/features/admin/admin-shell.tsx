'use client'

import {
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Shield,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { AppShell, Brand, type NavSection } from '@/ui/shell'
import { Avatar } from '@/ui/primitives'
import { SignOutButton } from '@/features/shell/sign-out-button'

/**
 * Icons are referenced by name in the navigation data (a plain, serialisable
 * module) and resolved to components here, on the client. Passing a component
 * across the server/client boundary is not possible, and a barrel import of the
 * whole icon set would ship far more than the handful actually used.
 */
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  KeyRound,
  ScrollText,
}

export type SerializableNavSection = {
  title?: string
  items: ReadonlyArray<{ href: string; label: string; icon: string; exact?: boolean }>
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
  children: React.ReactNode
}) {
  const resolved: NavSection[] = sections.map((section) => ({
    ...(section.title ? { title: section.title } : {}),
    items: section.items.map((item) => {
      const Icon = ICONS[item.icon]
      return {
        href: item.href,
        label: item.label,
        ...(item.exact ? { exact: true } : {}),
        ...(Icon ? { icon: <Icon aria-hidden="true" /> } : {}),
      }
    }),
  }))

  return (
    <AppShell
      homeHref="/admin"
      sections={resolved}
      brand={<Brand sublabel="Admin" />}
      topbarActions={
        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-body-sm text-fg font-medium">{fullName}</span>
            <span className="text-caption text-fg-subtle">{roleName}</span>
          </div>
          <Avatar name={fullName} size="sm" />
          <SignOutButton compact />
        </div>
      }
    >
      {children}
    </AppShell>
  )
}
