// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { as, cleanup, closeDb, db } from './helpers/db'
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
    const [proof] = await db()<[{ id: string }]>`
      insert into public.media_assets(
        bucket,path,original_filename,mime_type,byte_size,visibility,finalized_at
      ) values (
        'financial-documents',
        ${`tests/${fixtures.suffix}/refund-trigger-payment-proof.pdf`},
        'refund-trigger-payment-proof.pdf',
        'application/pdf',
        1,
        'restricted',
        now()
      ) returning id
    `
    if (!proof) throw new Error('Bukti pembayaran uji gagal dibuat.')

    try {
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
        if (!invoice) throw new Error('Invoice uji gagal dibuat.')

        await tx`select app.issue_finance_invoice(${invoice.id})`
        const [payment] = await tx<{ id: string }[]>`
          select app.record_finance_payment(
            ${invoice.id}, 100000, 'transfer', now(), 'QA', '', ${`RFD-TRG-PAY-${fixtures.suffix}`}
          ) as id
        `
        if (!payment) throw new Error('Pembayaran uji gagal dibuat.')

        const [pendingState] = await tx<{ status: string; paid_total: string }[]>`
          select status, paid_total from public.finance_invoices where id=${invoice.id}
        `
        expect(pendingState?.status).toBe('issued')
        expect(pendingState?.paid_total).toBe('0.00')

        await tx`
          select app.reconcile_finance_payment(
            ${payment.id}, ${proof.id}, ${`BANK-RFD-${fixtures.suffix}`}, 100000, now(),
            'Rekonsiliasi pembayaran sebelum pengujian refund'
          )
        `

        const [confirmedState] = await tx<{ status: string; paid_total: string }[]>`
          select status, paid_total from public.finance_invoices where id=${invoice.id}
        `
        expect(confirmedState?.status).toBe('paid')
        expect(confirmedState?.paid_total).toBe('100000.00')

        const [refund] = await tx<{ id: string }[]>`
          insert into public.finance_refunds (
            invoice_id, payment_id, reference, status, amount, reason, requested_by
          ) values (
            ${invoice.id}, ${payment.id}, ${`RFD-TRG-${fixtures.suffix}`}, 'requested', 25000,
            'Uji regresi insert refund oleh admin terautentikasi', ${fixtures.superAdmin.userId}
          )
          returning id
        `
        if (!refund) throw new Error('Pengajuan refund uji gagal dibuat.')

        const [requestedState] = await tx<{ refunded_total: string; status: string }[]>`
          select refunded_total, status
          from public.finance_invoices
          where id = ${invoice.id}
        `

        // Refund berstatus requested belum boleh mengurangi saldo pembayaran terkonfirmasi.
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
    } finally {
      await cleanup(async (tx) => {
        await tx`delete from public.media_assets where id=${proof.id}`
      })
    }
  })
})
