/**
 * Locale-aware formatting. Every call goes through `Intl` with an **explicit**
 * locale and timezone — never the runtime default, which differs between the
 * server and each user's browser and would otherwise produce hydration
 * mismatches and wrong dates for investors abroad.
 */

export const DEFAULT_LOCALE = 'id-ID'
export const DEFAULT_TIMEZONE = 'Asia/Jakarta'
export const DEFAULT_CURRENCY = 'IDR'

export type FormatOptions = {
  locale?: string
  timeZone?: string
}

/**
 * Monetary amounts arrive from Postgres `numeric(20,2)` as **strings**, and are
 * kept as strings all the way to `Intl`, which accepts them natively. Routing
 * them through a JavaScript number would silently lose precision on large
 * rupiah figures — exactly the values that matter most here.
 */
export function formatMoney(
  amount: string | number,
  currency: string = DEFAULT_CURRENCY,
  { locale = DEFAULT_LOCALE, fractionDigits }: FormatOptions & { fractionDigits?: number } = {},
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // Rupiah is conventionally shown without decimals; other currencies keep 2.
    minimumFractionDigits: fractionDigits ?? (currency === 'IDR' ? 0 : 2),
    maximumFractionDigits: fractionDigits ?? (currency === 'IDR' ? 0 : 2),
  })
  return formatter.format(normalizeNumeric(amount))
}

/** Compact form for dashboard tiles: "Rp1,2 jt". Never used in a report table. */
export function formatMoneyCompact(
  amount: string | number,
  currency: string = DEFAULT_CURRENCY,
  { locale = DEFAULT_LOCALE }: FormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(normalizeNumeric(amount))
}

export function formatNumber(
  value: string | number,
  { locale = DEFAULT_LOCALE, fractionDigits }: FormatOptions & { fractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(locale, {
    ...(fractionDigits === undefined
      ? {}
      : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }),
  }).format(normalizeNumeric(value))
}

/** `value` is a ratio (0.125 → "12,5%"), not a pre-multiplied percentage. */
export function formatPercent(
  value: number,
  { locale = DEFAULT_LOCALE, fractionDigits = 1 }: FormatOptions & { fractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Always renders with an explicit sign — deltas are meaningless without one. */
export function formatSignedPercent(value: number, options?: FormatOptions): string {
  const formatted = formatPercent(Math.abs(value), options)
  if (value > 0) return `+${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

const DATE_STYLES = {
  short: { day: '2-digit', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

export type DateStyle = keyof typeof DATE_STYLES

export function formatDate(
  value: string | Date,
  style: DateStyle = 'short',
  { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIMEZONE }: FormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, { ...DATE_STYLES[style], timeZone }).format(toDate(value))
}

export function formatDateTime(
  value: string | Date,
  { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIMEZONE }: FormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(toDate(value))
}

const RELATIVE_UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/**
 * "3 hari lalu". `now` is a parameter rather than an implicit `Date.now()` so
 * this is deterministic and testable, and so a server render and a client
 * render can be given the same reference point.
 */
export function formatRelativeTime(
  value: string | Date,
  now: string | Date,
  { locale = DEFAULT_LOCALE }: FormatOptions = {},
): string {
  const delta = toDate(value).getTime() - toDate(now).getTime()
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(delta) >= ms) return formatter.format(Math.round(delta / ms), unit)
  }
  return formatter.format(Math.round(delta / 1000), 'second')
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

const FILE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatFileSize(
  bytes: number,
  { locale = DEFAULT_LOCALE }: FormatOptions = {},
): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), FILE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  const digits = exponent === 0 ? 0 : value < 10 ? 1 : 0
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} ${FILE_UNITS[exponent]}`
}

/** Truncates on a word boundary, with a real ellipsis character. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const clipped = text.slice(0, max)
  const lastSpace = clipped.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`
}

/* -------------------------------------------------------------------------- */

function toDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new TypeError(`Invalid date: ${String(value)}`)
  return date
}

/**
 * `Intl` accepts numeric strings directly (ECMA-402 v3), which is how large
 * `numeric` values keep full precision. Numbers pass through unchanged.
 *
 * TypeScript types the string overload as the template-literal
 * `Intl.StringNumericLiteral`, which a plain `string` is not assignable to. The
 * regex above *is* the runtime proof that the value matches that shape, so the
 * assertion after it is sound rather than a way around the checker.
 */
function normalizeNumeric(value: string | number): number | Intl.StringNumericLiteral {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`Invalid numeric value: ${String(value)}`)
    return value
  }
  const trimmed = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new TypeError(`Invalid numeric string: ${JSON.stringify(value)}`)
  }
  return trimmed as Intl.StringNumericLiteral
}
