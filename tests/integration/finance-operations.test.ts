// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { as, closeDb, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
beforeAll(async () => {
  fixtures = await createFixtures()
})
afterAll(async () => {
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('finance operations lifecycle', () => {
  it('calculates pax sales, payment, and refund atomically', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [invoice] = await tx<{ id: string }[]>`
        select app.create_finance_invoice(
          'Pelanggan Uji', 'qa@nuzultrip.invalid', '', '', current_date + 7, '',
          ${tx.json([{ product_id: null, product_code: 'QA-PAX', name: 'Paket Uji', description: '', quantity: 2, unit_label: 'pax', unit_price: 100000, discount_amount: 10000, tax_rate: 0, position: 0 }])}
        ) as id
      `
      if (!invoice) throw new Error('Invoice was not created.')
      await tx`select app.issue_finance_invoice(${invoice.id})`
      const [payment] = await tx<{ id: string }[]>`
        select app.record_finance_payment(${invoice.id}, 190000, 'transfer', now(), 'QA', '', ${`QA-${fixtures.suffix}`}) as id
      `
      const [refund] = await tx<{ id: string }[]>`
        select app.process_finance_refund(${invoice.id}, ${payment!.id}, 50000, 'Uji refund', '') as id
      `
      const [actual] = await tx<
        {
          status: string
          subtotal: string
          discount_total: string
          grand_total: string
          paid_total: string
          refunded_total: string
        }[]
      >`
        select status, subtotal, discount_total, grand_total, paid_total, refunded_total
        from public.finance_invoices where id=${invoice.id}
      `
      expect(payment?.id).toBeTruthy()
      expect(refund?.id).toBeTruthy()
      expect(actual).toMatchObject({
        status: 'partially_paid',
        subtotal: '200000.00',
        discount_total: '10000.00',
        grand_total: '190000.00',
        paid_total: '190000.00',
        refunded_total: '50000.00',
      })
    })
  })

  it('rejects overpayment and mutation of issued invoice items', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [invoice] = await tx<
        { id: string }[]
      >`select app.create_finance_invoice('Pelanggan Uji','','','',null,'',${tx.json([{ product_id: null, product_code: 'QA', name: 'Paket Uji', description: '', quantity: 1, unit_label: 'pax', unit_price: 50000, discount_amount: 0, tax_rate: 0, position: 0 }])}) as id`
      await tx`select app.issue_finance_invoice(${invoice!.id})`
      const overpayment = await expectRejected(
        () =>
          tx`select app.record_finance_payment(
            ${invoice!.id}::uuid,
            50001::numeric,
            'transfer'::text,
            now(),
            ''::text,
            ''::text,
            ${`QA-OVER-${fixtures.suffix}`}::text
          )`,
      )
      const mutation = await expectRejected(
        () =>
          tx`update public.finance_invoice_items set quantity=2 where invoice_id=${invoice!.id}`,
      )
      expect(overpayment.code).toBe('23514')
      expect(mutation.code).toBe('42501')
    })
  })
})
