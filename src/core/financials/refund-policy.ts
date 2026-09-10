import { z } from 'zod'

export const refundDayBasisSchema = z.enum(['business_days', 'calendar_days'])

export const refundTierSchema = z
  .object({
    minDaysBeforeDeparture: z.number().int().min(0).max(3650),
    maxDaysBeforeDeparture: z.number().int().min(0).max(3650).nullable(),
    refundPercent: z.number().finite().min(0).max(100),
  })
  .refine(
    (tier) =>
      tier.maxDaysBeforeDeparture === null ||
      tier.maxDaysBeforeDeparture >= tier.minDaysBeforeDeparture,
    { message: 'Batas maksimum hari tidak boleh lebih kecil dari batas minimum.' },
  )

export const refundPolicySchema = z.object({
  processingDays: z.number().int().min(1).max(365),
  dayBasis: refundDayBasisSchema,
  tiers: z.array(refundTierSchema).max(20),
})

export type RefundPolicy = z.infer<typeof refundPolicySchema>
export type RefundTier = z.infer<typeof refundTierSchema>

export const DEFAULT_REFUND_POLICY: RefundPolicy = {
  processingDays: 90,
  dayBasis: 'business_days',
  tiers: [],
}

export function parseRefundPolicy(value: unknown): RefundPolicy {
  const parsed = refundPolicySchema.safeParse(value)
  return parsed.success ? parsed.data : DEFAULT_REFUND_POLICY
}

export function daysBeforeDeparture(requestedAt: Date, departureOn: string): number | null {
  const departure = new Date(`${departureOn}T00:00:00Z`)
  if (Number.isNaN(departure.getTime())) return null
  const requested = new Date(
    Date.UTC(requestedAt.getUTCFullYear(), requestedAt.getUTCMonth(), requestedAt.getUTCDate()),
  )
  return Math.floor((departure.getTime() - requested.getTime()) / 86_400_000)
}

export function matchingRefundTier(policy: RefundPolicy, days: number): RefundTier | null {
  if (days < 0) return null
  return (
    policy.tiers.find(
      (tier) =>
        days >= tier.minDaysBeforeDeparture &&
        (tier.maxDaysBeforeDeparture === null || days <= tier.maxDaysBeforeDeparture),
    ) ?? null
  )
}

export function addProcessingDays(start: Date, policy: RefundPolicy): Date {
  const result = new Date(start)
  if (policy.dayBasis === 'calendar_days') {
    result.setUTCDate(result.getUTCDate() + policy.processingDays)
    return result
  }

  let remaining = policy.processingDays
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1)
    const weekday = result.getUTCDay()
    if (weekday !== 0 && weekday !== 6) remaining -= 1
  }
  return result
}

export function refundPolicyLines(policy: RefundPolicy): string[] {
  const processing = `Proses refund maksimal ${policy.processingDays} ${
    policy.dayBasis === 'business_days' ? 'hari kerja' : 'hari kalender'
  } sejak pengajuan diterima.`

  if (policy.tiers.length === 0) return [processing]

  const tiers = [...policy.tiers]
    .sort((a, b) => b.minDaysBeforeDeparture - a.minDaysBeforeDeparture)
    .map((tier) => {
      const range =
        tier.maxDaysBeforeDeparture === null
          ? `≥ ${tier.minDaysBeforeDeparture} hari sebelum keberangkatan`
          : tier.minDaysBeforeDeparture === tier.maxDaysBeforeDeparture
            ? `${tier.minDaysBeforeDeparture} hari sebelum keberangkatan`
            : `${tier.minDaysBeforeDeparture}–${tier.maxDaysBeforeDeparture} hari sebelum keberangkatan`
      return `${range}: pengembalian maksimal ${tier.refundPercent}% dari pembayaran yang diterima.`
    })

  return [processing, ...tiers]
}

export function formatPolicyDate(value: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value)
}
