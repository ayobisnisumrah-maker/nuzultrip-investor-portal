// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cleanup, closeDb, db, expectRejected } from './helpers/db'

let investorId: string
let offeringId: string | undefined
let holdingId: string | undefined

beforeAll(async () => {
  const sql = db()
  investorId = randomUUID()
  const suffix = investorId.slice(0, 8)
  const email = `rejected-retention.${suffix}@example.test`

  await sql`insert into auth.users (id, email) values (${investorId}, ${email})`
  await sql`
    insert into public.user_accounts (id, account_type, email, full_name)
    values (${investorId}, 'investor', ${email}, 'Rejected Retention Test')
  `
  await sql`
    insert into public.investors (id, legal_name)
    values (${investorId}, 'Rejected Retention Test')
  `
  await sql`
    update public.investors
    set status = 'submitted'::public.investor_status
    where id = ${investorId}
  `
}, 30_000)

afterAll(async () => {
  if (investorId) {
    await cleanup(async (tx) => {
      if (holdingId) await tx`delete from public.ownership_holdings where id = ${holdingId}`
      if (offeringId) await tx`delete from public.ownership_offerings where id = ${offeringId}`
      await tx`delete from auth.users where id = ${investorId}`
    })
  }
  await closeDb()
})

describe('rejected investor retention', () => {
  it('database-stamps rejection time and makes rejection terminal', async () => {
    const sql = db()
    const before = Date.now()

    const [row] = await sql<{ rejected_at: Date }[]>`
      update public.investors
      set status = 'rejected'::public.investor_status,
          rejected_at = now() - interval '30 days'
      where id = ${investorId}
      returning rejected_at
    `
    if (!row) throw new Error('Rejected investor fixture was not updated.')

    const stamped = new Date(row.rejected_at).getTime()
    expect(stamped).toBeGreaterThanOrEqual(before - 5_000)
    expect(stamped).toBeLessThanOrEqual(Date.now() + 5_000)

    const reopenError = await expectRejected(() =>
      sql`
        update public.investors
        set status = 'under_review'::public.investor_status
        where id = ${investorId}
      `,
    )
    expect(reopenError.code).toBe('23514')
  })

  it('does not select a rejected applicant before the 72-hour retention window', async () => {
    const sql = db()
    const rows = await sql<{ id: string }[]>`
      select id from app.list_rejected_investor_purge_candidates(50)
      where id = ${investorId}
    `
    expect(rows).toHaveLength(0)
  })

  it('selects the applicant after 72 hours and reports durable ownership blockers', async () => {
    const sql = db()

    await cleanup(async (tx) => {
      await tx`
        update public.investors
        set rejected_at = now() - interval '73 hours'
        where id = ${investorId}
      `
    })

    const eligible = await sql<{ id: string }[]>`
      select id from app.list_rejected_investor_purge_candidates(50)
      where id = ${investorId}
    `
    expect(eligible).toHaveLength(1)

    const [offering] = await sql<{ id: string }[]>`
      insert into public.ownership_offerings (
        name, code, status, total_offered_bps, unit_ownership_bps,
        unit_price, total_units, distribution_cadence_months, transfer_lock_months
      ) values (
        'Rejected Retention Safety',
        ${`rejected-retention-${investorId.slice(0, 8)}`},
        'open', 80, 80, 100000000, 1, 1, 36
      )
      returning id
    `
    if (!offering) throw new Error('Retention safety offering was not created.')
    offeringId = offering.id

    const [holding] = await sql<{ id: string }[]>`
      insert into public.ownership_holdings (
        offering_id, investor_id, units, ownership_bps, acquisition_at,
        transfer_eligible_at, status, acquisition_reference
      ) values (
        ${offeringId}, ${investorId}, 1, 80, now(), now() + interval '36 months',
        'active', ${`RETENTION-${investorId.slice(0, 8)}`}
      )
      returning id
    `
    if (!holding) throw new Error('Retention safety holding was not created.')
    holdingId = holding.id

    const [blockerRow] = await sql<{ blockers: string[] }[]>`
      select app.rejected_investor_purge_blockers(${investorId}) as blockers
    `
    expect(blockerRow?.blockers).toContain('ownership_holdings')
  })
})
