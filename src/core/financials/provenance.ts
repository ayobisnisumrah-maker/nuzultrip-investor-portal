/**
 * Provenance of a financial figure.
 *
 * The brief forbids presenting fabricated financial data as real. Rather than
 * relying on discipline, the schema makes provenance a **required** field on
 * every financial report version, and the UI renders it adjacent to the
 * figures. An investor can always tell whether they are looking at internal
 * management reporting or audited statements.
 *
 * Mirrored by the Postgres `financial_source` enum.
 */

export const FINANCIAL_SOURCES = ['internal', 'reviewed', 'audited'] as const
export type FinancialSource = (typeof FINANCIAL_SOURCES)[number]

export const FINANCIAL_SOURCE_LABELS: Readonly<Record<FinancialSource, string>> = {
  internal: 'Internal',
  reviewed: 'Direviu',
  audited: 'Diaudit',
}

export const FINANCIAL_SOURCE_DESCRIPTIONS: Readonly<Record<FinancialSource, string>> = {
  internal: 'Laporan manajemen internal. Belum direviu atau diaudit pihak independen.',
  reviewed: 'Telah direviu secara terbatas oleh pihak independen.',
  audited: 'Telah diaudit oleh akuntan publik independen.',
}

/* -------------------------------------------------------------------------- */

export const PERIOD_TYPES = ['monthly', 'quarterly', 'yearly'] as const
export type PeriodType = (typeof PERIOD_TYPES)[number]

/** Valid `period_index` range per period type — mirrored by a check constraint. */
export const PERIOD_INDEX_RANGE: Readonly<Record<PeriodType, readonly [number, number]>> = {
  monthly: [1, 12],
  quarterly: [1, 4],
  yearly: [1, 1],
}

export function isValidPeriodIndex(type: PeriodType, index: number): boolean {
  const [min, max] = PERIOD_INDEX_RANGE[type]
  return Number.isInteger(index) && index >= min && index <= max
}

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

/** "Q3 2026", "Maret 2026", "2026". */
export function formatPeriod(type: PeriodType, fiscalYear: number, index: number): string {
  if (!isValidPeriodIndex(type, index)) {
    throw new RangeError(`Invalid period index ${index} for a ${type} period.`)
  }
  switch (type) {
    case 'monthly':
      return `${MONTHS_ID[index - 1]!} ${fiscalYear}`
    case 'quarterly':
      return `Q${index} ${fiscalYear}`
    case 'yearly':
      return String(fiscalYear)
  }
}
