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

describe('finance refund trigger boundary', () => {
  it('allows authenticated refund writes while keeping invoice totals limited to processed refunds', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [invoice] = await tx<{ id: string }[]>`
        select app.create_finance_invoice(
          'Refund Trigger QA', '', '', '', current_date + 7, '',
          ${tx.json([
            {
              product_id: null,
              product_code: `RFD-TRG-${fixtures.suffix}`,
              name: 'Paket Refund Trigger',
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

      await tx`select app.issue_finance_invoice(${invoice.id})`
      const [payment] = await tx<{ id: string }[]>`
        select app.record_finance_payment(
          ${invoice.id}, 100000, 'transfer', now(), 'QA', '', ${`RFD-TRG-PAY-${fixtures.suffix}`}
        ) as id
      `
      if (!payment) throw new Error('Payment was not created.')

      const [refund] = await tx<{ id: string }[]>`
        insert into public.finance_refunds (
          invoice_id, payment_id, reference, status, amount, reason, requested_by
        ) values (
          ${invoice.id}, ${payment.id}, ${`RFD-TRG-${fixtures.suffix}`}, 'requested', 25000,
          'Regression test direct authenticated insert', ${fixtures.superAdmin.userId}
        )
        returning id
      `
      if (!refund) throw new Error('Refund request was not created.')

      const [requestedState] = await tx<{ refunded_total: string; status: string }[]>`
        select refunded_total, status
        from public.finance_invoices
        where id = ${invoice.id}
      `

      // A requested refund must not reduce recognized paid balance yet, but the
      // insert itself must succeed through the internal SECURITY DEFINER trigger.
      expect(requestedState?.refunded_total).toBe('0.00')
      expect(requestedState?.status).toBe('paid')

      await tx`
        update public.finance_refunds
        set status = 'processed',
            approved_by = ${fixtures.superAdmin.userId},
            processed_by = ${fixtures.superAdmin.userId},
            approved_at = now(),
            processed_at = now()
        where id = ${refund.id}
      `

      const [processedState] = await tx<{ refunded_total: string; status: string }[]>`
        select refunded_total, status
        from public.finance_invoices
        where id = ${invoice.id}
      `

      expect(processedState?.refunded_total).toBe('25000.00')
      expect(processedState?.status).toBe('partially_paid')
    })
  })
})
