import postgres, { type Sql } from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { closeDb, db } from './db'
import { as, expectRejected } from './rls-test-helpers'
import { createRlsFixtures, destroyFixtures, type RlsFixtures } from './rls-fixtures'

type OperationalContent = {
  activeThreadId: string
  activeMessageId: string
  activeNotificationId: string
  activeStorageObjectId: string
  activeTransferId: string
  inactiveThreadId: string
  inactiveMessageId: string
  inactiveNotificationId: string
  inactiveStorageObjectId: string
  inactiveTransferId: string
  inactiveHoldingId: string
}

let fixtures: RlsFixtures | null = null
let content: OperationalContent | null = null

async function createOperationalContent(sql: Sql, f: RlsFixtures): Promise<OperationalContent> {
  const [activeThread] = await sql<{ id: string }[]>`
    insert into public.message_threads (thread_kind, subject, investor_id, created_by)
    values ('investor_admin', 'Active lifecycle thread', ${f.investorA.investorId}, ${f.admin.userId})
    returning id
  `
  const [inactiveThread] = await sql<{ id: string }[]>`
    insert into public.message_threads (thread_kind, subject, investor_id, created_by)
    values ('investor_admin', 'Historical lifecycle thread', ${f.investorInactive.investorId}, ${f.admin.userId})
    returning id
  `

  await sql`
    insert into public.thread_participants (thread_id, user_id, role)
    values
      (${activeThread.id}, ${f.investorA.userId}, 'investor'),
      (${activeThread.id}, ${f.admin.userId}, 'admin'),
      (${inactiveThread.id}, ${f.investorInactive.userId}, 'investor'),
      (${inactiveThread.id}, ${f.admin.userId}, 'admin')
  `

  const [activeMessage] = await sql<{ id: string }[]>`
    insert into public.messages (thread_id, sender_id, sender_label, body_text)
    values (${activeThread.id}, ${f.admin.userId}, 'Admin', 'Active lifecycle message')
    returning id
  `
  const [inactiveMessage] = await sql<{ id: string }[]>`
    insert into public.messages (thread_id, sender_id, sender_label, body_text)
    values (${inactiveThread.id}, ${f.admin.userId}, 'Admin', 'Historical lifecycle message')
    returning id
  `

  await sql`
    insert into public.message_reads (message_id, user_id)
    values
      (${activeMessage.id}, ${f.investorA.userId}),
      (${inactiveMessage.id}, ${f.investorInactive.userId})
  `

  const [activeNotification] = await sql<{ id: string }[]>`
    insert into public.notifications (recipient_id, kind, title, body)
    values (${f.investorA.userId}, 'ownership_updated', 'Active notification', 'Active investor notification')
    returning id
  `
  const [inactiveNotification] = await sql<{ id: string }[]>`
    insert into public.notifications (recipient_id, kind, title, body)
    values (${f.investorInactive.userId}, 'ownership_updated', 'Inactive notification', 'Inactive investor notification')
    returning id
  `

  const activeStorageName = `${f.investorA.investorId}/active-proof.pdf`
  const inactiveStorageName = `${f.investorInactive.investorId}/inactive-proof.pdf`
  const [activeStorage] = await sql<{ id: string }[]>`
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values ('profit-distribution-proofs', ${activeStorageName}, ${f.investorA.userId}, '{}'::jsonb)
    returning id
  `
  const [inactiveStorage] = await sql<{ id: string }[]>`
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values ('profit-distribution-proofs', ${inactiveStorageName}, ${f.investorInactive.userId}, '{}'::jsonb)
    returning id
  `

  const [offering] = await sql<{ id: string }[]>`
    insert into public.ownership_offerings (
      code, name, total_units, unit_price, unit_ownership_bps, offered_ownership_bps,
      transfer_lock_months, status, published_at, created_by, updated_by
    ) values (
      'OP-GATE-' || substr(gen_random_uuid()::text, 1, 8), 'Operational Gate Offering',
      100, 100000000, 80, 4000, 0, 'open', now(), ${f.admin.userId}, ${f.admin.userId}
    ) returning id
  `

  const [activeHolding] = await sql<{ id: string }[]>`
    insert into public.ownership_holdings (
      offering_id, investor_id, units, ownership_bps, acquisition_at,
      transfer_eligible_at, status, acquisition_reference, created_by, updated_by
    ) values (
      ${offering.id}, ${f.investorA.investorId}, 2, 160, now() - interval '2 months',
      now() - interval '1 month', 'active', 'OP-ACTIVE', ${f.admin.userId}, ${f.admin.userId}
    ) returning id
  `
  const [inactiveHolding] = await sql<{ id: string }[]>`
    insert into public.ownership_holdings (
      offering_id, investor_id, units, ownership_bps, acquisition_at,
      transfer_eligible_at, status, acquisition_reference, created_by, updated_by
    ) values (
      ${offering.id}, ${f.investorInactive.investorId}, 1, 80, now() - interval '2 months',
      now() - interval '1 month', 'active', 'OP-INACTIVE', ${f.admin.userId}, ${f.admin.userId}
    ) returning id
  `

  const [activeTransfer] = await sql<{ id: string }[]>`
    insert into public.ownership_transfers (
      holding_id, from_investor_id, units, requested_at, eligible_at, status,
      notes, transfer_kind, requested_unit_price
    ) values (
      ${activeHolding.id}, ${f.investorA.investorId}, 1, now(), now() - interval '1 month',
      'pending', 'Active transfer', 'sale', 100000000
    ) returning id
  `
  const [inactiveTransfer] = await sql<{ id: string }[]>`
    insert into public.ownership_transfers (
      holding_id, from_investor_id, units, requested_at, eligible_at, status,
      notes, transfer_kind, requested_unit_price
    ) values (
      ${inactiveHolding.id}, ${f.investorInactive.investorId}, 1, now(), now() - interval '1 month',
      'pending', 'Inactive transfer', 'sale', 100000000
    ) returning id
  `

  return {
    activeThreadId: activeThread.id,
    activeMessageId: activeMessage.id,
    activeNotificationId: activeNotification.id,
    activeStorageObjectId: activeStorage.id,
    activeTransferId: activeTransfer.id,
    inactiveThreadId: inactiveThread.id,
    inactiveMessageId: inactiveMessage.id,
    inactiveNotificationId: inactiveNotification.id,
    inactiveStorageObjectId: inactiveStorage.id,
    inactiveTransferId: inactiveTransfer.id,
    inactiveHoldingId: inactiveHolding.id,
  }
}

beforeAll(async () => {
  fixtures = await createRlsFixtures()
  content = await createOperationalContent(db(), fixtures)
})

afterAll(async () => {
  if (content) {
    const sql = db()
    await sql`delete from public.ownership_transfers where id in (${content.activeTransferId}, ${content.inactiveTransferId})`
    await sql`delete from public.ownership_holdings where id = ${content.inactiveHoldingId} or acquisition_reference = 'OP-ACTIVE'`
    await sql`delete from public.ownership_offerings where name = 'Operational Gate Offering'`
    await sql`delete from public.notifications where id in (${content.activeNotificationId}, ${content.inactiveNotificationId})`
    await sql`delete from storage.objects where id in (${content.activeStorageObjectId}, ${content.inactiveStorageObjectId})`
    await sql`delete from public.message_threads where id in (${content.activeThreadId}, ${content.inactiveThreadId})`
  }
  if (fixtures) await destroyFixtures(fixtures)
  await closeDb()
})

describe('investor operational lifecycle gates', () => {
  it('keeps operational data available to an active investor', async () => {
    if (!fixtures || !content) throw new Error('Operational gate fixtures were not initialized.')
    const f = fixtures
    const c = content
    const principal = { kind: 'authenticated' as const, userId: f.investorA.userId }

    expect(await as(principal, (tx) => tx`select id from public.message_threads where id = ${c.activeThreadId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from public.messages where id = ${c.activeMessageId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select user_id from public.thread_participants where thread_id = ${c.activeThreadId} and user_id = ${f.investorA.userId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select message_id from public.message_reads where message_id = ${c.activeMessageId} and user_id = ${f.investorA.userId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from public.notifications where id = ${c.activeNotificationId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from storage.objects where id = ${c.activeStorageObjectId}`)).toHaveLength(1)

    const sales = await as(principal, (tx) => tx`select id from app.list_my_ownership_sales()`)
    expect(sales.map((row) => row['id'])).toContain(c.activeTransferId)
  })

  it('keeps only historical communication readable to an inactive former investor', async () => {
    if (!fixtures || !content) throw new Error('Operational gate fixtures were not initialized.')
    const f = fixtures
    const c = content
    const principal = { kind: 'authenticated' as const, userId: f.investorInactive.userId }

    // Full-exit mode intentionally preserves old communication history.
    expect(await as(principal, (tx) => tx`select id from public.message_threads where id = ${c.inactiveThreadId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from public.messages where id = ${c.inactiveMessageId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select user_id from public.thread_participants where thread_id = ${c.inactiveThreadId} and user_id = ${f.investorInactive.userId}`)).toHaveLength(1)

    // Operational/mutable data remains revoked after exit.
    expect(await as(principal, (tx) => tx`select message_id from public.message_reads where message_id = ${c.inactiveMessageId} and user_id = ${f.investorInactive.userId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from public.notifications where id = ${c.inactiveNotificationId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from storage.objects where id = ${c.inactiveStorageObjectId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from app.list_my_ownership_sales()`)).toHaveLength(0)
  })

  it('prevents an inactive investor from creating or cancelling a share sale', async () => {
    if (!fixtures || !content) throw new Error('Operational gate fixtures were not initialized.')
    const f = fixtures
    const c = content
    const principal = { kind: 'authenticated' as const, userId: f.investorInactive.userId }

    const createError = await expectRejected(() =>
      as(principal, (tx) =>
        tx`select app.create_ownership_sale_request(${c.inactiveHoldingId}, 1, 100000000, 'should fail')`,
      ),
    )
    expect(createError.code).toBe('42501')

    const cancelError = await expectRejected(() =>
      as(principal, (tx) => tx`select app.cancel_ownership_sale_request(${c.inactiveTransferId})`),
    )
    expect(cancelError.code).toBe('42501')
  })
})
