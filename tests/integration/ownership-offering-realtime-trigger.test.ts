// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, cleanup, closeDb, db } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let offeringId: string | null = null

beforeAll(async () => {
  fixtures = await createFixtures()
}, 60_000)

afterAll(async () => {
  if (offeringId) {
    await cleanup(async (tx) => {
      await tx`delete from public.ownership_offerings where id = ${offeringId}`
    })
  }
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('ownership offering realtime trigger', () => {
  it('allows a permitted admin to create an offering while realtime events are enabled', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      (tx) => tx<{ id: string }[]>`
        insert into public.ownership_offerings (
          name, code, status, total_offered_bps, unit_ownership_bps,
          unit_price, total_units, distribution_cadence_months, transfer_lock_months,
          created_by, updated_by
        ) values (
          ${`Realtime Offering ${fixtures.suffix}`},
          ${`realtime-${fixtures.suffix}`},
          'draft', 200, 100, 100000000, 2, 1, 36,
          ${fixtures.superAdmin.userId}, ${fixtures.superAdmin.userId}
        )
        returning id
      `,
    )

    expect(rows).toHaveLength(1)
    offeringId = rows[0]?.id ?? null
    expect(offeringId).toBeTruthy()
  })
})
