// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { as, closeDb } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures

beforeAll(async () => {
  fixtures = await createFixtures()
})

afterAll(async () => {
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('finance invoice brand snapshot', () => {
  it('does not replace the company/logo snapshot when a draft invoice is issued', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [invoice] = await tx<{ id: string }[]>`
        select app.create_finance_invoice(
          'Pelanggan Brand Snapshot',
          '',
          '',
          '',
          current_date + 7,
          '',
          ${tx.json([
            {
              product_id: null,
              product_code: 'BRAND-SNAPSHOT',
              name: 'Paket Brand Snapshot',
              description: '',
              quantity: 1,
              unit_label: 'pax',
              unit_price: 100000,
              discount_amount: 0,
              tax_rate: 0,
              position: 0,
            },
          ])}
        ) as id
      `

      if (!invoice) throw new Error('Invoice was not created.')

      const expectedSnapshot = {
        legalName: 'PT Snapshot Stabil',
        address: 'Alamat snapshot tetap',
        footer: 'Kontak snapshot tetap',
        logoAssetId: '11111111-1111-4111-8111-111111111111',
        stampAssetId: '22222222-2222-4222-8222-222222222222',
        signatureAssetId: '33333333-3333-4333-8333-333333333333',
      }

      await tx`
        update public.finance_invoices
        set company_snapshot = ${tx.json(expectedSnapshot)}
        where id = ${invoice.id}
      `

      await tx`select app.issue_finance_invoice(${invoice.id})`

      const [actual] = await tx<{ status: string; company_snapshot: unknown }[]>`
        select status, company_snapshot
        from public.finance_invoices
        where id = ${invoice.id}
      `

      expect(actual?.status).toBe('issued')
      expect(actual?.company_snapshot).toEqual(expectedSnapshot)
    })
  })
})
