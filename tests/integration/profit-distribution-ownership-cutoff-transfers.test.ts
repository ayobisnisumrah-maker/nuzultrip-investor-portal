// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asCommitted, cleanup, closeDb, db } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'
import { createPublishedFinancialSnapshot } from './helpers/financial-snapshot'

type ScenarioIds = {
  offeringId: string
  distributionId: string
  sourceHoldingId: string
  buyerHoldingId: string
  transferId: string
}

let fixtures: Fixtures
const scenarios: ScenarioIds[] = []

beforeAll(async () => {
  fixtures = await createFixtures()
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    for (const scenario of scenarios.reverse()) {
      await tx`delete from public.profit_distribution_payment_proofs where allocation_id in (
        select id from public.profit_distribution_allocations where distribution_id = ${scenario.distributionId}
      )`
      await tx`delete from public.profit_distribution_allocations where distribution_id = ${scenario.distributionId}`
      await tx`delete from public.profit_distributions where id = ${scenario.distributionId}`
      await tx`delete from public.ownership_transfers where id = ${scenario.transferId}`
      await tx`delete from public.ownership_holdings where id in (${scenario.buyerHoldingId}, ${scenario.sourceHoldingId})`
      await tx`delete from public.ownership_offerings where id = ${scenario.offeringId}`
    }
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

async function createTransferScenario({
  suffix,
  fiscalYear,
  sellerStatus,
  sellerOwnershipBps,
  sellerUnits,
  buyerAcquiredAt,
  transferCompletedAt,
}: {
  suffix: string
  fiscalYear: number
  sellerStatus: 'active' | 'transferred'
  sellerOwnershipBps: number
  sellerUnits: number
  buyerAcquiredAt: string
  transferCompletedAt: string
}) {
  const snapshot = await createPublishedFinancialSnapshot({
    suffix,
    fiscalYear,
    revenue: 1_000_000_000,
    expenses: 100_000_000,
  })

  const principal = { kind: 'authenticated' as const, userId: fixtures.superAdmin.userId }
  const created = await asCommitted(principal, async (tx) => {
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
        ${`Ownership cutoff ${suffix}`},
        ${`ownership-cutoff-${suffix}`},
        'open',
        4000,
        80,
        100000000,
        50,
        1,
        36,
        ${`${fiscalYear}-01-01T00:00:00Z`},
        ${fixtures.superAdmin.userId},
        ${fixtures.superAdmin.userId}
      )
      returning id
    `
    if (!offering) throw new Error('Failed to create offering fixture.')

    const [source] = await tx<{ id: string }[]>`
      insert into public.ownership_holdings (
        offering_id,
        investor_id,
        units,
        ownership_bps,
        acquisition_at,
        transfer_eligible_at,
        status,
        acquisition_reference,
        created_by,
        updated_by
      ) values (
        ${offering.id},
        ${fixtures.investorA.userId},
        ${sellerUnits},
        ${sellerOwnershipBps},
        ${`${fiscalYear}-01-01T00:00:00Z`},
        ${`${fiscalYear}-01-01T00:00:00Z`},
        ${sellerStatus},
        ${`CUT-SOURCE-${suffix}`},
        ${fixtures.superAdmin.userId},
        ${fixtures.superAdmin.userId}
      )
      returning id
    `
    if (!source) throw new Error('Failed to create source holding fixture.')

    const [buyer] = await tx<{ id: string }[]>`
      insert into public.ownership_holdings (
        offering_id,
        investor_id,
        units,
        ownership_bps,
        acquisition_at,
        transfer_eligible_at,
        status,
        acquisition_reference,
        created_by,
        updated_by
      ) values (
        ${offering.id},
        ${fixtures.investorB.userId},
        1,
        80,
        ${buyerAcquiredAt},
        ${buyerAcquiredAt},
        'active',
        ${`CUT-BUYER-${suffix}`},
        ${fixtures.superAdmin.userId},
        ${fixtures.superAdmin.userId}
      )
      returning id
    `
    if (!buyer) throw new Error('Failed to create buyer holding fixture.')

    return { offeringId: offering.id, sourceHoldingId: source.id, buyerHoldingId: buyer.id }
  })

  const [transfer] = await db()<{ id: string }[]>`
    insert into public.ownership_transfers (
      holding_id,
      from_investor_id,
      to_investor_id,
      units,
      requested_at,
      eligible_at,
      status,
      approved_at,
      approved_by,
      completed_at,
      transfer_kind,
      requested_unit_price,
      agreed_unit_price,
      processing_at,
      processing_by,
      completed_by
    ) values (
      ${created.sourceHoldingId},
      ${fixtures.investorA.userId},
      ${fixtures.investorB.userId},
      1,
      ${transferCompletedAt},
      ${`${fiscalYear}-01-01T00:00:00Z`},
      'completed',
      ${transferCompletedAt},
      ${fixtures.superAdmin.userId},
      ${transferCompletedAt},
      'sale',
      100000000,
      100000000,
      ${transferCompletedAt},
      ${fixtures.superAdmin.userId},
      ${fixtures.superAdmin.userId}
    )
    returning id
  `
  if (!transfer) throw new Error('Failed to create completed transfer fixture.')

  const result = await asCommitted(principal, async (tx) => {
    const [distribution] = await tx<{ id: string }[]>`
      select id
      from app.create_profit_distribution(
        ${created.offeringId},
        ${snapshot.versionId},
        6000,
        4000,
        ${`Regression transfer cutoff ${suffix}`}
      )
    `
    if (!distribution) throw new Error('Failed to create distribution fixture.')

    const rows = await tx<
      {
        holding_id: string
        investor_id: string
        ownership_bps: number
        allocation_amount: string
      }[]
    >`
      select holding_id, investor_id, ownership_bps, allocation_amount::text
      from app.regenerate_profit_distribution_allocations(${distribution.id})
      order by investor_id, holding_id
    `

    scenarios.push({
      offeringId: created.offeringId,
      distributionId: distribution.id,
      sourceHoldingId: created.sourceHoldingId,
      buyerHoldingId: created.buyerHoldingId,
      transferId: transfer.id,
    })

    return rows
  })

  return { ...created, result }
}

describe('profit distribution ownership transfer cutoff edges', () => {
  it('keeps a fully transferred seller entitled when the full sale completes after period cutoff', async () => {
    const fiscalYear = 2187
    const scenario = await createTransferScenario({
      suffix: `${fixtures.suffix}-full-after`,
      fiscalYear,
      sellerStatus: 'transferred',
      sellerOwnershipBps: 80,
      sellerUnits: 1,
      buyerAcquiredAt: '2188-01-15T00:00:00Z',
      transferCompletedAt: '2188-01-15T00:00:00Z',
    })

    expect(scenario.result).toHaveLength(1)
    expect(scenario.result[0]!.holding_id).toBe(scenario.sourceHoldingId)
    expect(scenario.result[0]!.investor_id).toBe(fixtures.investorA.userId)
    expect(scenario.result[0]!.ownership_bps).toBe(80)
    expect(Number(scenario.result[0]!.allocation_amount)).toBe(7_200_000)
  }, 60_000)

  it('moves entitlement to the buyer when the transfer completed before period cutoff', async () => {
    const fiscalYear = 2186
    const scenario = await createTransferScenario({
      suffix: `${fixtures.suffix}-before-cutoff`,
      fiscalYear,
      sellerStatus: 'transferred',
      sellerOwnershipBps: 80,
      sellerUnits: 1,
      buyerAcquiredAt: '2186-06-15T00:00:00Z',
      transferCompletedAt: '2186-06-15T00:00:00Z',
    })

    expect(scenario.result).toHaveLength(1)
    expect(scenario.result[0]!.holding_id).toBe(scenario.buyerHoldingId)
    expect(scenario.result[0]!.investor_id).toBe(fixtures.investorB.userId)
    expect(scenario.result[0]!.ownership_bps).toBe(80)
    expect(Number(scenario.result[0]!.allocation_amount)).toBe(7_200_000)
  }, 60_000)
})
