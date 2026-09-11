import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  as,
  asCommitted,
  cleanup,
  closeDb,
  db,
  expectRejected,
} from './helpers/db'
import {
  createFixtures,
  destroyFixtures,
  type Fixtures,
} from './helpers/fixtures'

let fixtures: Fixtures
let offeringId: string
let holdingId: string
let requestId: string

beforeAll(async () => {
  fixtures = await createFixtures()

  const [offering] = await db()<[{ id: string }]>`
    insert into public.ownership_offerings (
      name,
      code,
      status,
      total_offered_bps,
      unit_ownership_bps,
      unit_price,
      total_units,
      transfer_lock_months,
      created_by,
      updated_by
    )
    values (
      'Penawaran Pewarisan Uji',
      ${`inheritance-${randomUUID().slice(0, 8)}`},
      'open',
      800,
      80,
      100000000,
      10,
      36,
      ${fixtures.superAdmin.userId},
      ${fixtures.superAdmin.userId}
    )
    returning id
  `
  if (!offering) throw new Error('Gagal membuat penawaran uji.')
  offeringId = offering.id

  const [holding] = await db()<[{ id: string }]>`
    insert into public.ownership_holdings (
      offering_id,
      investor_id,
      units,
      ownership_bps,
      acquisition_at,
      transfer_eligible_at,
      status,
      acquisition_reference,
      created_by,
      updated_by
    )
    values (
      ${offeringId},
      ${fixtures.investorA.userId},
      4,
      320,
      now() - interval '40 months',
      now() - interval '4 months',
      'active',
      ${`INH-TEST-${randomUUID().slice(0, 8)}`},
      ${fixtures.superAdmin.userId},
      ${fixtures.superAdmin.userId}
    )
    returning id
  `
  if (!holding) throw new Error('Gagal membuat holding uji.')
  holdingId = holding.id
})

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.ownership_inheritance where holding_id = ${holdingId}`
    await tx`delete from public.ownership_holdings where offering_id = ${offeringId}`
    await tx`delete from public.ownership_offerings where id = ${offeringId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('workflow pewarisan kepemilikan', () => {
  it('investor membuat pengajuan hanya dari holding miliknya', async () => {
    requestId = await asCommitted(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      async (tx) => {
        const [row] = await tx<{ id: string }[]>`
          select app.create_ownership_inheritance_request(
            ${holdingId},
            'Penerima Waris Uji',
            'pewaris@example.test',
            '081234567890',
            2,
            'Pengajuan integrasi'
          ) as id
        `
        if (!row) throw new Error('RPC tidak mengembalikan ID pengajuan.')
        return row.id
      },
    )

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/)

    const error = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      async (tx) =>
        expectRejected(() => tx`
          select app.create_ownership_inheritance_request(
            ${holdingId},
            'Tidak Berhak',
            null,
            null,
            1,
            null
          )
        `),
    )

    expect(error.code).toBe('42501')
  })

  it('RLS dan RPC mengisolasi pengajuan antar investor', async () => {
    const ownRows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx<{ id: string }[]>`
        select id from public.ownership_inheritance where id = ${requestId}
      `,
    )
    expect(ownRows).toHaveLength(1)

    const otherRows = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      (tx) => tx<{ id: string }[]>`
        select id from public.ownership_inheritance where id = ${requestId}
      `,
    )
    expect(otherRows).toHaveLength(0)

    const cancelError = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      async (tx) =>
        expectRejected(() => tx`
          select app.cancel_ownership_inheritance_request(${requestId})
        `),
    )
    expect(cancelError.code).toBe('42501')
  })

  it('admin tanpa permission tidak dapat meninjau atau menyetujui', async () => {
    const listError = await as(
      { kind: 'authenticated', userId: fixtures.viewerAdmin.userId },
      async (tx) =>
        expectRejected(() => tx`
          select * from app.list_admin_ownership_inheritance()
        `),
    )
    expect(listError.code).toBe('42501')

    const approveError = await as(
      { kind: 'authenticated', userId: fixtures.viewerAdmin.userId },
      async (tx) =>
        expectRejected(() => tx`
          select app.approve_ownership_inheritance(${requestId})
        `),
    )
    expect(approveError.code).toBe('42501')
  })

  it('admin berizin dapat menyetujui dan menyelesaikan ke cap table resmi', async () => {
    await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) => {
        await tx`select app.approve_ownership_inheritance(${requestId})`
        await tx`
          select app.complete_ownership_inheritance(
            ${requestId},
            ${fixtures.investorB.userId}
          )
        `
      },
    )

    const [request] = await db()<
      [{ status: string; beneficiary_investor_id: string; completed_at: string | null }]
    >`
      select status, beneficiary_investor_id, completed_at
      from public.ownership_inheritance
      where id = ${requestId}
    `
    expect(request?.status).toBe('completed')
    expect(request?.beneficiary_investor_id).toBe(fixtures.investorB.userId)
    expect(request?.completed_at).not.toBeNull()

    const [source] = await db()<[{ units: number; ownership_bps: number; status: string }]>`
      select units, ownership_bps, status
      from public.ownership_holdings
      where id = ${holdingId}
    `
    expect(Number(source?.units)).toBe(2)
    expect(Number(source?.ownership_bps)).toBe(160)
    expect(source?.status).toBe('active')

    const [beneficiary] = await db()<[{ units: number; ownership_bps: number; status: string }]>`
      select units, ownership_bps, status
      from public.ownership_holdings
      where offering_id = ${offeringId}
        and investor_id = ${fixtures.investorB.userId}
        and acquisition_reference like 'INH-%'
    `
    expect(Number(beneficiary?.units)).toBe(2)
    expect(Number(beneficiary?.ownership_bps)).toBe(160)
    expect(beneficiary?.status).toBe('active')
  })

  it('trigger realtime pewarisan terpasang pada tabel sumber', async () => {
    const [trigger] = await db()<[{ definition: string }]>`
      select pg_get_triggerdef(t.oid) as definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'ownership_inheritance'
        and t.tgname = 'ownership_inheritance_emit_events'
        and not t.tgisinternal
    `

    expect(trigger?.definition).toContain('app.emit_ownership_inheritance_events')
  })
})
