// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Sql } from 'postgres'

import { as, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

type OperationalContent = {
  activeThreadId: string
  activeMessageId: string
  activeNotificationId: string
  activeReadId: string
  activeStorageObjectId: string
  inactiveThreadId: string
  inactiveMessageId: string
  inactiveNotificationId: string
  inactiveReadId: string
  inactiveStorageObjectId: string
  offeringId: string
  activeHoldingId: string
  inactiveHoldingId: string
  activeTransferId: string
  inactiveTransferId: string
}

let fixtures: Fixtures
let content: OperationalContent

async function createOperationalContent(sql: Sql, f: Fixtures): Promise<OperationalContent> {
  const owner = f.internalAdmin.userId

  async function createForInvestor(userId: string, label: string) {
    const [thread] = await sql<{ id: string }[]>`
      insert into public.message_threads (subject, thread_kind, investor_id, created_by)
      values (${`Operational gate ${label} ${f.suffix}`}, 'investor_admin', ${userId}, ${owner})
      returning id
    `
    if (!thread) throw new Error(`Failed to create ${label} thread.`)

    await sql`
      insert into public.thread_participants (thread_id, user_id, role) values
        (${thread.id}, ${userId}, 'investor'),
        (${thread.id}, ${owner}, 'admin')
    `

    const [message] = await sql<{ id: string }[]>`
      insert into public.messages (thread_id, sender_id, body_text)
      values (${thread.id}, ${owner}, ${`Operational message ${label} ${f.suffix}`})
      returning id
    `
    if (!message) throw new Error(`Failed to create ${label} message.`)

    const [read] = await sql<{ id: string }[]>`
      insert into public.message_reads (message_id, user_id)
      values (${message.id}, ${userId})
      returning id
    `
    if (!read) throw new Error(`Failed to create ${label} read receipt.`)

    const [notification] = await sql<{ id: string }[]>`
      insert into public.notifications (recipient_id, kind, title, body)
      values (
        ${userId},
        'message_received',
        ${`Operational notification ${label} ${f.suffix}`},
        ${`Sensitive notification body ${label} ${f.suffix}`}
      )
      returning id
    `
    if (!notification) throw new Error(`Failed to create ${label} notification.`)

    const [object] = await sql<{ id: string }[]>`
      insert into storage.objects (bucket_id, name)
      values (
        'profit-distribution-proofs',
        ${`${userId}/operational-gate-${label}-${f.suffix}.pdf`}
      )
      returning id
    `
    if (!object) throw new Error(`Failed to create ${label} storage object.`)

    return {
      threadId: thread.id,
      messageId: message.id,
      notificationId: notification.id,
      readId: read.id,
      storageObjectId: object.id,
    }
  }

  const active = await createForInvestor(f.investorA.userId, 'active')
  const inactive = await createForInvestor(f.investorInactive.userId, 'inactive')

  const [offering] = await sql<{ id: string }[]>`
    insert into public.ownership_offerings (
      name, code, status, total_offered_bps, unit_ownership_bps, unit_price,
      total_units, distribution_cadence_months, transfer_lock_months
    ) values (
      ${`Operational Gate Offering ${f.suffix}`},
      ${`operational-gate-${f.suffix}`},
      'open', 200, 100, 100000000, 2, 6, 0
    )
    returning id
  `
  if (!offering) throw new Error('Failed to create ownership offering.')
  const offeringId = offering.id

  async function createSaleFixture(userId: string, label: string) {
    const [holding] = await sql<{ id: string }[]>`
      insert into public.ownership_holdings (
        offering_id, investor_id, units, ownership_bps, transfer_eligible_at,
        status, acquisition_reference
      ) values (
        ${offeringId}, ${userId}, 1, 100,
        ${new Date(Date.now() - 60_000).toISOString()},
        'active', ${`OP-GATE-${label}-${f.suffix}`}
      )
      returning id
    `
    if (!holding) throw new Error(`Failed to create ${label} holding.`)

    const [transfer] = await sql<{ id: string }[]>`
      insert into public.ownership_transfers (
        holding_id, from_investor_id, units, eligible_at, status,
        transfer_kind, requested_unit_price, notes
      ) values (
        ${holding.id}, ${userId}, 1,
        ${new Date(Date.now() - 60_000).toISOString()},
        'pending', 'sale', 100000000,
        ${`Operational sale ${label} ${f.suffix}`}
      )
      returning id
    `
    if (!transfer) throw new Error(`Failed to create ${label} transfer.`)

    return { holdingId: holding.id, transferId: transfer.id }
  }

  const activeSale = await createSaleFixture(f.investorA.userId, 'active')
  const inactiveSale = await createSaleFixture(f.investorInactive.userId, 'inactive')

  return {
    activeThreadId: active.threadId,
    activeMessageId: active.messageId,
    activeNotificationId: active.notificationId,
    activeReadId: active.readId,
    activeStorageObjectId: active.storageObjectId,
    inactiveThreadId: inactive.threadId,
    inactiveMessageId: inactive.messageId,
    inactiveNotificationId: inactive.notificationId,
    inactiveReadId: inactive.readId,
    inactiveStorageObjectId: inactive.storageObjectId,
    offeringId,
    activeHoldingId: activeSale.holdingId,
    inactiveHoldingId: inactiveSale.holdingId,
    activeTransferId: activeSale.transferId,
    inactiveTransferId: inactiveSale.transferId,
  }
}

beforeAll(async () => {
  fixtures = await createFixtures()
  content = await createOperationalContent(db(), fixtures)
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from storage.objects where id in (${content.activeStorageObjectId}, ${content.inactiveStorageObjectId})`
    await tx`delete from public.notifications where id in (${content.activeNotificationId}, ${content.inactiveNotificationId})`
    await tx`delete from public.message_threads where id in (${content.activeThreadId}, ${content.inactiveThreadId})`
    await tx`delete from public.ownership_transfers where id in (${content.activeTransferId}, ${content.inactiveTransferId})`
    await tx`delete from public.ownership_holdings where id in (${content.activeHoldingId}, ${content.inactiveHoldingId})`
    await tx`delete from public.ownership_offerings where id = ${content.offeringId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('investor operational lifecycle gates', () => {
  it('keeps operational data available to an active investor', async () => {
    const principal = { kind: 'authenticated' as const, userId: fixtures.investorA.userId }

    expect(await as(principal, (tx) => tx`select id from public.message_threads where id = ${content.activeThreadId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from public.messages where id = ${content.activeMessageId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select user_id from public.thread_participants where thread_id = ${content.activeThreadId} and user_id = ${fixtures.investorA.userId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from public.message_reads where id = ${content.activeReadId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from public.notifications where id = ${content.activeNotificationId}`)).toHaveLength(1)
    expect(await as(principal, (tx) => tx`select id from storage.objects where id = ${content.activeStorageObjectId}`)).toHaveLength(1)

    const sales = await as(principal, (tx) => tx`select id from app.list_my_ownership_sales()`)
    expect(sales.map((row) => row['id'])).toContain(content.activeTransferId)
  })

  it('revokes all operational data from an inactive investor', async () => {
    const principal = { kind: 'authenticated' as const, userId: fixtures.investorInactive.userId }

    expect(await as(principal, (tx) => tx`select id from public.message_threads where id = ${content.inactiveThreadId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from public.messages where id = ${content.inactiveMessageId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select user_id from public.thread_participants where thread_id = ${content.inactiveThreadId} and user_id = ${fixtures.investorInactive.userId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from public.message_reads where id = ${content.inactiveReadId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from public.notifications where id = ${content.inactiveNotificationId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from storage.objects where id = ${content.inactiveStorageObjectId}`)).toHaveLength(0)
    expect(await as(principal, (tx) => tx`select id from app.list_my_ownership_sales()`)).toHaveLength(0)
  })

  it('prevents an inactive investor from creating or cancelling a share sale', async () => {
    const principal = { kind: 'authenticated' as const, userId: fixtures.investorInactive.userId }

    const createError = await expectRejected(() =>
      as(principal, (tx) =>
        tx`select app.create_ownership_sale_request(${content.inactiveHoldingId}, 1, 100000000, 'should fail')`,
      ),
    )
    expect(createError.code).toBe('42501')

    const cancelError = await expectRejected(() =>
      as(principal, (tx) => tx`select app.cancel_ownership_sale_request(${content.inactiveTransferId})`),
    )
    expect(cancelError.code).toBe('42501')
  })
})