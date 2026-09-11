// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  as,
  asCommitted,
  cleanup,
  closeDb,
  db,
  expectRejected,
} from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures

async function createPaymentProof(filename: string) {
  const [proof] = await db()<[{ id: string }]>`
    insert into public.media_assets(
      bucket,path,original_filename,mime_type,byte_size,visibility,finalized_at
    ) values (
      'financial-documents',
      ${`tests/${fixtures.suffix}/${filename}`},
      ${filename},
      'application/pdf',
      1,
      'restricted',
      now()
    ) returning id
  `
  if (!proof) throw new Error('Bukti pembayaran uji gagal dibuat.')
  return proof.id
}

beforeAll(async () => {
  fixtures = await createFixtures()
})
afterAll(async () => {
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('finance operations lifecycle', () => {
  it('calculates pax sales, reconciled payment, and refund atomically', async () => {
    const proofAssetId = await createPaymentProof('payment-proof-1.pdf')
    try {
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
        if (!payment) throw new Error('Payment was not created.')

        await tx`
          select app.reconcile_finance_payment(
            ${payment.id}, ${proofAssetId}, 'BANK-QA', 190000, now(), 'Rekonsiliasi uji'
          )
        `

        const [refund] = await tx<{ id: string }[]>`
          select app.process_finance_refund(${invoice.id}, ${payment.id}, 50000, 'Uji refund', '') as id
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
    } finally {
      await cleanup(async (tx) => {
        await tx`delete from public.media_assets where id=${proofAssetId}`
      })
    }
  })

  it('requires bank reconciliation before a payment becomes confirmed', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [invoice] = await tx<{ id: string }[]>`
        select app.create_finance_invoice(
          'Pelanggan Rekonsiliasi','','','',current_date + 7,'',
          ${tx.json([{ product_id: null, product_code: 'QA-RECON', name: 'Paket Rekonsiliasi', description: '', quantity: 1, unit_label: 'pax', unit_price: 75000, discount_amount: 0, tax_rate: 0, position: 0 }])}
        ) as id
      `
      if (!invoice) throw new Error('Invoice rekonsiliasi tidak dibuat.')
      await tx`select app.issue_finance_invoice(${invoice.id})`

      const [created] = await tx<{ id: string }[]>`
        select app.record_finance_payment(
          ${invoice.id},75000,'transfer',now(),'QA-PENDING','',${`QA-RECON-${fixtures.suffix}`}
        ) as id
      `
      if (!created) throw new Error('Pembayaran rekonsiliasi tidak dibuat.')
      const [payment] = await tx<{ status: string }[]>`
        select status::text from public.finance_payments where id=${created.id}
      `
      expect(payment?.status).toBe('pending')

      await tx`savepoint direct_confirmation_assertion`
      const directConfirmation = await expectRejected(
        () => tx`update public.finance_payments set status='confirmed' where id=${created.id}`,
      )
      await tx`rollback to savepoint direct_confirmation_assertion`
      await tx`release savepoint direct_confirmation_assertion`
      expect(directConfirmation.code).toBe('42501')
    })
  })

  it('rejects overpayment and mutation of issued invoice items', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [invoice] = await tx<
        { id: string }[]
      >`select app.create_finance_invoice('Pelanggan Uji','','','',null,'',${tx.json([{ product_id: null, product_code: 'QA', name: 'Paket Uji', description: '', quantity: 1, unit_label: 'pax', unit_price: 50000, discount_amount: 0, tax_rate: 0, position: 0 }])}) as id`
      await tx`select app.issue_finance_invoice(${invoice!.id})`
      await tx`savepoint overpayment_assertion`
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
      await tx`rollback to savepoint overpayment_assertion`
      await tx`release savepoint overpayment_assertion`
      await tx`savepoint mutation_assertion`
      const mutation = await expectRejected(
        () =>
          tx`update public.finance_invoice_items set quantity=2 where invoice_id=${invoice!.id}`,
      )
      await tx`rollback to savepoint mutation_assertion`
      await tx`release savepoint mutation_assertion`
      expect(overpayment.code).toBe('23514')
      expect(mutation.code).toBe('42501')
    })
  })

  it('exposes only monthly aggregate cashflow to an active investor', async () => {
    await as({ kind: 'authenticated', userId: fixtures.investorA.userId }, async (tx) => {
      const rows = await tx<
        {
          month_start: string
          cash_in: string
          cash_out: string
          net_cashflow: string
          pax: string
        }[]
      >`select * from app.investor_monthly_cashflow_summary(6)`

      expect(rows).toHaveLength(6)
      expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
        ['cash_in', 'cash_out', 'month_start', 'net_cashflow', 'pax'].sort(),
      )
      expect(rows.every((row) => Number(row.cash_in) >= 0)).toBe(true)
      expect(rows.every((row) => Number(row.cash_out) >= 0)).toBe(true)
      expect(rows.every((row) => Number(row.pax) >= 0)).toBe(true)
    })
  })

  it('synchronizes committed cashier transactions into the investor monthly summary', async () => {
    const baseline = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      async (tx) => {
        const [row] = await tx<
          { cash_in: string; cash_out: string; net_cashflow: string; pax: string }[]
        >`select cash_in, cash_out, net_cashflow, pax from app.investor_monthly_cashflow_summary(1)`
        return row!
      },
    )

    let invoiceId = ''
    let paymentId = ''
    const proofAssetId = await createPaymentProof('payment-proof-realtime.pdf')
    let expenseId = ''

    try {
      await asCommitted(
        { kind: 'authenticated', userId: fixtures.superAdmin.userId },
        async (tx) => {
          const [invoice] = await tx<{ id: string }[]>`
            select app.create_finance_invoice(
              ${`Realtime ${fixtures.suffix}`}, '', '', '', current_date + 7, '',
              ${tx.json([{ product_id: null, product_code: `RT-${fixtures.suffix}`, name: 'Paket Realtime', description: '', quantity: 3, unit_label: 'pax', unit_price: 100000, discount_amount: 0, tax_rate: 0, position: 0 }])}
            ) as id
          `
          if (!invoice) throw new Error('Realtime invoice was not created.')
          invoiceId = invoice.id
          await tx`select app.issue_finance_invoice(${invoice.id})`
          const [payment] = await tx<{ id: string }[]>`
            select app.record_finance_payment(${invoice.id}, 300000, 'transfer', now(), 'SYNC', '', ${`RT-PAY-${fixtures.suffix}`}) as id
          `
          if (!payment) throw new Error('Realtime payment was not created.')
          paymentId = payment.id

          await tx`
            select app.reconcile_finance_payment(
              ${payment.id}, ${proofAssetId}, 'BANK-SYNC', 300000, now(), 'Sinkronisasi uji'
            )
          `
          await tx`select app.process_finance_refund(${invoice.id}, ${payment.id}, 50000, 'Sinkronisasi uji', '')`

          const [expense] = await tx<{ id: string }[]>`
            insert into public.finance_expenses (
              reference, status, expense_on, category, description, quantity, unit_price,
              tax_amount, currency, recorded_by
            ) values (
              ${`RT-EXP-${fixtures.suffix}`}, 'recorded', current_date, 'operasional',
              'Pengeluaran sinkronisasi uji', 1, 25000, 0, 'IDR', ${fixtures.superAdmin.userId}
            ) returning id
          `
          if (!expense) throw new Error('Realtime expense was not created.')
          expenseId = expense.id
        },
      )

      const after = await as(
        { kind: 'authenticated', userId: fixtures.investorA.userId },
        async (tx) => {
          const [row] = await tx<
            { cash_in: string; cash_out: string; net_cashflow: string; pax: string }[]
          >`select cash_in, cash_out, net_cashflow, pax from app.investor_monthly_cashflow_summary(1)`
          return row!
        },
      )

      expect(Number(after.cash_in) - Number(baseline.cash_in)).toBe(300000)
      expect(Number(after.cash_out) - Number(baseline.cash_out)).toBe(75000)
      expect(Number(after.net_cashflow) - Number(baseline.net_cashflow)).toBe(225000)
      expect(Number(after.pax) - Number(baseline.pax)).toBe(3)
    } finally {
      await cleanup(async (tx) => {
        if (expenseId) await tx`delete from public.finance_expenses where id=${expenseId}`
        if (paymentId) {
          await tx`delete from public.finance_refunds where payment_id=${paymentId}`
          await tx`delete from public.finance_bank_reconciliations where payment_id=${paymentId}`
          await tx`delete from public.finance_payments where id=${paymentId}`
        }
        if (invoiceId) await tx`delete from public.finance_invoices where id=${invoiceId}`
        await tx`delete from public.media_assets where id=${proofAssetId}`
      })
    }
  })

  it('attaches realtime finance triggers without exposing trigger execution', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const rows = await tx<{ table_name: string }[]>`
        select c.relname as table_name
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where not t.tgisinternal
          and n.nspname = 'public'
          and t.tgname like 'finance%emit_transaction_events'
        order by c.relname
      `
      expect(rows.map((row) => row.table_name)).toEqual([
        'finance_expenses',
        'finance_invoice_items',
        'finance_invoices',
        'finance_payments',
        'finance_refunds',
      ])

      const [acl] = await tx<{ can_execute: boolean }[]>`
        select has_function_privilege('authenticated', 'app.emit_finance_transaction_events()'::regprocedure, 'EXECUTE') as can_execute
      `
      expect(acl?.can_execute).toBe(false)
    })
  })

  it('rejects cashflow summary access for pending investors', async () => {
    await as({ kind: 'authenticated', userId: fixtures.investorPending.userId }, async (tx) => {
      const rejection = await expectRejected(
        () => tx`select * from app.investor_monthly_cashflow_summary(6)`,
      )
      expect(rejection.message).toContain('Investor aktif diperlukan')
    })
  })

  it('does not grant anonymous callers access to investor cashflow', async () => {
    await as({ kind: 'anon' }, async (tx) => {
      const rejection = await expectRejected(
        () => tx`select * from app.investor_monthly_cashflow_summary(6)`,
      )
      expect(rejection.code).toBe('42501')
    })
  })
})
