import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

const PAX_UNIT_LABELS = new Set(['pax', 'jamaah', 'orang', 'person'])

export type GeneratedFinancialLineItem = {
  statement: 'income' | 'balance' | 'cash_flow' | 'changes_in_equity'
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
    throw new Error('Invoice items could not be loaded for report generation.')
  }

  const grossRevenue = invoices.reduce((sum, invoice) => sum + finite(invoice.grand_total), 0)
  const refunds = (refundsResult.data ?? []).reduce((sum, refund) => sum + finite(refund.amount), 0)
  const expenses = (expensesResult.data ?? []).reduce((sum, expense) => sum + finite(expense.total_amount), 0)
  const cashIn = (paymentsResult.data ?? []).reduce((sum, payment) => sum + finite(payment.amount), 0)
  const cashOut = refunds + expenses
  const netCashflow = cashIn - cashOut
  const operatingResult = grossRevenue - refunds - expenses
  const receivables = invoices.reduce(
    (sum, invoice) =>
      sum + Math.max(0, finite(invoice.grand_total) - finite(invoice.paid_total) - finite(invoice.refunded_total)),
    0,
  )
  const pax = (itemsResult.data ?? []).reduce((sum, item) => {
    const unit = String(item.unit_label ?? '').trim().toLowerCase()
    return sum + (PAX_UNIT_LABELS.has(unit) ? finite(item.quantity) : 0)
  }, 0)

  const lineItems: GeneratedFinancialLineItem[] = [
    {
      statement: 'income',
      category: 'revenue',
      lineKey: 'gross_revenue',
      label: 'Pendapatan bruto',
      amount: grossRevenue,
      currency,
      note: 'Dibentuk dari invoice non-void pada periode laporan.',
    },
    {
      statement: 'income',
      category: 'expense',
      lineKey: 'refunds',
      label: 'Refund',
      amount: refunds,
      currency,
      note: 'Refund berstatus processed pada periode laporan.',
    },
    {
      statement: 'income',
      category: 'expense',
      lineKey: 'operating_expenses',
      label: 'Beban operasional',
      amount: expenses,
      currency,
      note: 'Pengeluaran berstatus recorded pada periode laporan.',
    },
    {
      statement: 'balance',
      category: 'asset',
      lineKey: 'accounts_receivable',
      label: 'Piutang usaha',
      amount: receivables,
      currency,
      note: 'Sisa tagihan invoice non-void yang belum dibayar/refund.',
    },
    {
      statement: 'cash_flow',
      category: 'operating',
      lineKey: 'cash_in',
      label: 'Kas masuk',
      amount: cashIn,
      currency,
      note: 'Pembayaran yang telah direkonsiliasi/confirmed pada periode laporan.',
    },
    {
      statement: 'cash_flow',
      category: 'operating',
      lineKey: 'cash_out',
      label: 'Kas keluar',
      amount: cashOut,
      currency,
      note: 'Refund processed dan pengeluaran recorded pada periode laporan.',
    },
  ]

  const kpis: GeneratedFinancialKpi[] = [
    {
      kpiKey: 'gross_revenue',
      label: 'Pendapatan bruto',
      value: grossRevenue,
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
      kpiKey: 'cash_in',
      label: 'Kas masuk',
      value: cashIn,
      unit: 'currency',
      basis: 'derived',
    },
    {
      kpiKey: 'cash_out',
      label: 'Kas keluar',
      value: cashOut,
      unit: 'currency',
      basis: 'derived',
    },
    {
      kpiKey: 'net_cashflow',
      label: 'Arus kas bersih',
      value: netCashflow,
      unit: 'currency',
      basis: 'derived',
    },
    {
      kpiKey: 'pax_sold',
      label: 'Pax terjual',
      value: pax,
      unit: 'count',
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
