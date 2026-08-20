import { z } from 'zod'

/**
 * Financial period domain.
 *
 * Database source of truth:
 * - period_type: monthly | quarterly | yearly
 * - status: open | closed | locked
 *
 * This module keeps lifecycle/business rules out of React components.
 */

export const FINANCIAL_PERIOD_TYPES = [
  'monthly',
  'quarterly',
  'yearly',
] as const

export type FinancialPeriodType = (typeof FINANCIAL_PERIOD_TYPES)[number]

export const FINANCIAL_PERIOD_STATUSES = [
  'open',
  'closed',
  'locked',
] as const

export type FinancialPeriodStatus =
  (typeof FINANCIAL_PERIOD_STATUSES)[number]

export const financialPeriodTypeSchema = z.enum(FINANCIAL_PERIOD_TYPES)

export const financialPeriodStatusSchema = z.enum(
  FINANCIAL_PERIOD_STATUSES,
)

export const financialPeriodInputSchema = z
  .object({
    periodType: financialPeriodTypeSchema,
    fiscalYear: z.number().int().min(2000).max(2100),
    periodIndex: z.number().int().min(1).max(12),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    currency: z.string().trim().min(3).max(3).default('IDR'),
  })
  .superRefine((value, ctx) => {
    const maxIndex =
      value.periodType === 'monthly'
        ? 12
        : value.periodType === 'quarterly'
          ? 4
          : 1

    if (value.periodIndex > maxIndex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodIndex'],
        message: `Period index for ${value.periodType} must be between 1 and ${maxIndex}.`,
      })
    }

    if (value.endsOn < value.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsOn'],
        message: 'End date must not be before start date.',
      })
    }
  })

/**
 * Lifecycle transitions.
 *
 * open -> closed
 * open -> locked
 * closed -> locked
 *
 * Locked periods are immutable from the lifecycle perspective.
 */
export const FINANCIAL_PERIOD_TRANSITIONS: Readonly<
  Record<
    FinancialPeriodStatus,
    readonly FinancialPeriodStatus[]
  >
> = {
  open: ['closed', 'locked'],
  closed: ['locked'],
  locked: [],
}

export function canTransitionFinancialPeriod(
  from: FinancialPeriodStatus,
  to: FinancialPeriodStatus,
): boolean {
  return FINANCIAL_PERIOD_TRANSITIONS[from].includes(to)
}

export function isFinancialPeriodEditable(
  status: FinancialPeriodStatus,
): boolean {
  return status === 'open'
}

export function canCloseFinancialPeriod(
  status: FinancialPeriodStatus,
): boolean {
  return status === 'open'
}

export function canLockFinancialPeriod(
  status: FinancialPeriodStatus,
): boolean {
  return status === 'open' || status === 'closed'
}

export const FINANCIAL_PERIOD_TYPE_LABELS: Readonly<
  Record<FinancialPeriodType, string>
> = {
  monthly: 'Bulanan',
  quarterly: 'Kuartalan',
  yearly: 'Tahunan',
}

export const FINANCIAL_PERIOD_STATUS_LABELS: Readonly<
  Record<FinancialPeriodStatus, string>
> = {
  open: 'Terbuka',
  closed: 'Ditutup',
  locked: 'Terkunci',
}

export const FINANCIAL_PERIOD_STATUS_DESCRIPTIONS: Readonly<
  Record<FinancialPeriodStatus, string>
> = {
  open: 'Periode masih dapat menerima perubahan financial.',
  closed: 'Periode telah ditutup dan tidak lagi menerima perubahan financial normal.',
  locked: 'Periode dikunci dan tidak dapat dibuka kembali melalui workflow normal.',
}

export function getFinancialPeriodMaxIndex(
  type: FinancialPeriodType,
): number {
  switch (type) {
    case 'monthly':
      return 12
    case 'quarterly':
      return 4
    case 'yearly':
      return 1
  }
}
