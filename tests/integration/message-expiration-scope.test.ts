// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let threadAId: string
let threadBId: string

beforeAll(async () => {
  fixtures = await createFixtures()
  const sql = db()
  const expiredAt = new Date(Date.now() - 60_000).toISOString()

  const [threadA] = await sql<{ id: string }[]>`
    insert into public.message_threads (
      subject, thread_kind, investor_id, created_by, initiated_by,
      expires_at, awaiting_admin_reply, is_closed
    ) values (
      ${`Expiry A ${fixtures.suffix}`}, 'investor_admin', ${fixtures.investorA.userId},
      ${fixtures.internalAdmin.userId}, 'investor', ${expiredAt}, true, false
    )
    returning id
  `
  const [threadB] = await sql<{ id: string }[]>`
    insert into public.message_threads (
      subject, thread_kind, investor_id, created_by, initiated_by,
      expires_at, awaiting_admin_reply, is_closed
    ) values (
      ${`Expiry B ${fixtures.suffix}`}, 'investor_admin', ${fixtures.investorB.userId},
      ${fixtures.internalAdmin.userId}, 'investor', ${expiredAt}, true, false
    )
    returning id
  `

  if (!threadA || !threadB) throw new Error('Failed to create expired message threads.')
  threadAId = threadA.id
  threadBId = threadB.id
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.message_threads where id in (${threadAId}, ${threadBId})`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('message thread expiry reconciliation scope', () => {
  it('lets an active investor expire only their own eligible thread', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx<{ count: number }[]>`select app.expire_message_threads()::integer as count`,
    )

    expect(rows[0]?.count).toBe(1)
  })

  it('lets a messages.view admin reconcile all eligible threads', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.internalAdmin.userId },
      (tx) => tx<{ count: number }[]>`select app.expire_message_threads()::integer as count`,
    )

    expect(rows[0]?.count).toBe(2)
  })

  it('rejects an inactive investor from running expiry reconciliation', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.investorInactive.userId },
        (tx) => tx`select app.expire_message_threads()`,
      ),
    )

    expect(error.code).toBe('42501')
  })
})
