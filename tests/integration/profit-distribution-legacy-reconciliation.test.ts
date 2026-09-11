// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, asCommitted, cleanup, closeDb, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'
import {
  createPublishedFinancialSnapshot,
  destroyFinancialSnapshot,
  type FinancialSnapshotFixture,
} from './helpers/financial-snapshot'

let fixtures: Fixtures
let offeringId: string | null = null
let distributionId: string | null = null
let snapshot: FinancialSnapshotFixture | null = null
let otherSnapshot: FinancialSnapshotFixture | null = null

beforeAll(async () => {
  fixtures = await createFixtures()
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    if (distributionId) {
      await tx`delete from public.profit_distribution_allocations where distribution_id = ${distributionId}`
      await tx`delete from public.profit_distributions where id = ${distributionId}`
    }
    if (offeringId) {
      await tx`delete from public.ownership_offerings where id = ${offeringId}`
    }
  })
  await destroyFinancialSnapshot(snapshot)
  await destroyFinancialSnapshot(otherSnapshot)
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('profit distribution legacy reconciliation guard', () => {
  it('blocks unsourced/direct lifecycle bypasses and keeps linked economics immutable', async () => {
    snapshot = await createPublishedFinancialSnapshot({
      suffix: `${fixtures.suffix}-legacy-reconcile`,
      fiscalYear: 2196,
      revenue: 1_000_000_000,
      expenses: 100_000_000,
    })
    otherSnapshot = await createPublishedFinancialSnapshot({
      suffix: `${fixtures.suffix}-legacy-reconcile-other`,
      fiscalYear: 2197,
      revenue: 1_000_000_000,
      expenses: 100_000_000,
    })

    const [offering] = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) =>
        tx<{ id: string }[]>`
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
            'Legacy Reconciliation Guard Test',
            ${`legacy-reconcile-${fixtures.suffix}`},
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
        `,
    )
    if (!offering) throw new Error('Failed to create offering fixture.')
    offeringId = offering.id

    const missingSnapshot = await expectRejected(() =>
      as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
        await tx`
          insert into public.profit_distributions (
            offering_id,
            period_start,
            period_end,
            revenue_amount,
            opex_amount,
            profit_amount,
            company_share_bps,
            investor_pool_bps,
            investor_pool_amount,
            status,
            created_by,
            updated_by
          ) values (
            ${offering.id},
            '2196-01-01',
            '2196-12-31',
            1000000000,
            100000000,
            900000000,
            6000,
            4000,
            360000000,
            'draft',
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
        `
      }),
    )
    expect(missingSnapshot.code).toBe('23514')
    expect(missingSnapshot.message).toContain('authoritative financial report snapshot')

    const directPayable = await expectRejected(() =>
      as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
        await tx`
          insert into public.profit_distributions (
            offering_id,
            financial_report_version_id,
            period_start,
            period_end,
            revenue_amount,
            opex_amount,
            profit_amount,
            company_share_bps,
            investor_pool_bps,
            investor_pool_amount,
            status,
            created_by,
            updated_by
          ) values (
            ${offering.id},
            ${snapshot!.versionId},
            '2196-01-01',
            '2196-12-31',
            1000000000,
            100000000,
            900000000,
            6000,
            4000,
            360000000,
            'payable',
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
        `
      }),
    )
    expect(directPayable.code).toBe('23514')
    expect(directPayable.message).toContain('must start in draft')

    const periodMismatch = await expectRejected(() =>
      as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
        await tx`
          insert into public.profit_distributions (
            offering_id,
            financial_report_version_id,
            period_start,
            period_end,
            revenue_amount,
            opex_amount,
            profit_amount,
            company_share_bps,
            investor_pool_bps,
            investor_pool_amount,
            status,
            created_by,
            updated_by
          ) values (
            ${offering.id},
            ${snapshot!.versionId},
            '2196-01-02',
            '2196-12-31',
            1000000000,
            100000000,
            900000000,
            6000,
            4000,
            360000000,
            'draft',
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
        `
      }),
    )
    expect(periodMismatch.code).toBe('23514')
    expect(periodMismatch.message).toContain('period must exactly match')

    const [distribution] = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) =>
        tx<{ id: string }[]>`
          insert into public.profit_distributions (
            offering_id,
            financial_report_version_id,
            period_start,
            period_end,
            revenue_amount,
            opex_amount,
            profit_amount,
            company_share_bps,
            investor_pool_bps,
            investor_pool_amount,
            status,
            created_by,
            updated_by
          ) values (
            ${offering.id},
            ${snapshot!.versionId},
            '2196-01-01',
            '2196-12-31',
            1000000000,
            100000000,
            900000000,
            6000,
            4000,
            360000000,
            'draft',
            ${fixtures.superAdmin.userId},
            ${fixtures.superAdmin.userId}
          )
          returning id
        `,
    )
    if (!distribution) throw new Error('Failed to create linked distribution fixture.')
    distributionId = distribution.id

    const economicsMutation = await expectRejected(() =>
      as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
        await tx`
          update public.profit_distributions
          set revenue_amount = revenue_amount + 1
          where id = ${distribution.id}
        `
      }),
    )
    expect(economicsMutation.code).toBe('23514')
    expect(economicsMutation.message).toContain('no longer reconciles')

    const sourceMutation = await expectRejected(() =>
      as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
        await tx`
          update public.profit_distributions
          set financial_report_version_id = ${otherSnapshot!.versionId}
          where id = ${distribution.id}
        `
      }),
    )
    expect(sourceMutation.code).toBe('23514')
    expect(sourceMutation.message).toContain('immutable once assigned')
  }, 60_000)
})
