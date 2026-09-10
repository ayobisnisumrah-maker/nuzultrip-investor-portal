import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

type FinancePaymentRow = {
  id: string
  invoice_id: string
  reference: string
  amount: number | string
  currency: string
  method: string | null
  received_at: string
}

type FinanceRefundRow = {
  id: string
  invoice_id: string
  reference: string
  amount: number | string
  reason: string | null
  processed_at: string | null
}

type FinanceExpenseRow = {
  id: string
  reference: string
  total_amount: number | string
  currency: string
  category: string
  vendor_name: string | null
  description: string
  expense_on: string
  payment_method: string | null
}

export type AdminCashflowActivity = {
  id: string
  occurredAt: string
  direction: 'in' | 'out'
  kind: 'payment' | 'refund' | 'expense'
  reference: string
  sourceReference: string | null
  counterparty: string | null
  detail: string
  amount: number
  currency: string
  pax: number | null
}

export type MonthlyCashflowSummary = {
  monthStart: string
  cashIn: number
  cashOut: number
  netCashflow: number
  pax: number
}

export type AdminCashflowDashboardData = {
  months: MonthlyCashflowSummary[]
  activity: AdminCashflowActivity[]
}

type InvestorMonthlyCashflowRpcRow = {
  month_start: string
  cash_in: number | string
  cash_out: number | string
  net_cashflow: number | string
  pax: number | string
}

type InvestorCashflowRpcClient = {
  rpc: (
    name: 'investor_monthly_cashflow_summary',
    args: { p_months: number },
  ) => PromiseLike<{
    data: InvestorMonthlyCashflowRpcRow[] | null
    error: { message: string } | null
  }>
}

const PAX_UNIT_LABELS = new Set(['pax', 'jamaah', 'orang', 'person'])

function monthKey(value: string) {
  return value.slice(0, 7)
}

function firstMonthIso(months: number) {
  const now = new Date()
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1))
  return first.toISOString().slice(0, 10)
}

function monthStartIso(value: string) {
  return `${monthKey(value)}-01`
}

function createMonthBuckets(months: number) {
  const now = new Date()
  const result: MonthlyCashflowSummary[] = []

  for (let offset = 0; offset < months; offset += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    result.push({
      monthStart: date.toISOString().slice(0, 10),
      cashIn: 0,
      cashOut: 0,
      netCashflow: 0,
      pax: 0,
    })
  }

  return result
}

export async function getAdminCashflowDashboardData(
  supabase: DbClient,
  months = 6,
): Promise<AdminCashflowDashboardData> {
  const boundedMonths = Math.max(1, Math.min(months, 12))
  const firstMonth = firstMonthIso(boundedMonths)

  const [paymentsResult, refundsResult, expensesResult, invoicesResult, itemsResult] =
    await Promise.all([
      supabase
        .from('finance_payments')
        .select('id,invoice_id,reference,amount,currency,method,received_at')
        .eq('status', 'confirmed')
        .gte('received_at', `${firstMonth}T00:00:00Z`),
      supabase
        .from('finance_refunds')
        .select('id,invoice_id,reference,amount,reason,processed_at')
        .eq('status', 'processed')
        .gte('processed_at', `${firstMonth}T00:00:00Z`),
      supabase
        .from('finance_expenses')
        .select(
          'id,reference,total_amount,currency,category,vendor_name,description,expense_on,payment_method',
        )
        .eq('status', 'recorded')
        .gte('expense_on', firstMonth),
      supabase
        .from('finance_invoices')
        .select('id,reference,customer_name,issued_on,status')
        .neq('status', 'void')
        .gte('issued_on', firstMonth),
      supabase
        .from('finance_invoice_items')
        .select('invoice_id,quantity,unit_label,finance_invoices!inner(issued_on,status)')
        .neq('finance_invoices.status', 'void')
        .gte('finance_invoices.issued_on', firstMonth),
    ])

  if (
    paymentsResult.error ||
    refundsResult.error ||
    expensesResult.error ||
    invoicesResult.error ||
    itemsResult.error
  ) {
    return { months: [], activity: [] }
  }

  const payments = (paymentsResult.data ?? []) as FinancePaymentRow[]
  const refunds = (refundsResult.data ?? []) as FinanceRefundRow[]
  const expenses = (expensesResult.data ?? []) as FinanceExpenseRow[]
  const invoices = invoicesResult.data ?? []
  const items = itemsResult.data ?? []

  const invoiceById = new Map(
    invoices.map((invoice) => [
      invoice.id,
      { reference: invoice.reference, customerName: invoice.customer_name },
    ]),
  )
  const paxByInvoice = new Map<string, number>()

  for (const item of items) {
    if (!PAX_UNIT_LABELS.has(item.unit_label.trim().toLowerCase())) continue
    paxByInvoice.set(
      item.invoice_id,
      (paxByInvoice.get(item.invoice_id) ?? 0) + Number(item.quantity),
    )
  }

  const buckets = createMonthBuckets(boundedMonths)
  const bucketByMonth = new Map(buckets.map((bucket) => [monthKey(bucket.monthStart), bucket]))

  for (const payment of payments) {
    const bucket = bucketByMonth.get(monthKey(payment.received_at))
    if (bucket) bucket.cashIn += Number(payment.amount)
  }

  for (const refund of refunds) {
    if (!refund.processed_at) continue
    const bucket = bucketByMonth.get(monthKey(refund.processed_at))
    if (bucket) bucket.cashOut += Number(refund.amount)
  }

  for (const expense of expenses) {
    const bucket = bucketByMonth.get(monthKey(expense.expense_on))
    if (bucket) bucket.cashOut += Number(expense.total_amount)
  }

  for (const item of items) {
    if (!PAX_UNIT_LABELS.has(item.unit_label.trim().toLowerCase())) continue
    const relation = Array.isArray(item.finance_invoices)
      ? item.finance_invoices[0]
      : item.finance_invoices
    if (!relation) continue
    const bucket = bucketByMonth.get(monthKey(relation.issued_on))
    if (bucket) bucket.pax += Number(item.quantity)
  }

  for (const bucket of buckets) {
    bucket.netCashflow = bucket.cashIn - bucket.cashOut
  }

  const activity: AdminCashflowActivity[] = [
    ...payments.map((payment) => {
      const invoice = invoiceById.get(payment.invoice_id)
      return {
        id: `payment:${payment.id}`,
        occurredAt: payment.received_at,
        direction: 'in' as const,
        kind: 'payment' as const,
        reference: payment.reference,
        sourceReference: invoice?.reference ?? null,
        counterparty: invoice?.customerName ?? null,
        detail: payment.method ? `Pembayaran · ${payment.method}` : 'Pembayaran diterima',
        amount: Number(payment.amount),
        currency: payment.currency,
        pax: paxByInvoice.get(payment.invoice_id) ?? null,
      }
    }),
    ...refunds
      .filter((refund) => refund.processed_at)
      .map((refund) => {
        const invoice = invoiceById.get(refund.invoice_id)
        return {
          id: `refund:${refund.id}`,
          occurredAt: refund.processed_at as string,
          direction: 'out' as const,
          kind: 'refund' as const,
          reference: refund.reference,
          sourceReference: invoice?.reference ?? null,
          counterparty: invoice?.customerName ?? null,
          detail: refund.reason ? `Refund · ${refund.reason}` : 'Refund diproses',
          amount: Number(refund.amount),
          currency: 'IDR',
          pax: paxByInvoice.get(refund.invoice_id) ?? null,
        }
      }),
    ...expenses.map((expense) => ({
      id: `expense:${expense.id}`,
      occurredAt: `${expense.expense_on}T00:00:00Z`,
      direction: 'out' as const,
      kind: 'expense' as const,
      reference: expense.reference,
      sourceReference: null,
      counterparty: expense.vendor_name,
      detail: `${expense.category} · ${expense.description}`,
      amount: Number(expense.total_amount),
      currency: expense.currency,
      pax: null,
    })),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 20)

  return { months: buckets, activity }
}

export async function getInvestorMonthlyCashflowSummary(
  supabase: DbClient,
  months = 6,
): Promise<MonthlyCashflowSummary[]> {
  const boundedMonths = Math.max(1, Math.min(months, 12))
  const appClient = supabase.schema('app') as unknown as InvestorCashflowRpcClient
  const { data, error } = await appClient.rpc('investor_monthly_cashflow_summary', {
    p_months: boundedMonths,
  })

  if (error || !data) return []

  return data.map((row) => ({
    monthStart: monthStartIso(row.month_start),
    cashIn: Number(row.cash_in),
    cashOut: Number(row.cash_out),
    netCashflow: Number(row.net_cashflow),
    pax: Number(row.pax),
  }))
}
