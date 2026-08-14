import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { buttonVariants } from './button'

/* ---------------------------------------------------------------- Breadcrumb */

export type Crumb = { label: string; href?: string }

export function Breadcrumb({ items, className }: { items: readonly Crumb[]; className?: string }) {
  return (
    <nav aria-label="Remah roti" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-caption text-fg-subtle">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded-xs transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && 'text-fg-muted')} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-60" />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ---------------------------------------------------------------- Pagination */

/**
 * Pagination is mandatory on every list (docs/SECURITY.md §10) — an unbounded
 * list endpoint is a denial-of-service waiting to happen. This component is the
 * UI half of that rule.
 */
export function Pagination({
  page,
  pageCount,
  totalItems,
  buildHref,
  className,
}: {
  /** 1-based. */
  page: number
  pageCount: number
  totalItems?: number
  buildHref: (page: number) => string
  className?: string
}) {
  if (pageCount <= 1) return null

  const pages = paginationRange(page, pageCount)

  return (
    <nav
      aria-label="Navigasi halaman"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-caption text-fg-subtle" aria-live="polite">
        Halaman {page} dari {pageCount}
        {totalItems === undefined ? null : ` · ${totalItems} data`}
      </p>

      <ul className="flex items-center gap-1">
        <li>
          <PageLink
            href={buildHref(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            icon
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </PageLink>
        </li>

        {pages.map((entry, index) =>
          entry === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-fg-subtle">
              …
            </li>
          ) : (
            <li key={entry}>
              <PageLink href={buildHref(entry)} current={entry === page}>
                {entry}
              </PageLink>
            </li>
          ),
        )}

        <li>
          <PageLink
            href={buildHref(page + 1)}
            disabled={page >= pageCount}
            aria-label="Halaman berikutnya"
            icon
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </PageLink>
        </li>
      </ul>
    </nav>
  )
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
  icon = false,
  ...props
}: {
  href: string
  children: React.ReactNode
  current?: boolean
  disabled?: boolean
  icon?: boolean
} & Omit<React.ComponentPropsWithoutRef<'a'>, 'href'>) {
  const className = cn(
    buttonVariants({ variant: current ? 'secondary' : 'ghost', size: icon ? 'icon' : 'sm' }),
    'min-w-9 tabular',
    current && 'border-primary-border bg-primary-subtle text-primary',
  )

  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(className, 'pointer-events-none opacity-40')} {...props}>
        {children}
      </span>
    )
  }

  return (
    <Link href={href} aria-current={current ? 'page' : undefined} className={className} {...props}>
      {children}
    </Link>
  )
}

/**
 * Produces `1 … 4 5 6 … 20` — a fixed-width control that does not reflow as the
 * user pages through a long list.
 */
export function paginationRange(
  page: number,
  pageCount: number,
  siblings = 1,
): ReadonlyArray<number | 'gap'> {
  const total = siblings * 2 + 5
  if (pageCount <= total) return Array.from({ length: pageCount }, (_, index) => index + 1)

  const start = Math.max(2, page - siblings)
  const end = Math.min(pageCount - 1, page + siblings)
  const result: Array<number | 'gap'> = [1]

  if (start > 2) result.push('gap')
  for (let index = start; index <= end; index += 1) result.push(index)
  if (end < pageCount - 1) result.push('gap')
  result.push(pageCount)

  return result
}
