import { describe, expect, it } from 'vitest'
import { formatFinancialKpi } from './format'

describe('formatFinancialKpi', () => {
  it('formats units in investor-readable Indonesian', () => {
    expect(formatFinancialKpi(18.5, 'percent')).toBe('18,5%')
    expect(formatFinancialKpi(30, 'days')).toBe('30 hari')
    expect(formatFinancialKpi(2.25, 'ratio')).toBe('2,25×')
  })

  it('formats currency with the report currency', () => {
    expect(formatFinancialKpi(1250000, 'currency', 'IDR')).toContain('1.250.000')
  })
})
