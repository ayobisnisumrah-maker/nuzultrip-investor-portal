import { INVESTOR_STATUS_LABELS, type InvestorStatus } from '@/core/investors/status'
import {
  PUBLICATION_STATUS_LABELS,
  VISIBILITY_LABELS,
  type PublicationStatus,
  type Visibility,
} from '@/core/documents/publication'
import {
  FINANCIAL_SOURCE_DESCRIPTIONS,
  FINANCIAL_SOURCE_LABELS,
  type FinancialSource,
} from '@/core/financials/provenance'
import { Badge, StatusBadge, type BadgeTone } from './badge'
import { cn } from '@/lib/cn'

/**
 * Domain-flavoured status components.
 *
 * Each maps a domain enum to a tone. Because the mapping lives here, a status
 * is coloured identically everywhere it appears — and because the label always
 * accompanies the colour, meaning never depends on colour alone.
 */

const INVESTOR_TONES: Readonly<Record<InvestorStatus, BadgeTone>> = {
  prospective: 'neutral',
  submitted: 'info',
  under_review: 'warning',
  approved: 'primary',
  rejected: 'danger',
  active: 'success',
  inactive: 'neutral',
}

export function InvestorStatusPill({
  status,
  className,
  size,
}: {
  status: InvestorStatus
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <StatusBadge tone={INVESTOR_TONES[status]} size={size} className={className}>
      {INVESTOR_STATUS_LABELS[status]}
    </StatusBadge>
  )
}

const PUBLICATION_TONES: Readonly<Record<PublicationStatus, BadgeTone>> = {
  draft: 'neutral',
  review: 'warning',
  approved: 'info',
  // Gold marks significance, and "this is live to investors" is significant.
  published: 'accent',
  archived: 'neutral',
}

export function PublicationBadge({
  status,
  className,
  size,
}: {
  status: PublicationStatus
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <StatusBadge tone={PUBLICATION_TONES[status]} size={size} className={className}>
      {PUBLICATION_STATUS_LABELS[status]}
    </StatusBadge>
  )
}

const VISIBILITY_TONES: Readonly<Record<Visibility, BadgeTone>> = {
  public: 'info',
  investors: 'primary',
  restricted: 'warning',
  internal: 'neutral',
}

export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: Visibility
  className?: string
}) {
  return (
    <Badge tone={VISIBILITY_TONES[visibility]} className={className}>
      {VISIBILITY_LABELS[visibility]}
    </Badge>
  )
}

/**
 * Provenance of a financial figure. This component is **required** adjacent to
 * any financial statement or KPI — see docs/DESIGN-SYSTEM.md §1 and
 * `src/core/financials/provenance.ts`.
 */
export function ProvenanceTag({
  source,
  className,
  withDescription = false,
}: {
  source: FinancialSource
  className?: string
  withDescription?: boolean
}) {
  const tones: Readonly<Record<FinancialSource, BadgeTone>> = {
    internal: 'warning',
    reviewed: 'info',
    audited: 'success',
  }
  return (
    <span className={cn('inline-flex flex-col gap-1', className)}>
      <Badge tone={tones[source]} title={FINANCIAL_SOURCE_DESCRIPTIONS[source]}>
        {FINANCIAL_SOURCE_LABELS[source]}
      </Badge>
      {withDescription ? (
        <span className="text-caption text-fg-subtle">{FINANCIAL_SOURCE_DESCRIPTIONS[source]}</span>
      ) : null}
    </span>
  )
}
