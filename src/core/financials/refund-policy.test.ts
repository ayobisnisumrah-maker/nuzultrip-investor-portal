import { describe, expect, it } from 'vitest'

import {
  addProcessingDays,
  daysBeforeDeparture,
  matchingRefundTier,
  refundPolicySchema,
  refundPolicyLines,
  type RefundPolicy,
} from './refund-policy'

const policy: RefundPolicy = {
  processingDays: 5,
  dayBasis: 'business_days',
  tiers: [
    { minDaysBeforeDeparture: 0, maxDaysBeforeDeparture: 6, refundPercent: 0 },
    { minDaysBeforeDeparture: 7, maxDaysBeforeDeparture: 30, refundPercent: 50 },
    { minDaysBeforeDeparture: 31, maxDaysBeforeDeparture: null, refundPercent: 75 },
  ],
}

describe('refund policy', () => {
  it('matches the correct tier including a 0% forfeiture tier', () => {
    expect(matchingRefundTier(policy, 3)?.refundPercent).toBe(0)
    expect(matchingRefundTier(policy, 14)?.refundPercent).toBe(50)
    expect(matchingRefundTier(policy, 60)?.refundPercent).toBe(75)
  })

  it('returns no tier after departure or for a gap', () => {
    expect(matchingRefundTier(policy, -1)).toBeNull()
    const gapPolicy: RefundPolicy = {
      ...policy,
      tiers: [{ minDaysBeforeDeparture: 7, maxDaysBeforeDeparture: 30, refundPercent: 50 }],
    }
    expect(matchingRefundTier(gapPolicy, 5)).toBeNull()
  })

  it('calculates days before departure in UTC calendar days', () => {
    expect(daysBeforeDeparture(new Date('2026-09-10T23:30:00Z'), '2026-09-15')).toBe(5)
    expect(daysBeforeDeparture(new Date('2026-09-16T01:00:00Z'), '2026-09-15')).toBe(-1)
  })

  it('adds calendar processing days directly', () => {
    const result = addProcessingDays(new Date('2026-09-11T00:00:00Z'), {
      processingDays: 5,
      dayBasis: 'calendar_days',
      tiers: [],
    })
    expect(result.toISOString().slice(0, 10)).toBe('2026-09-16')
  })

  it('skips Saturday and Sunday for business-day processing', () => {
    const result = addProcessingDays(new Date('2026-09-11T00:00:00Z'), {
      processingDays: 2,
      dayBasis: 'business_days',
      tiers: [],
    })
    expect(result.toISOString().slice(0, 10)).toBe('2026-09-15')
  })

  it('rejects overlapping tiers', () => {
    const parsed = refundPolicySchema.safeParse({
      processingDays: 90,
      dayBasis: 'business_days',
      tiers: [
        { minDaysBeforeDeparture: 0, maxDaysBeforeDeparture: 10, refundPercent: 0 },
        { minDaysBeforeDeparture: 10, maxDaysBeforeDeparture: 20, refundPercent: 50 },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts adjacent non-overlapping tiers', () => {
    const parsed = refundPolicySchema.safeParse({
      processingDays: 90,
      dayBasis: 'business_days',
      tiers: [
        { minDaysBeforeDeparture: 0, maxDaysBeforeDeparture: 9, refundPercent: 0 },
        { minDaysBeforeDeparture: 10, maxDaysBeforeDeparture: 20, refundPercent: 50 },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('renders a clear forfeiture percentage in policy lines', () => {
    expect(refundPolicyLines(policy).some((line) => line.includes('0%'))).toBe(true)
  })
})
