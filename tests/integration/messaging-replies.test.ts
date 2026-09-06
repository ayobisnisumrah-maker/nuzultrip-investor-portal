// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let openThreadId: string
let closedThreadId: string

beforeAll(async () => {
  fixtures = await createFixtures()
  const sql = db()

  const [openThread] = await sql<{ id: string }[]>`
    insert into public.message_threads (subject, thread_kind, investor_id, created_by)
    values (
      ${`Chat dua arah ${fixtures.suffix}`},
      'investor_admin',
      ${fixtures.investorA.userId},
      ${fixtures.internalAdmin.userId}
    )
    returning id
  `
  if (!openThread) throw new Error('Failed to create open messaging fixture.')
  openThreadId = openThread.id

  await sql`
    insert into public.thread_participants (thread_id, user_id, role) values
      (${openThreadId}, ${fixtures.investorA.userId}, 'investor'),
      (${openThreadId}, ${fixtures.internalAdmin.userId}, 'admin')
  `

  const [closedThread] = await sql<{ id: string }[]>`
    insert into public.message_threads (
      subject,
      thread_kind,
      investor_id,
      created_by,
      is_closed,
      closed_at,
      closed_by
    )
    values (
      ${`Chat ditutup ${fixtures.suffix}`},
      'investor_admin',
      ${fixtures.investorA.userId},
      ${fixtures.internalAdmin.userId},
      true,
      now(),
      ${fixtures.internalAdmin.userId}
    )
    returning id
  `
  if (!closedThread) throw new Error('Failed to create closed messaging fixture.')
  closedThreadId = closedThread.id

  await sql`
    insert into public.thread_participants (thread_id, user_id, role) values
      (${closedThreadId}, ${fixtures.investorA.userId}, 'investor'),
      (${closedThreadId}, ${fixtures.internalAdmin.userId}, 'admin')
  `
})

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.message_threads where id in (${openThreadId}, ${closedThreadId})`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('investor messaging replies', () => {
  it('allows an investor participant to reply to their own open thread', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx<{ id: string; body_text: string }[]>`
        insert into public.messages (thread_id, sender_id, sender_label, body_text)
        values (
          ${openThreadId},
          ${fixtures.investorA.userId},
          'Investor A Uji',
          'Balasan investor dengan emoji 🙏'
        )
        returning id, body_text
      `,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.body_text).toBe('Balasan investor dengan emoji 🙏')
  })

  it('rejects sender spoofing even inside a thread the investor participates in', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.investorA.userId },
        (tx) => tx`
          insert into public.messages (thread_id, sender_id, body_text)
          values (${openThreadId}, ${fixtures.investorB.userId}, 'Pesan dengan identitas palsu')
        `,
      ),
    )

    expect(error.code).toBe('42501')
  })

  it('rejects a reply from an investor who is not a participant', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.investorB.userId },
        (tx) => tx`
          insert into public.messages (thread_id, sender_id, body_text)
          values (${openThreadId}, ${fixtures.investorB.userId}, 'Mencoba masuk ke chat investor lain')
        `,
      ),
    )

    expect(error.code).toBe('42501')
  })

  it('rejects new replies after the thread has been closed', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.investorA.userId },
        (tx) => tx`
          insert into public.messages (thread_id, sender_id, body_text)
          values (${closedThreadId}, ${fixtures.investorA.userId}, 'Tidak boleh terkirim')
        `,
      ),
    )

    expect(error.code).toBe('42501')
  })
})
