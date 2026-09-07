// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, cleanup, closeDb, db } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let rejectedInvestorId: string

beforeAll(async () => {
  fixtures = await createFixtures()

  const sql = db()
  rejectedInvestorId = randomUUID()
  const email = `rejected-boundary.${fixtures.suffix}@example.test`

  await sql`insert into auth.users (id, email) values (${rejectedInvestorId}, ${email})`
  await sql`
    insert into public.user_accounts (id, account_type, email, full_name)
    values (${rejectedInvestorId}, 'investor', ${email}, 'Rejected Boundary Investor')
  `
  await sql`
    insert into public.investors (id, legal_name)
    values (${rejectedInvestorId}, 'Rejected Boundary Investor')
  `

  for (const status of ['submitted', 'under_review', 'rejected']) {
    await sql`
      update public.investors
      set status = ${status}::public.investor_status,
          rejection_reason = case
            when ${status} = 'rejected' then 'Rejected for boundary test.'
            else rejection_reason
          end
      where id = ${rejectedInvestorId}
    `
  }
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from auth.users where id = ${rejectedInvestorId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('investor direct self-update boundary', () => {
  it('still lets a rejected investor read their own lifecycle row', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: rejectedInvestorId },
      (tx) => tx`select id, status, rejection_reason from public.investors`,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]!['id']).toBe(rejectedInvestorId)
    expect(rows[0]!['status']).toBe('rejected')
  })

  it('does not let a rejected investor rewrite administrative lifecycle metadata', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: rejectedInvestorId },
      (tx) =>
        tx`
          update public.investors
          set reviewed_at = now(),
              approved_at = now(),
              activated_at = now(),
              rejection_reason = 'self-written reason'
          where id = ${rejectedInvestorId}
          returning id
        `,
    )

    expect(rows).toHaveLength(0)
  })

  it('does not let a rejected investor bypass the server profile allow-list', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: rejectedInvestorId },
      (tx) =>
        tx`
          update public.investors
          set legal_name = 'Direct client rewrite',
              bank_account_number = '999999999'
          where id = ${rejectedInvestorId}
          returning id
        `,
    )

    expect(rows).toHaveLength(0)
  })

  it('preserves legitimate admin updates through RBAC', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.internalAdmin.userId },
      (tx) =>
        tx`
          update public.investors
          set legal_name = 'Reviewed legal name'
          where id = ${rejectedInvestorId}
          returning id, legal_name
        `,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]!['legal_name']).toBe('Reviewed legal name')
  })
})
