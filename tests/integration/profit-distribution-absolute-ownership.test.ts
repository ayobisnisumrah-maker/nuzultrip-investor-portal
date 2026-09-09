// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asCommitted, cleanup, closeDb } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let offeringId: string | null = null
let holdingId: string | null = null
let distributionId: string | null = null

beforeAll(async () => {
  fixtures = await createFixtures()
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    if (distributionId) {
      await tx`delete from public.profit_distribution_payment_proofs where allocation_id in (
        select id from public.profit_distribution_allocations where distribution_id = ${distributionId}
      )`
      await tx`delete from public.profit_distribution_allocations where distribution_id = ${distributionId}`
      await tx`delete from public.profit_distributions where id = ${distributionId}`
    }
    if (holdingId) {
      await tx`delete from public.ownership_holdings where id = ${holdingId}`
    }
    if (offeringId) {
      await tx`delete from public.ownership_offerings where id = ${offeringId}`
    }
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('profit distribution uses absolute company ownership', () => {
  it('pays one 0.8% unit exactly 0.8% of profit instead of the whole 40% investor pool', async () => {
    const result = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) => {
        const [offering] = await tx<{ id: string }[]>`
          insert into public.ownership_offerings (
            name,
            code,
            status,
            total_offered_bps,
            unit_ownership_bps,
            unit_price,
            total_units,
            distribution_cadence_months,
            transfer_lock_months,
            effective_from,
            created_by,
            updated_by
          ) values (
            'Absolute Ownership Distribution Test',
            ${`absolute-distribution-${fixtures.suffix}`},
            'open',
            4000,
            80,
            100000000,
            50,
            1,
            36,
            now(),
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
          returning id
        `
        if (!offering) throw new Error('Failed to create offering fixture.')
        offeringId = offering.id

        const [holding] = await tx<{ id: string; ownership_bps: number }[]>`
          select id, ownership_bps
          from app.allocate_ownership_holding(
            ${offering.id},
            ${fixtures.investorA.userId},
            1,
            ${`BANK-${fixtures.suffix}`},
            'Pembelian satu unit yang telah dikonfirmasi.'
          )
        `
        if (!holding) throw new Error('Failed to allocate ownership holding.')
        holdingId = holding.id

        const [distribution] = await tx<{ id: string; profit_amount: string; investor_pool_amount: string }[]>`
          select id, profit_amount::text, investor_pool_amount::text
          from app.create_profit_distribution(
            ${offering.id},
            '2026-08-01'::date,
            '2026-08-31'::date,
            1000000000,
            100000000,
            6000,
            4000,
            'Regression: payout must follow absolute ownership.'
          )
        `
        if (!distribution) throw new Error('Failed to create distribution.')
        distributionId = distribution.id

        const allocations = await tx<{
          investor_id: string
          ownership_bps: number
          investor_pool_share_bps: number
          allocation_amount: string
        }[]>`
          select
            investor_id,
            ownership_bps,
            investor_pool_share_bps,
            allocation_amount::text
          from app.regenerate_profit_distribution_allocations(${distribution.id})
        `

        return { holding, distribution, allocations }
      },
    )

    expect(result.holding.ownership_bps).toBe(80)
    expect(Number(result.distribution.profit_amount)).toBe(900_000_000)
    expect(Number(result.distribution.investor_pool_amount)).toBe(360_000_000)

    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0]!.investor_id).toBe(fixtures.investorA.userId)
    expect(result.allocations[0]!.ownership_bps).toBe(80)
    expect(result.allocations[0]!.investor_pool_share_bps).toBe(200)
    expect(Number(result.allocations[0]!.allocation_amount)).toBe(7_200_000)
  }, 60_000)
})
