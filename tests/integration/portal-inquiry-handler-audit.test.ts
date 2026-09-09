// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asCommitted, cleanup, closeDb, db } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let inquiryId: string

beforeAll(async () => {
  fixtures = await createFixtures()
  const [inquiry] = await db()<[{ id: string }]>`
    insert into public.portal_inquiries (
      name,
      email,
      message,
      source_page
    )
    values (
      'Inquiry Handler Audit',
      ${`inquiry-handler-${fixtures.suffix}@example.test`},
      'Regression fixture for portal inquiry handler attribution.',
      '/hubungi'
    )
    returning id
  `

  if (!inquiry) throw new Error('Failed to create portal inquiry fixture.')
  inquiryId = inquiry.id
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.portal_inquiries where id = ${inquiryId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('portal inquiry handler audit', () => {
  it('records the authenticated admin when an inquiry leaves new', async () => {
    await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      (tx) => tx`
        update public.portal_inquiries
        set status = 'in_progress'::public.inquiry_status
        where id = ${inquiryId}
      `,
    )

    const [handled] = await db()<
      { status: string; handled_by: string | null; handled_at: Date | null }[]
    >`
      select status::text, handled_by, handled_at
      from public.portal_inquiries
      where id = ${inquiryId}
    `

    expect(handled).toBeDefined()
    expect(handled?.status).toBe('in_progress')
    expect(handled?.handled_by).toBe(fixtures.superAdmin.userId)
    expect(handled?.handled_at).toBeInstanceOf(Date)
  })

  it('clears the active handler assignment when returned to new', async () => {
    await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      (tx) => tx`
        update public.portal_inquiries
        set status = 'new'::public.inquiry_status
        where id = ${inquiryId}
      `,
    )

    const [reset] = await db()<
      { status: string; handled_by: string | null; handled_at: Date | null }[]
    >`
      select status::text, handled_by, handled_at
      from public.portal_inquiries
      where id = ${inquiryId}
    `

    expect(reset).toEqual({
      status: 'new',
      handled_by: null,
      handled_at: null,
    })
  })
})
