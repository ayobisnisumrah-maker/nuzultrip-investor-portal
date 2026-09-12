// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asCommitted, cleanup, closeDb, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'
import { createPublishedFinancialSnapshot } from './helpers/financial-snapshot'

let fixtures: Fixtures
let offeringId: string | null = null
let distributionId: string | null = null
let holdingId: string | null = null

beforeAll(async () => {
  fixtures = await createFixtures()
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    if (distributionId) {
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

describe('profit distribution ownership cutoff missing history', () => {
  it('fails closed when a transferred holding has no completed transfer history', async () => {
    const snapshot = await createPublishedFinancialSnapshot({
      suffix: `${fixtures.suffix}-missing-transfer-history`,
      fiscalYear: 2185,
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
          'Ownership cutoff missing history',
          ${`ownership-cutoff-missing-${fixtures.suffix}`},
          'open',
          4000,
          80,
          100000000,
          50,
          1,
          36,
          '2185-01-01T00:00:00Z',
          ${fixtures.superAdmin.userId},
          ${fixtures.superAdmin.userId}
        )
        returning id
      `
      if (!offering) throw new Error('Gagal membuat fixture penawaran.')
      offeringId = offering.id

      const [holding] = await tx<{ id: string }[]>`
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
          '2185-01-01T00:00:00Z',
          '2185-01-01T00:00:00Z',
          'transferred',
          ${`CUT-MISSING-${fixtures.suffix}`},
          ${fixtures.superAdmin.userId},
          ${fixtures.superAdmin.userId}
        )
        returning id
      `
      if (!holding) throw new Error('Gagal membuat fixture holding yang dialihkan.')
      holdingId = holding.id

      const [distribution] = await tx<{ id: string }[]>`
        select id
        from app.create_profit_distribution(
          ${offering.id},
          ${snapshot.versionId},
          6000,
          4000,
          'Regresi: histori transfer yang hilang harus gagal secara tertutup.'
        )
      `
      if (!distribution) throw new Error('Gagal membuat fixture distribusi.')
      distributionId = distribution.id

      return distribution.id
    })

    const error = await expectRejected(() =>
      asCommitted(principal, async (tx) => {
        await tx`select * from app.regenerate_profit_distribution_allocations(${created})`
      }),
    )

    expect(error.code).toBe('23514')
    expect(error.message).toContain(
      'Riwayat kepemilikan tidak dapat direkonstruksi karena holding yang dialihkan tidak memiliki transaksi penyelesaian.',
    )
  }, 60_000)
})
