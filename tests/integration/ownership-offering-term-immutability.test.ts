// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let offeringId: string
let holdingId: string

beforeAll(async () => {
  fixtures = await createFixtures()
  const sql = db()

  const [offering] = await sql<{ id: string }[]>`
    insert into public.ownership_offerings (
      name, code, status, total_offered_bps, unit_ownership_bps,
      unit_price, total_units, distribution_cadence_months, transfer_lock_months
    ) values (
      ${`Immutable Offering ${fixtures.suffix}`},
      ${`immutable-${fixtures.suffix}`},
      'paused', 200, 100, 100000000, 2, 1, 36
    ) returning id
  `
  if (!offering) throw new Error('Failed to create offering fixture.')
  offeringId = offering.id

  const [holding] = await sql<{ id: string }[]>`
    insert into public.ownership_holdings (
      offering_id, investor_id, units, ownership_bps,
      transfer_eligible_at, status, acquisition_reference
    ) values (
      ${offeringId}, ${fixtures.investorA.userId}, 1, 100,
      ${new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000).toISOString()},
      'active', ${`IMMUTABLE-${fixtures.suffix}`}
    ) returning id
  `
  if (!holding) throw new Error('Failed to create holding fixture.')
  holdingId = holding.id
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.ownership_holdings where id = ${holdingId}`
    await tx`delete from public.ownership_offerings where id = ${offeringId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('ownership offering economic term immutability', () => {
  it('rejects economic term changes after the first holding exists', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.superAdmin.userId },
        (tx) => tx`update public.ownership_offerings set unit_price = 125000000 where id = ${offeringId}`,
      ),
    )

    expect(error.code).toBe('23514')
  })

  it('still allows non-economic descriptive metadata changes', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      (tx) => tx<{ description: string | null }[]>`
        update public.ownership_offerings
        set description = 'Updated description only'
        where id = ${offeringId}
        returning description
      `,
    )

    expect(rows[0]?.description).toBe('Updated description only')
  })
})
