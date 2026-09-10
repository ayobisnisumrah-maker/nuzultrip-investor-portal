import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

const PAX_UNIT_LABELS = new Set(['pax', 'jamaah', 'orang', 'person'])

export type GeneratedFinancialLineItem = {
  statement: 'income' | 'balance' | 'cash_flow'
  category:
    | 'revenue'
    | 'expense'
    | 'asset'
    | 'liability'
    | 'equity'
    | 'operating'
    | 'investing'
    | 'financing'
  lineKey: string
  label: string
  amount: number
  currency: string
  note?: string
}

export type GeneratedFinancialKpi = {
  kpiKey: string
  label: string
  value: number
  unit: 'ratio' | 'percent' | 'currency' | 'count' | 'days'
  basis: 'reported' | 'derived'
}

export type GeneratedTransactionReport = {
  lineItems: GeneratedFinancialLineItem[]
  kpis: GeneratedFinancialKpi[]
  totals: {
    grossRevenue: number
    refunds: number
    expenses: number
    operatingResult: number
    cashIn: number
    cashOut: number
    netCashflow: number
    receivables: number
    pax: number
    invoiceCount: number
  }
}

function finite(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

export async function buildTransactionFinancialReport(
  supabase: DbClient,
  financialPeriodId: string,
): Promise<GeneratedTransactionReport> {
  const { data: period, error: periodError } = await supabase
    .from('financial_periods')
    .select('starts_on,ends_on,currency')
    .eq('id', financialPeriodId)
    .maybeSingle()

  if (periodError || !period) {
    throw new Error('Financial period could not be loaded for transaction synchronization.')
  }

  const startsAt = `${period.starts_on}T00:00:00Z`
  const endsAt = `${period.ends_on}T23:59:59.999Z`
  const currency = period.currency.trim().toUpperCase()

  const [invoicesResult, paymentsResult, refundsResult, expensesResult] = await Promise.all([
    supabase
      .from('finance_invoices')
      .select('id,grand_total,paid_total,refunded_total')
      .neq('status', 'void')
      .gte('issued_on', period.starts_on)
      .lte('issued_on', period.ends_on)
      .eq('currency', currency),
    supabase
      .from('finance_payments')
      .select('id,invoice_id,amount')
      .eq('status', 'confirmed')
      .gte('received_at', startsAt)
      .lte('received_at', endsAt)
      .eq('currency', currency),
    supabase
      .from('finance_refunds')
      .select('id,invoice_id,amount')
      .eq('status', 'processed')
      .gte('processed_at', startsAt)
      .lte('processed_at', endsAt),
    supabase
      .from('finance_expenses')
      .select('id,total_amount')
      .eq('status', 'recorded')
      .gte('expense_on', period.starts_on)
      .lte('expense_on', period.ends_on)
      .eq('currency', currency),
  ])

  if (invoicesResult.error || paymentsResult.error || refundsResult.error || expensesResult.error) {
    throw new Error('Operational finance transactions could not be loaded for report generation.')
  }

  const invoices = invoicesResult.data ?? []
  const invoiceIds = invoices.map((invoice) => invoice.id)
  const itemsResult = invoiceIds.length
    ? await supabase
        .from('finance_invoice_items')
        .select('invoice_id,quantity,unit_label')
        .in('invoice_id', invoiceIds)
    : { data: [], error: null }

  if (itemsResult.error) {
    throw new Error('Finance invoice items could not be loaded for report generation.')
  }

  const grossRevenue = invoices.reduce((sum, invoice) => sum + finite(invoice.grand_total), 0)
  const invoiceCollected = invoices.reduce(
    (sum, invoice) =>
      sum + Math.max(finite(invoice.paid_total) - finite(invoice.refunded_total), 0),
    0,
  )
  const receivables = invoices.reduce(
    (sum, invoice) =>
      sum +
      Math.max(
        finite(invoice.grand_total) - finite(invoice.paid_total) + finite(invoice.refunded_total),
        0,
      ),
    0,
  )
  const cashIn = (paymentsResult.data ?? []).reduce(
    (sum, payment) => sum + finite(payment.amount),
    0,
  )
  const refunds = (refundsResult.data ?? []).reduce(
    (sum, refund) => sum + finite(refund.amount),
    0,
  )
  const expenses = (expensesResult.data ?? []).reduce(
    (sum, expense) => sum + finite(expense.total_amount),
    0,
  )
  const pax = (itemsResult.data ?? []).reduce((sum, item) => {
    if (!PAX_UNIT_LABELS.has(item.unit_label.trim().toLowerCase())) return sum
    return sum + finite(item.quantity)
  }, 0)
  const netRevenue = grossRevenue - refunds
  const operatingResult = netRevenue - expenses
  const cashOut = refunds + expenses
  const netCashflow = cashIn - cashOut
  const collectionRate = grossRevenue > 0 ? (invoiceCollected / grossRevenue) * 100 : 0
  const averageRevenuePerPax = pax > 0 ? grossRevenue / pax : 0

  const lineItems: GeneratedFinancialLineItem[] = [
    {
      statement: 'income',
      category: 'revenue',
      lineKey: 'gross_revenue',
      label: 'Pendapatan bruto terinvois',
      amount: grossRevenue,
      currency,
      note: 'Otomatis dari invoice non-void yang terbit pada periode laporan.',
    },
    {
      statement: 'income',
      category: 'revenue',
      lineKey: 'refunds_processed',
      label: 'Refund diproses',
      amount: -refunds,
      currency,
      note: 'Kontra pendapatan dari refund berstatus processed pada periode laporan.',
    },
    {
      statement: 'income',
      category: 'revenue',
      lineKey: 'net_revenue',
      label: 'Pendapatan neto operasional',
      amount: netRevenue,
      currency,
      note: 'Pendapatan bruto dikurangi refund diproses.',
    },
    {
      statement: 'income',
      category: 'expense',
      lineKey: 'operating_expenses',
      label: 'Pengeluaran operasional tercatat',
      amount: -expenses,
      currency,
      note: 'Otomatis dari pengeluaran berstatus recorded pada periode laporan.',
    },
    {
      statement: 'income',
      category: 'operating',
      lineKey: 'operating_result',
      label: 'Hasil operasional',
      amount: operatingResult,
      currency,
      note: 'Pendapatan neto dikurangi pengeluaran operasional tercatat.',
    },
    {
      statement: 'cash_flow',
      category: 'operating',
      lineKey: 'cash_received',
      label: 'Kas masuk dari pembayaran',
      amount: cashIn,
      currency,
      note: 'Pembayaran berstatus confirmed berdasarkan tanggal penerimaan.',
    },
    {
      statement: 'cash_flow',
      category: 'operating',
      lineKey: 'refund_cash_out',
      label: 'Kas keluar untuk refund',
      amount: -refunds,
      currency,
      note: 'Refund berstatus processed berdasarkan tanggal diproses.',
    },
    {
      statement: 'cash_flow',
      category: 'operating',
      lineKey: 'expense_cash_out',
      label: 'Kas keluar untuk pengeluaran',
      amount: -expenses,
      currency,
      note: 'Pengeluaran berstatus recorded pada periode laporan.',
    },
    {
      statement: 'cash_flow',
      category: 'operating',
      lineKey: 'net_operating_cashflow',
      label: 'Arus kas operasional bersih',
      amount: netCashflow,
      currency,
      note: 'Kas masuk dikurangi refund dan pengeluaran tercatat.',
    },
    {
      statement: 'balance',
      category: 'asset',
      lineKey: 'accounts_receivable',
      label: 'Piutang invoice periode',
      amount: receivables,
      currency,
      note: 'Sisa tagihan invoice periode setelah pembayaran dikurangi refund.',
    },
  ]

  const kpis: GeneratedFinancialKpi[] = [
    { kpiKey: 'pax_sold', label: 'Pax terjual', value: pax, unit: 'count', basis: 'derived' },
    {
      kpiKey: 'invoice_count',
      label: 'Invoice terbit',
      value: invoices.length,
      unit: 'count',
      basis: 'derived',
    },
    {
      kpiKey: 'gross_revenue',
      label: 'Pendapatan bruto',
      value: grossRevenue,
      unit: 'currency',
      basis: 'derived',
    },
    { kpiKey: 'cash_in', label: 'Arus masuk', value: cashIn, unit: 'currency', basis: 'derived' },
    { kpiKey: 'cash_out', label: 'Arus keluar', value: cashOut, unit: 'currency', basis: 'derived' },
    {
      kpiKey: 'net_cashflow',
      label: 'Arus kas bersih',
      value: netCashflow,
      unit: 'currency',
      basis: 'derived',
    },
    {
      kpiKey: 'operating_result',
      label: 'Hasil operasional',
      value: operatingResult,
      unit: 'currency',
      basis: 'derived',
    },
    {
      kpiKey: 'collection_rate',
      label: 'Tingkat kolektibilitas invoice',
      value: collectionRate,
      unit: 'percent',
      basis: 'derived',
    },
    {
      kpiKey: 'average_revenue_per_pax',
      label: 'Rata-rata pendapatan per pax',
      value: averageRevenuePerPax,
      unit: 'currency',
      basis: 'derived',
    },
  ]

  return {
    lineItems,
    kpis,
    totals: {
      grossRevenue,
      refunds,
      expenses,
      operatingResult,
      cashIn,
      cashOut,
      netCashflow,
      receivables,
      pax,
      invoiceCount: invoices.length,
    },
  }
}
