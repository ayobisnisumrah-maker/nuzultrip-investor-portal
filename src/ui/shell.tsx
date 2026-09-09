'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './button'
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from './dialog'
import { KhatimStar } from './geometry/khatim'
import { ThemeToggle } from './theme/theme-toggle'

/**
 * The shared application shell for the admin and investor surfaces.
 *
 * Below `lg` the sidebar becomes a slide-over drawer — the same navigation, the
 * same markup, a different container. It is not a reduced menu, because a
 * reduced menu is how mobile users end up unable to reach half the product.
 */

export type NavItem = {
  href: string
  label: string
  icon?: React.ReactNode
  /** Rendered on the right — typically an unread count. */
  badge?: React.ReactNode
  /** Match the pathname exactly rather than by prefix (use for index routes). */
  exact?: boolean
}

export type NavSection = {
  title?: string
  items: readonly NavItem[]
}

export function AppShell({
  sections,
  brand,
  topbarActions,
  mobileSidebarFooter,
  children,
  homeHref = '/',
}: {
  sections: readonly NavSection[]
  brand: React.ReactNode
  topbarActions?: React.ReactNode
  mobileSidebarFooter?: React.ReactNode
  children: React.ReactNode
  homeHref?: string
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Persistent sidebar — lg and up */}
      <aside className="border-border bg-surface sticky top-0 hidden h-dvh flex-col border-r lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link
            href={homeHref}
            className="focus-visible:outline-ring flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {brand}
          </Link>
        </div>
        <Navigation sections={sections} className="flex-1 overflow-y-auto px-3 pb-6" />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="z-sticky border-border bg-canvas/85 sticky top-0 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-sm sm:px-6">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka navigasi">
                <Menu aria-hidden="true" />
              </Button>
            </DrawerTrigger>
            <DrawerContent side="left">
              <div className="flex items-center justify-between">
                <DrawerTitle className="flex items-center gap-2.5">{brand}</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Tutup navigasi">
                    <X aria-hidden="true" />
                  </Button>
                </DrawerClose>
              </div>
              <Navigation
                sections={sections}
                className="-mx-2 flex-1 overflow-y-auto"
                onNavigate={() => setDrawerOpen(false)}
              />
              {mobileSidebarFooter ? (
                <div className="border-border mt-auto shrink-0 border-t pt-3">
                  {mobileSidebarFooter}
                </div>
              ) : null}
            </DrawerContent>
          </Drawer>

          <Link href={homeHref} className="flex min-w-0 items-center gap-2.5 lg:hidden">
            {brand}
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            {topbarActions}
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function Navigation({
  sections,
  className,
  onNavigate,
}: {
  sections: readonly NavSection[]
  className?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const activeHref = sections
    .flatMap((section) => section.items)
    .filter((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.href

  return (
    <nav aria-label="Navigasi utama" className={cn('flex flex-col gap-6 pt-2', className)}>
      {sections.map((section, index) => (
        <div key={section.title ?? `section-${index}`} className="flex flex-col gap-1">
          {section.title ? (
            <p className="text-fg-subtle px-3 pb-1 overline">{section.title}</p>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = item.href === activeHref
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'text-body-sm relative flex items-center gap-3 rounded-md px-3 py-2.5',
                      'transition-colors duration-(--d-fast)',
                      'focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
                      "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                      active
                        ? 'bg-primary-subtle text-fg font-medium'
                        : 'text-fg-muted hover:bg-sunken hover:text-fg',
                    )}
                  >
                    {/* Gold marks where you are — one of the few uses of the accent. */}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="bg-accent-solid absolute inset-y-1.5 left-0 w-0.5 rounded-full"
                      />
                    ) : null}
                    {item.icon}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** The wordmark used in both shells and on the portal. */
export function Brand({
  label = 'Nuzultrip',
  sublabel = 'Investor Relations',
  logoUrl,
}: {
  label?: string
  sublabel?: string
  logoUrl?: string | null
}) {
  if (logoUrl) {
    return (
      <span className="flex min-w-0 flex-col gap-1 leading-tight">
        <Image
          src={logoUrl}
          alt={label}
          width={168}
          height={52}
          className="h-8 w-auto max-w-40 rounded-sm bg-white object-contain object-left px-1.5 py-1"
        />
        <span className="text-fg-subtle truncate text-[0.625rem] tracking-[0.1em] uppercase">
          {sublabel}
        </span>
      </span>
    )
  }

  return (
    <>
      <KhatimStar variant="filled" className="text-accent-solid size-6 shrink-0" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-display text-heading-sm text-fg truncate">{label}</span>
        <span className="text-fg-subtle truncate text-[0.6875rem] tracking-[0.1em] uppercase">
          {sublabel}
        </span>
      </span>
    </>
  )
}
