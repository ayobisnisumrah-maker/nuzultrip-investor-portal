import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  DEFAULT_CURRENCY,
  formatMoney,
  formatMoneyCompact,
  formatSignedPercent,
} from '@/lib/format'
import { formatPeriod, type PeriodType } from '@/core/financials/provenance'
import { Card } from './card'

/**
 * Evidence-forward components (docs/DESIGN-SYSTEM.md §1): a figure never
 * appears without its period, its currency, and — for financial statements —
 * its provenance.
 */

export function MoneyValue({
  amount,
  currency = DEFAULT_CURRENCY,
  compact = false,
  className,
  emphasiseNegative = true,
}: {
  /** A string when it comes from Postgres `numeric` — precision is preserved. */
  amount: string | number
  currency?: string
  compact?: boolean
  className?: string
  emphasiseNegative?: boolean
}) {
  const isNegative = typeof amount === 'number' ? amount < 0 : amount.trimStart().startsWith('-')
  const magnitude = typeof amount === 'number' ? Math.abs(amount) : amount.replace(/^-/, '')
  const formatted = compact
    ? formatMoneyCompact(magnitude, currency)
    : formatMoney(magnitude, currency)

  return (
    <span
      className={cn(
        'tabular font-mono whitespace-nowrap',
        isNegative && emphasiseNegative && 'text-danger-fg',
        className,
      )}
    >
      {/* Accounting convention: negatives in parentheses, not just a colour. */}
      {isNegative ? `(${formatted})` : formatted}
    </span>
  )
}

export function DeltaValue({
  ratio,
  className,
  /** For costs, a decrease is good. Flips the colour, never the arrow. */
  invertSentiment = false,
  label,
}: {
  /** A ratio: 0.082 renders as "+8,2%". */
  ratio: number
  className?: string
  invertSentiment?: boolean
  label?: string
}) {
  const direction = ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat'
  const positive = invertSentiment ? ratio < 0 : ratio > 0
  const Icon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : ArrowRight

  return (
    <span
      className={cn(
        'text-body-sm tabular inline-flex items-center gap-1 font-mono whitespace-nowrap',
        direction === 'flat' ? 'text-fg-subtle' : positive ? 'text-success-fg' : 'text-danger-fg',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {formatSignedPercent(ratio)}
      {label ? <span className="text-caption text-fg-subtle font-sans">{label}</span> : null}
    </span>
  )
}

export function PeriodLabel({
  type,
  fiscalYear,
  index,
  className,
}: {
  type: PeriodType
  fiscalYear: number
  index: number
  className?: string
}) {
  return (
    <span className={cn('text-caption text-fg-subtle', className)}>
      {formatPeriod(type, fiscalYear, index)}
    </span>
  )
}

/**
 * A dashboard tile. `context` is not optional by accident — a number without a
 * period or a comparison is not information.
 */
export function StatCard({
  label,
  value,
  context,
  delta,
  icon,
  className,
  testId,
}: {
  label: React.ReactNode
  value: React.ReactNode
  /** The period, source, or comparison basis the value refers to. */
  context: React.ReactNode
  delta?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  /**
   * Stable hook for tests. The value gets `${testId}-value`, so an assertion
   * can target the number without depending on the card's DOM shape.
   */
  testId?: string
}) {
  return (
    <Card
      padding="sm"
      className={cn('flex flex-col gap-2', className)}
      {...(testId ? { 'data-testid': testId } : {})}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-fg-subtle overline">{label}</p>
        {icon ? <span className="text-fg-subtle shrink-0">{icon}</span> : null}
      </div>
      <p
        className="text-heading-xl text-fg"
        {...(testId ? { 'data-testid': `${testId}-value` } : {})}
      >
        {value}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {delta}
        <span className="text-caption text-fg-subtle">{context}</span>
      </div>
    </Card>
  )
}

/** A labelled definition pair, used across profile and detail views. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid gap-1 py-2.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4', className)}>
      <dt className="text-body-sm text-fg-subtle">{label}</dt>
      <dd className="text-body-sm text-fg">{children}</dd>
    </div>
  )
}

export function DetailList({ className, ...props }: React.ComponentPropsWithoutRef<'dl'>) {
  return <dl className={cn('divide-border divide-y', className)} {...props} />
}
