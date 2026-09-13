import Link from 'next/link'

import type { PublicPortalNavigationItem } from '@/server/portal/public-queries'

type PublicConnectLinksProps = {
  navigation: PublicPortalNavigationItem[]
}

function isUsableExternalHref(value: string) {
  const href = value.trim()
  return href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')
}

export function PublicConnectLinks({ navigation }: PublicConnectLinksProps) {
  const links = navigation
    .filter(
      (item) =>
        item.location === 'social' &&
        !item.parent_id &&
        isUsableExternalHref(item.href),
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, 8)

  if (!links.length) return null

  return (
    <details className="group fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      <summary className="bg-primary text-primary-foreground shadow-lg shadow-black/10 inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="bg-primary-foreground/40 absolute inline-flex size-full animate-ping rounded-full" />
          <span className="bg-primary-foreground relative inline-flex size-2.5 rounded-full" />
        </span>
        Sambungkan
        <span className="text-base leading-none transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="border-border bg-surface absolute right-0 bottom-[calc(100%+0.75rem)] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border p-2 shadow-2xl shadow-black/15">
        <div className="px-3 pt-2 pb-3">
          <p className="text-fg text-sm font-semibold">Terhubung dengan Nuzultrip</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">
            Pilih kanal resmi yang ingin Anda buka.
          </p>
        </div>

        <div className="grid gap-1">
          {links.map((item) => {
            const opensNewTab = item.target === '_blank' || item.href.startsWith('https://')

            return (
              <Link
                key={item.id}
                href={item.href}
                target={opensNewTab ? '_blank' : undefined}
                rel={opensNewTab ? 'noopener noreferrer' : undefined}
                className="text-fg hover:bg-muted focus-visible:bg-muted flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors"
              >
                <span className="min-w-0 truncate">{item.label}</span>
                <span className="text-fg-subtle shrink-0" aria-hidden="true">
                  ↗
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </details>
  )
}
