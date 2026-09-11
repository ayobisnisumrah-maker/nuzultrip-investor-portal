import { z } from 'zod'

/**
 * Financial period domain.
 *
 * Database source of truth:
 * - period_type: monthly | quarterly | yearly
 * - status: open | closed | locked
 *
 * Reporting periods are calendar-aligned. The fiscal year/index pair is not
 * merely a label: it determines the exact start/end dates used by transaction
 * aggregation, investor reporting, and profit distribution snapshots.
 */

export const FINANCIAL_PERIOD_TYPES = ['monthly', 'quarterly', 'yearly'] as const

export type FinancialPeriodType = (typeof FINANCIAL_PERIOD_TYPES)[number]

export const FINANCIAL_PERIOD_STATUSES = ['open', 'closed', 'locked'] as const

export type FinancialPeriodStatus = (typeof FINANCIAL_PERIOD_STATUSES)[number]

export const financialPeriodTypeSchema = z.enum(FINANCIAL_PERIOD_TYPES)

export const financialPeriodStatusSchema = z.enum(FINANCIAL_PERIOD_STATUSES)

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function getExpectedFinancialPeriodRange(
  periodType: FinancialPeriodType,
  fiscalYear: number,
  periodIndex: number,
): { startsOn: string; endsOn: string } | null {
  const maxIndex = getFinancialPeriodMaxIndex(periodType)
  if (!Number.isInteger(periodIndex) || periodIndex < 1 || periodIndex > maxIndex) return null

  if (periodType === 'monthly') {
    return {
      startsOn: isoDate(fiscalYear, periodIndex, 1),
      endsOn: isoDate(fiscalYear, periodIndex, lastDayOfMonth(fiscalYear, periodIndex)),
    }
  }

  if (periodType === 'quarterly') {
    const startMonth = (periodIndex - 1) * 3 + 1
    const endMonth = startMonth + 2
    return {
      startsOn: isoDate(fiscalYear, startMonth, 1),
      endsOn: isoDate(fiscalYear, endMonth, lastDayOfMonth(fiscalYear, endMonth)),
    }
  }

  return {
    startsOn: isoDate(fiscalYear, 1, 1),
    endsOn: isoDate(fiscalYear, 12, 31),
  }
}

export function isFinancialPeriodCalendarAligned(input: {
  periodType: FinancialPeriodType
  fiscalYear: number
  periodIndex: number
  startsOn: string
  endsOn: string
}): boolean {
  const expected = getExpectedFinancialPeriodRange(
    input.periodType,
    input.fiscalYear,
    input.periodIndex,
  )
  return expected !== null && input.startsOn === expected.startsOn && input.endsOn === expected.endsOn
}

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
    const maxIndex = getFinancialPeriodMaxIndex(value.periodType)

    if (value.periodIndex > maxIndex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodIndex'],
        message: `Period index for ${value.periodType} must be between 1 and ${maxIndex}.`,
      })
      return
    }

    if (value.endsOn < value.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsOn'],
        message: 'End date must not be before start date.',
      })
      return
    }

    const expected = getExpectedFinancialPeriodRange(
      value.periodType,
      value.fiscalYear,
      value.periodIndex,
    )
    if (expected && (value.startsOn !== expected.startsOn || value.endsOn !== expected.endsOn)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startsOn'],
        message: `Rentang periode harus mengikuti kalender: ${expected.startsOn} sampai ${expected.endsOn}.`,
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
  Record<FinancialPeriodStatus, readonly FinancialPeriodStatus[]>
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

export function isFinancialPeriodEditable(status: FinancialPeriodStatus): boolean {
  return status === 'open'
}

export function canCloseFinancialPeriod(status: FinancialPeriodStatus): boolean {
  return status === 'open'
}

export function canLockFinancialPeriod(status: FinancialPeriodStatus): boolean {
  return status === 'open' || status === 'closed'
}

export const FINANCIAL_PERIOD_TYPE_LABELS: Readonly<Record<FinancialPeriodType, string>> = {
  monthly: 'Bulanan',
  quarterly: 'Kuartalan',
  yearly: 'Tahunan',
}

export const FINANCIAL_PERIOD_STATUS_LABELS: Readonly<Record<FinancialPeriodStatus, string>> = {
  open: 'Terbuka',
  closed: 'Ditutup',
  locked: 'Terkunci',
}

export const FINANCIAL_PERIOD_STATUS_DESCRIPTIONS: Readonly<Record<FinancialPeriodStatus, string>> =
  {
    open: 'Periode masih dapat menerima perubahan financial.',
    closed: 'Periode telah ditutup dan tidak lagi menerima perubahan financial normal.',
    locked: 'Periode dikunci dan tidak dapat dibuka kembali melalui workflow normal.',
  }

export function getFinancialPeriodMaxIndex(type: FinancialPeriodType): number {
  switch (type) {
    case 'monthly':
      return 12
    case 'quarterly':
      return 4
    case 'yearly':
      return 1
  }
}
