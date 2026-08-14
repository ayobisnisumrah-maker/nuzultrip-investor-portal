// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatSignedPercent,
  truncate,
} from './format'

/**
 * Which space character `Intl` puts between a currency symbol and its digits
 * (regular, non-breaking, or narrow non-breaking) varies by ICU version, so
 * assertions compare against a normalised form.
 */
const normalize = (value: string) => value.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it('formats rupiah without decimals', () => {
    expect(normalize(formatMoney(1500000))).toBe('Rp 1.500.000')
  })

  it('keeps two decimals for other currencies', () => {
    expect(normalize(formatMoney(1234.5, 'USD'))).toMatch(/1\.234,50/)
  })

  it('accepts the numeric strings Postgres returns', () => {
    expect(normalize(formatMoney('1500000.00'))).toBe('Rp 1.500.000')
  })

  it('preserves precision beyond Number.MAX_SAFE_INTEGER', () => {
    // 9007199254740993 is not representable as a double. Passing the string
    // straight to Intl is the only way this stays correct.
    const formatted = normalize(formatMoney('9007199254740993'))
    expect(formatted).toContain('9.007.199.254.740.993')
  })

  it('rejects values that are not numeric', () => {
    expect(() => formatMoney('1,500,000')).toThrow(/Invalid numeric string/)
    expect(() => formatMoney(Number.NaN)).toThrow(/Invalid numeric value/)
  })
})

describe('formatMoneyCompact', () => {
  it('produces a short form for dashboard tiles', () => {
    expect(normalize(formatMoneyCompact(1_200_000))).toMatch(/1,2/)
  })
})

describe('formatNumber / formatPercent', () => {
  it('uses Indonesian grouping and decimal separators', () => {
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(1234.5, { fractionDigits: 2 })).toBe('1.234,50')
  })

  it('treats percent input as a ratio', () => {
    expect(formatPercent(0.125)).toBe('12,5%')
  })

  it('always signs a delta', () => {
    expect(formatSignedPercent(0.081)).toBe('+8,1%')
    expect(formatSignedPercent(-0.081)).toBe('−8,1%')
    expect(formatSignedPercent(0)).toBe('0,0%')
  })
})

describe('dates', () => {
  // 2026-03-09T22:30:00Z is 2026-03-10 05:30 in Asia/Jakarta (UTC+7). The date
  // must roll over — this is exactly the bug an implicit timezone would cause.
  const instant = '2026-03-09T22:30:00.000Z'

  it('formats in the configured timezone, not the runtime default', () => {
    expect(formatDate(instant, 'short')).toBe('10 Mar 2026')
    expect(normalize(formatDateTime(instant))).toContain('10 Mar 2026')
  })

  it('respects an explicit timezone override', () => {
    expect(formatDate(instant, 'short', { timeZone: 'UTC' })).toBe('09 Mar 2026')
  })

  it('supports long and month-year styles', () => {
    expect(formatDate(instant, 'long')).toBe('10 Maret 2026')
    expect(formatDate(instant, 'monthYear')).toBe('Maret 2026')
  })

  it('rejects an invalid date rather than rendering "Invalid Date"', () => {
    expect(() => formatDate('not-a-date')).toThrow(/Invalid date/)
  })
})

describe('formatRelativeTime', () => {
  const now = '2026-03-10T12:00:00.000Z'

  it('takes the reference point as a parameter so it is deterministic', () => {
    expect(formatRelativeTime('2026-03-07T12:00:00.000Z', now)).toBe('3 hari yang lalu')
    expect(formatRelativeTime('2026-03-10T11:00:00.000Z', now)).toBe('1 jam yang lalu')
    expect(formatRelativeTime('2026-03-11T12:00:00.000Z', now)).toBe('besok')
  })
})

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1,0 KB'],
    [1_572_864, '1,5 MB'],
    [5_368_709_120, '5,0 GB'],
  ])('formats %i bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })

  it('returns a dash for nonsense input rather than throwing in a render', () => {
    expect(formatFileSize(-1)).toBe('—')
    expect(formatFileSize(Number.NaN)).toBe('—')
  })
})

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('Laporan Q1', 20)).toBe('Laporan Q1')
  })

  it('breaks on a word boundary when one is close enough', () => {
    expect(truncate('Laporan keuangan kuartal pertama', 20)).toBe('Laporan keuangan…')
  })

  it('hard-clips when there is no usable word boundary', () => {
    expect(truncate('A'.repeat(30), 10)).toBe(`${'A'.repeat(10)}…`)
  })
})
