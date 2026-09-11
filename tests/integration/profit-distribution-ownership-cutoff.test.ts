// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asCommitted, cleanup, closeDb, db } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'
import {
  createPublishedFinancialSnapshot,
  destroyFinancialSnapshot,
  type FinancialSnapshotFixture,
} from './helpers/financial-snapshot'

let fixtures: Fixtures
let offeringId: string | null = null
let distributionId: string | null = null
let sourceHoldingId: string | null = null
let buyerHoldingId: string | null = null
let transferId: string | null = null
let financialSnapshot: FinancialSnapshotFixture | null = null

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
    if (transferId) {
      await tx`delete from public.ownership_transfers where id = ${transferId}`
    }
    if (buyerHoldingId) {
      await tx`delete from public.ownership_holdings where id = ${buyerHoldingId}`
    }
    if (sourceHoldingId) {
      await tx`delete from public.ownership_holdings where id = ${sourceHoldingId}`
    }
    if (offeringId) {
      await tx`delete from public.ownership_offerings where id = ${offeringId}`
    }
  })
  await destroyFinancialSnapshot(financialSnapshot)
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('profit distribution ownership cutoff', () => {
  it('uses seller ownership at period end when a partial sale completes after the cutoff', async () => {
    const snapshot = await createPublishedFinancialSnapshot({
      suffix: `${fixtures.suffix}-cutoff`,
      fiscalYear: 2188,
      revenue: 1_000_000_000,
      expenses: 100_000_000,
    })
    financialSnapshot = snapshot

    const ownership = await asCommitted(
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
            'Ownership Cutoff Test',
            ${`ownership-cutoff-${fixtures.suffix}`},
            'open',
            4000,
            80,
            100000000,
            50,
            1,
            36,
            '2188-01-01T00:00:00Z',
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
          returning id
        `
        if (!offering) throw new Error('Failed to create offering fixture.')
        offeringId = offering.id

        // This is the seller lot after a one-unit partial sale completed on
        // 2189-01-15. At the 2188-12-31 cutoff the seller still owned 2 units
        // (160 bps), although the mutable holding now contains only 80 bps.
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
            1,
            80,
            '2188-01-01T00:00:00Z',
            '2188-01-01T00:00:00Z',
            'active',
            ${`CUT-SOURCE-${fixtures.suffix}`},
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
          returning id
        `
        if (!source) throw new Error('Failed to create source holding.')
        sourceHoldingId = source.id

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
            '2189-01-15T00:00:00Z',
            '2192-01-15T00:00:00Z',
            'active',
            ${`SALE-CUTOFF-${fixtures.suffix}`},
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
          returning id
        `
        if (!buyer) throw new Error('Failed to create buyer holding.')
        buyerHoldingId = buyer.id

        return { offeringId: offering.id, sourceHoldingId: source.id }
      },
    )

    // The row below is historical test-fixture state, not an application write.
    // Production transfer creation remains behind the share-sale workflow/RLS.
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
        ${ownership.sourceHoldingId},
        ${fixtures.investorA.userId},
        ${fixtures.investorB.userId},
        1,
        '2189-01-10T00:00:00Z',
        '2188-01-01T00:00:00Z',
        'completed',
        '2189-01-11T00:00:00Z',
        ${fixtures.superAdmin.userId},
        '2189-01-15T00:00:00Z',
        'sale',
        100000000,
        100000000,
        '2189-01-12T00:00:00Z',
        ${fixtures.superAdmin.userId},
        ${fixtures.superAdmin.userId}
      )
      returning id
    `
    if (!transfer) throw new Error('Failed to create completed transfer history.')
    transferId = transfer.id

    const result = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) => {
        const [distribution] = await tx<{ id: string }[]>`
          select id
          from app.create_profit_distribution(
            ${ownership.offeringId},
            ${snapshot.versionId},
            6000,
            4000,
            'Regression: ownership must be reconstructed at the period cutoff.'
          )
        `
        if (!distribution) throw new Error('Failed to create distribution.')
        distributionId = distribution.id

        return tx<
          {
            holding_id: string
            investor_id: string
            ownership_bps: number
            investor_pool_share_bps: number
            allocation_amount: string
          }[]
        >`
          select
            holding_id,
            investor_id,
            ownership_bps,
            investor_pool_share_bps,
            allocation_amount::text
          from app.regenerate_profit_distribution_allocations(${distribution.id})
          order by holding_id
        `
      },
    )

    expect(result).toHaveLength(1)
    expect(result[0]!.holding_id).toBe(sourceHoldingId)
    expect(result[0]!.investor_id).toBe(fixtures.investorA.userId)
    expect(result[0]!.ownership_bps).toBe(160)
    expect(result[0]!.investor_pool_share_bps).toBe(400)
    expect(Number(result[0]!.allocation_amount)).toBe(14_400_000)
  }, 60_000)
})
