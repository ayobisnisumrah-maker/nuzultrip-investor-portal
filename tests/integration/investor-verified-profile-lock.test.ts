// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, asCommitted, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures

beforeAll(async () => {
  fixtures = await createFixtures()
})

afterAll(async () => {
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('verified investor profile lock and training isolation', () => {
  it('blocks legal identity changes after verification even for privileged SQL', async () => {
    const [before] = await db()<{ legal_name: string }[]>`
      select legal_name from public.investors where id=${fixtures.investorA.userId}
    `

    const rejected = await expectRejected(
      () => db()`
        update public.investors
        set legal_name='Nama Pengganti Tidak Sah'
        where id=${fixtures.investorA.userId}
      `,
    )

    expect(rejected.code).toBe('42501')
    const [after] = await db()<{ legal_name: string }[]>`
      select legal_name from public.investors where id=${fixtures.investorA.userId}
    `
    expect(after?.legal_name).toBe(before?.legal_name)
  })

  it('blocks direct mutable profile edits for verified investors', async () => {
    const rejected = await expectRejected(
      () => db()`
        update public.investors
        set whatsapp_number='+628111111111'
        where id=${fixtures.investorA.userId}
      `,
    )
    expect(rejected.code).toBe('42501')
  })

  it('does not freeze profile completion before the investor is verified', async () => {
    const [before] = await db()<{
      legal_name: string
      whatsapp_number: string | null
    }[]>`
      select legal_name, whatsapp_number
      from public.investors
      where id=${fixtures.investorPending.userId}
    `

    try {
      await db()`
        update public.investors
        set legal_name='Investor Menunggu Diperbaiki', whatsapp_number='+628122222222'
        where id=${fixtures.investorPending.userId}
      `
      const [row] = await db()<{
        legal_name: string
        whatsapp_number: string | null
      }[]>`
        select legal_name, whatsapp_number
        from public.investors
        where id=${fixtures.investorPending.userId}
      `
      expect(row).toMatchObject({
        legal_name: 'Investor Menunggu Diperbaiki',
        whatsapp_number: '+628122222222',
      })
    } finally {
      await db()`
        update public.investors
        set legal_name=${before!.legal_name}, whatsapp_number=${before!.whatsapp_number}
        where id=${fixtures.investorPending.userId}
      `
    }
  })

  it('rejects legal name or identity fields from the change-request payload', async () => {
    await as({ kind: 'authenticated', userId: fixtures.investorA.userId }, async (tx) => {
      const legalName = await expectRejected(
        () => tx`
          select app.request_investor_profile_change(
            ${tx.json({ legal_name: 'Nama Baru' })},
            'Mencoba mengganti nama legal'
          )
        `,
      )
      expect(legalName.code).toBe('22023')
    })

    await as({ kind: 'authenticated', userId: fixtures.investorA.userId }, async (tx) => {
      const identity = await expectRejected(
        () => tx`
          select app.request_investor_profile_change(
            ${tx.json({ identity_number_hash: 'x' })},
            'Mencoba mengganti identitas'
          )
        `,
      )
      expect(identity.code).toBe('22023')
    })
  })

  it('applies an approved bank/contact request while preserving legal identity', async () => {
    const requestId = await asCommitted(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      async (tx) => {
        const [request] = await tx<{ id: string }[]>`
          select app.request_investor_profile_change(
            ${tx.json({
              whatsapp_number: '+628133333333',
              bank_name: 'Bank Uji',
              bank_account_name: 'Investor A Uji',
              bank_account_number: '1234567890',
            })},
            'Pengujian perubahan rekening dan kontak'
          ) as id
        `
        if (!request) throw new Error('Profile change request fixture was not created.')
        return request.id
      },
    )

    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      await tx`
        select app.review_investor_profile_change_request(
          ${requestId}, 'approved', 'Data pendukung sesuai.'
        )
      `
      await tx`
        select app.apply_investor_profile_change_request(${requestId}, false)
      `
      const [investor] = await tx<{
        legal_name: string
        whatsapp_number: string | null
        bank_name: string | null
        bank_account_number: string | null
      }[]>`
        select legal_name, whatsapp_number, bank_name, bank_account_number
        from public.investors where id=${fixtures.investorA.userId}
      `
      expect(investor?.legal_name).toBe('Investor A Uji')
      expect(investor?.whatsapp_number).toBe('+628133333333')
      expect(investor?.bank_name).toBe('Bank Uji')
      expect(investor?.bank_account_number).toBe('1234567890')
    })
  })

  it('prevents training accounts from entering the canonical cap table', async () => {
    await db()`update public.investors set is_training=true where id=${fixtures.investorB.userId}`

    const offeringCode = `TRAIN${fixtures.suffix.toUpperCase()}`
    const [offering] = await db()<{ id: string }[]>`
      insert into public.ownership_offerings (
        name, code, status, total_offered_bps, unit_ownership_bps,
        unit_price, total_units, created_by, updated_by
      ) values (
        ${`Training isolation ${fixtures.suffix}`},
        ${offeringCode},
        'draft', 4000, 80, 100000000, 50,
        ${fixtures.superAdmin.userId}, ${fixtures.superAdmin.userId}
      ) returning id
    `
    if (!offering) throw new Error('Offering fixture was not created.')

    try {
      const rejected = await expectRejected(
        () => db()`
          insert into public.ownership_holdings (
            offering_id, investor_id, units, ownership_bps, acquisition_at,
            transfer_eligible_at, status, acquisition_reference, created_by, updated_by
          ) values (
            ${offering.id}, ${fixtures.investorB.userId}, 1, 80, now(), now(),
            'active', ${`TRAINHOLD${fixtures.suffix.toUpperCase()}`},
            ${fixtures.superAdmin.userId}, ${fixtures.superAdmin.userId}
          )
        `,
      )
      expect(rejected.code).toBe('42501')
    } finally {
      await db()`delete from public.ownership_offerings where id=${offering.id}`
      await db()`update public.investors set is_training=false where id=${fixtures.investorB.userId}`
    }
  })
})
