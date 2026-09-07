// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Sql } from 'postgres'

import { as, cleanup, closeDb, db } from './helpers/db'
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
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('investor operational lifecycle gates', () => {
  it('keeps operational data available to an active investor', async () => {
    const principal = { kind: 'authenticated' as const, userId: fixtures.investorA.userId }

    const threads = await as(principal, (tx) =>
      tx`select id from public.message_threads where id = ${content.activeThreadId}`,
    )
    expect(threads).toHaveLength(1)

    const messages = await as(principal, (tx) =>
      tx`select id from public.messages where id = ${content.activeMessageId}`,
    )
    expect(messages).toHaveLength(1)

    const participants = await as(principal, (tx) =>
      tx`select user_id from public.thread_participants where thread_id = ${content.activeThreadId} and user_id = ${fixtures.investorA.userId}`,
    )
    expect(participants).toHaveLength(1)

    const reads = await as(principal, (tx) =>
      tx`select id from public.message_reads where id = ${content.activeReadId}`,
    )
    expect(reads).toHaveLength(1)

    const notifications = await as(principal, (tx) =>
      tx`select id from public.notifications where id = ${content.activeNotificationId}`,
    )
    expect(notifications).toHaveLength(1)

    const objects = await as(principal, (tx) =>
      tx`select id from storage.objects where id = ${content.activeStorageObjectId}`,
    )
    expect(objects).toHaveLength(1)
  })

  it('revokes all operational data from an inactive investor', async () => {
    const principal = {
      kind: 'authenticated' as const,
      userId: fixtures.investorInactive.userId,
    }

    const threads = await as(principal, (tx) =>
      tx`select id from public.message_threads where id = ${content.inactiveThreadId}`,
    )
    expect(threads).toHaveLength(0)

    const messages = await as(principal, (tx) =>
      tx`select id from public.messages where id = ${content.inactiveMessageId}`,
    )
    expect(messages).toHaveLength(0)

    const participants = await as(principal, (tx) =>
      tx`select user_id from public.thread_participants where thread_id = ${content.inactiveThreadId} and user_id = ${fixtures.investorInactive.userId}`,
    )
    expect(participants).toHaveLength(0)

    const reads = await as(principal, (tx) =>
      tx`select id from public.message_reads where id = ${content.inactiveReadId}`,
    )
    expect(reads).toHaveLength(0)

    const notifications = await as(principal, (tx) =>
      tx`select id from public.notifications where id = ${content.inactiveNotificationId}`,
    )
    expect(notifications).toHaveLength(0)

    const objects = await as(principal, (tx) =>
      tx`select id from storage.objects where id = ${content.inactiveStorageObjectId}`,
    )
    expect(objects).toHaveLength(0)
  })
})
