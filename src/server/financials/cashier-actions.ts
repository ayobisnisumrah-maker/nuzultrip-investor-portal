'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { ConflictError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import type { Database, Json } from '@/types/database'

const money = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER)
const requiredMoney = z.number().finite().positive().max(Number.MAX_SAFE_INTEGER)

const productSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  unitLabel: z.string().trim().min(1).max(30).default('pax'),
  defaultUnitPrice: money,
  currency: z.string().trim().regex(/^[A-Z]{3}$/).default('IDR'),
  taxRate: z.number().finite().min(0).max(100).default(0),
})

const invoiceItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  productCode: z.string().trim().max(80).optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  quantity: z.number().finite().positive().max(100000),
  unitLabel: z.string().trim().min(1).max(30).default('pax'),
  unitPrice: money,
  discountAmount: money.default(0),
  taxRate: z.number().finite().min(0).max(100).default(0),
})

const invoiceSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  customerPhone: z.string().trim().max(50).optional(),
  customerAddress: z.string().trim().max(1000).optional(),
  dueOn: z.string().date().nullable().optional(),
  notes: z.string().trim().max(5000).optional(),
  items: z.array(invoiceItemSchema).min(1).max(100),
})

const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: requiredMoney,
  method: z.string().trim().min(1).max(100),
  receivedAt: z.string().datetime().nullable().optional(),
  externalReference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
})

const refundSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentId: z.string().uuid().nullable().optional(),
  amount: requiredMoney,
  reason: z.string().trim().min(1).max(1000),
  notes: z.string().trim().max(2000).optional(),
})

const expenseSchema = z.object({
  expenseOn: z.string().date(),
  category: z.string().trim().min(1).max(100),
  vendorName: z.string().trim().max(200).optional(),
  description: z.string().trim().min(1).max(1000),
  quantity: z.number().finite().positive().max(100000).default(1),
  unitPrice: money,
  taxAmount: money.default(0),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).default('IDR'),
  paymentMethod: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
})

const settingsSchema = z.object({
  invoicePrefix: z.string().trim().min(1).max(20),
  receiptPrefix: z.string().trim().min(1).max(20),
  refundPrefix: z.string().trim().min(1).max(20),
  defaultCurrency: z.string().trim().regex(/^[A-Z]{3}$/),
  companyLegalName: z.string().trim().max(200).optional(),
  companyAddress: z.string().trim().max(2000).optional(),
  companyTaxId: z.string().trim().max(100).optional(),
  bankDetails: z.string().trim().max(3000).optional(),
  paymentInstructions: z.string().trim().max(3000).optional(),
  invoiceTerms: z.string().trim().max(10000).optional(),
  invoiceFooter: z.string().trim().max(2000).optional(),
  taxInvoiceEnabled: z.boolean().default(false),
})

const reportSyncSchema = z.object({ reportId: z.string().uuid() })
const invoiceIdSchema = z.object({ invoiceId: z.string().uuid() })

type AppRpcClient = {
  rpc: (name: string, args: Record<string, Json | undefined>) => Promise<{ data: unknown; error: { message: string } | null }>
}

function appRpcClient(supabase: SupabaseClient<Database>) {
  return supabase.schema('app') as unknown as AppRpcClient
}

function idFromRpc(data: unknown): string | null {
  if (typeof data === 'string') return data
  const row = Array.isArray(data) ? data[0] : data
  if (row && typeof row === 'object') {
    for (const value of Object.values(row as Record<string, unknown>)) if (typeof value === 'string') return value
  }
  return null
}

function refreshCashier() {
  revalidatePath('/admin/financials')
  revalidatePath('/admin/financials/cashier')
  revalidatePath('/admin/financials/reports')
}

export const createCashierProduct = defineAction({
  access: { permission: 'financial_reports.update' },
  input: productSchema,
  audit: { action: 'finance_product.created', entityType: 'finance_product' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await supabase.from('finance_products').insert({
      code: input.code,
      name: input.name,
      description: input.description || null,
      unit_label: input.unitLabel,
      default_unit_price: input.defaultUnitPrice,
      currency: input.currency,
      tax_rate: input.taxRate,
      active: true,
    }).select('id, code, name').single()
    if (error) throw new ConflictError(`Failed to create cashier product: ${error.message}`, 'Produk atau paket tidak dapat disimpan.')
    audit({ entityId: data.id, summary: `Produk kasir ${data.code} - ${data.name} dibuat.` })
    refreshCashier()
    return data
  },
})

export const createCashierInvoice = defineAction({
  access: { permission: 'financial_reports.update' },
  input: invoiceSchema,
  audit: { action: 'finance_invoice.created', entityType: 'finance_invoice' },
  handler: async ({ input, supabase, audit }) => {
    const items = input.items.map((item, position) => ({
      product_id: item.productId ?? null,
      product_code: item.productCode || null,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      unit_label: item.unitLabel,
      unit_price: item.unitPrice,
      discount_amount: item.discountAmount,
      tax_rate: item.taxRate,
      position,
    }))
    const { data, error } = await appRpcClient(supabase).rpc('create_finance_invoice', {
      p_customer_name: input.customerName,
      p_customer_email: input.customerEmail || null,
      p_customer_phone: input.customerPhone || null,
      p_customer_address: input.customerAddress || null,
      p_due_on: input.dueOn ?? null,
      p_notes: input.notes || null,
      p_items: items,
    })
    if (error) throw new ConflictError(`Failed to create finance invoice: ${error.message}`, 'Invoice tidak dapat dibuat. Periksa data pelanggan dan item transaksi.')
    const invoiceId = idFromRpc(data)
    if (!invoiceId) throw new ConflictError('Invoice RPC returned no id.', 'Invoice tidak dapat dibuat saat ini.')
    audit({ entityId: invoiceId, summary: `Draft invoice kasir dibuat untuk ${input.customerName}.` })
    refreshCashier()
    return { invoiceId }
  },
})

export const issueCashierInvoice = defineAction({
  access: { permission: 'financial_reports.update' }, input: invoiceIdSchema,
  audit: { action: 'finance_invoice.issued', entityType: 'finance_invoice' },
  handler: async ({ input, supabase, audit }) => {
    const { error } = await appRpcClient(supabase).rpc('issue_finance_invoice', { p_invoice_id: input.invoiceId })
    if (error) throw new ConflictError(`Failed to issue invoice: ${error.message}`, 'Invoice hanya dapat diterbitkan dari draft yang memiliki nilai transaksi.')
    audit({ entityId: input.invoiceId, summary: 'Invoice kasir diterbitkan.' })
    refreshCashier()
    return { invoiceId: input.invoiceId }
  },
})

export const recordCashierPayment = defineAction({
  access: { permission: 'financial_reports.update' }, input: paymentSchema,
  audit: { action: 'finance_payment.recorded', entityType: 'finance_payment' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpcClient(supabase).rpc('record_finance_payment', {
      p_invoice_id: input.invoiceId, p_amount: input.amount, p_method: input.method,
      p_received_at: input.receivedAt ?? null, p_external_reference: input.externalReference || null,
      p_notes: input.notes || null, p_idempotency_key: null,
    })
    if (error) throw new ConflictError(`Failed to record payment: ${error.message}`, 'Pembayaran tidak dapat dicatat. Pastikan invoice sudah diterbitkan dan nominal tidak melebihi tagihan.')
    const paymentId = idFromRpc(data)
    if (!paymentId) throw new ConflictError('Payment RPC returned no id.', 'Pembayaran tidak dapat dicatat saat ini.')
    audit({ entityId: paymentId, summary: `Pembayaran ${input.amount} dicatat untuk invoice ${input.invoiceId}.` })
    refreshCashier()
    return { paymentId }
  },
})

export const processCashierRefund = defineAction({
  access: { permission: 'financial_reports.update' }, input: refundSchema,
  audit: { action: 'finance_refund.processed', entityType: 'finance_refund' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpcClient(supabase).rpc('process_finance_refund', {
      p_invoice_id: input.invoiceId, p_payment_id: input.paymentId ?? null, p_amount: input.amount,
      p_reason: input.reason, p_notes: input.notes || null,
    })
    if (error) throw new ConflictError(`Failed to process refund: ${error.message}`, 'Refund tidak dapat diproses. Pastikan invoice sudah memiliki pembayaran yang dapat direfund.')
    const refundId = idFromRpc(data)
    if (!refundId) throw new ConflictError('Refund RPC returned no id.', 'Refund tidak dapat diproses saat ini.')
    audit({ entityId: refundId, summary: `Refund ${input.amount} diproses untuk invoice ${input.invoiceId}.` })
    refreshCashier()
    return { refundId }
  },
})

export const createCashierExpense = defineAction({
  access: { permission: 'financial_reports.update' }, input: expenseSchema,
  audit: { action: 'finance_expense.recorded', entityType: 'finance_expense' },
  handler: async ({ input, supabase, audit }) => {
    const reference = `EXP-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
    const total = input.quantity * input.unitPrice + input.taxAmount
    const { data, error } = await supabase.from('finance_expenses').insert({
      reference, status: 'recorded', expense_on: input.expenseOn, category: input.category,
      vendor_name: input.vendorName || null, description: input.description, quantity: input.quantity,
      unit_price: input.unitPrice, tax_amount: input.taxAmount, total_amount: total,
      currency: input.currency, payment_method: input.paymentMethod || null, notes: input.notes || null,
    }).select('id, reference').single()
    if (error) throw new ConflictError(`Failed to record expense: ${error.message}`, 'Pengeluaran tidak dapat dicatat.')
    audit({ entityId: data.id, summary: `Pengeluaran ${data.reference} sebesar ${total} dicatat.` })
    refreshCashier()
    return data
  },
})

export const updateCashierSettings = defineAction({
  access: { permission: 'financial_reports.update' }, input: settingsSchema,
  audit: { action: 'finance_settings.updated', entityType: 'finance_settings' },
  handler: async ({ input, supabase, audit }) => {
    const payload = {
      singleton: true, invoice_prefix: input.invoicePrefix, receipt_prefix: input.receiptPrefix,
      refund_prefix: input.refundPrefix, default_currency: input.defaultCurrency,
      company_legal_name: input.companyLegalName || null, company_address: input.companyAddress || null,
      company_tax_id: input.companyTaxId || null, bank_details: input.bankDetails || null,
      payment_instructions: input.paymentInstructions || null, invoice_terms: input.invoiceTerms || null,
      invoice_footer: input.invoiceFooter || null, tax_invoice_enabled: input.taxInvoiceEnabled,
    }
    const { data: existing } = await supabase.from('finance_settings').select('id').eq('singleton', true).maybeSingle()
    const query = existing
      ? supabase.from('finance_settings').update(payload).eq('id', existing.id)
      : supabase.from('finance_settings').insert(payload)
    const { data, error } = await query.select('id').single()
    if (error) throw new ConflictError(`Failed to update cashier settings: ${error.message}`, 'Pengaturan kasir tidak dapat disimpan.')
    audit({ entityId: data.id, summary: 'Pengaturan invoice dan kasir diperbarui.' })
    refreshCashier()
    return { id: data.id }
  },
})

export const syncCashierToFinancialReport = defineAction({
  access: { permission: 'financial_reports.update' }, input: reportSyncSchema,
  audit: { action: 'financial_report.cashier_synced', entityType: 'financial_report' },
  handler: async ({ input, supabase, audit }) => {
    const { data: report, error: reportError } = await supabase.from('financial_reports')
      .select('id, status, current_version_id, financial_period_id').eq('id', input.reportId).maybeSingle()
    if (reportError) throw new ConflictError(`Failed to read report: ${reportError.message}`, 'Laporan keuangan tidak dapat dibaca.')
    if (!report || !report.current_version_id) throw new NotFoundError('Financial report')
    if (report.status !== 'draft') throw new ConflictError('Cashier sync requires draft report.', 'Sinkronisasi kasir hanya dapat dilakukan pada laporan berstatus draft.')

    const [{ data: period, error: periodError }, { data: version, error: versionError }] = await Promise.all([
      supabase.from('financial_periods').select('starts_on, ends_on, currency').eq('id', report.financial_period_id).single(),
      supabase.from('financial_report_versions').select('document_asset_id').eq('id', report.current_version_id).single(),
    ])
    if (periodError || versionError) throw new ConflictError('Failed to read report period/version.', 'Periode atau versi laporan tidak dapat dibaca.')

    const startTs = `${period.starts_on}T00:00:00.000Z`
    const endTs = `${period.ends_on}T23:59:59.999Z`
    const [invoicesResult, paymentsResult, refundsResult, expensesResult] = await Promise.all([
      supabase.from('finance_invoices').select('id, grand_total, paid_total, refunded_total, status, issued_on').gte('issued_on', period.starts_on).lte('issued_on', period.ends_on).neq('status', 'draft').neq('status', 'void'),
      supabase.from('finance_payments').select('amount').eq('status', 'confirmed').gte('received_at', startTs).lte('received_at', endTs),
      supabase.from('finance_refunds').select('amount').eq('status', 'processed').gte('processed_at', startTs).lte('processed_at', endTs),
      supabase.from('finance_expenses').select('total_amount').eq('status', 'recorded').gte('expense_on', period.starts_on).lte('expense_on', period.ends_on),
    ])
    const anyError = invoicesResult.error || paymentsResult.error || refundsResult.error || expensesResult.error
    if (anyError) throw new ConflictError(`Failed to aggregate cashier data: ${anyError?.message}`, 'Data kasir belum dapat disinkronkan ke laporan.')

    const invoices = invoicesResult.data ?? []
    const invoiceIds = invoices.map((row) => row.id)
    const { data: paxItems, error: itemError } = invoiceIds.length
      ? await supabase.from('finance_invoice_items').select('quantity, unit_label').in('invoice_id', invoiceIds)
      : { data: [], error: null }
    if (itemError) throw new ConflictError(`Failed to aggregate invoice items: ${itemError.message}`, 'Jumlah pax belum dapat dihitung.')

    const sales = invoices.reduce((sum, row) => sum + Number(row.grand_total ?? 0), 0)
    const collected = (paymentsResult.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
    const refunds = (refundsResult.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
    const expenses = (expensesResult.data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
    const outstanding = invoices.reduce((sum, row) => sum + Math.max(0, Number(row.grand_total ?? 0) - Number(row.paid_total ?? 0) + Number(row.refunded_total ?? 0)), 0)
    const pax = (paxItems ?? []).filter((row) => row.unit_label.toLowerCase() === 'pax').reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
    const netRevenue = sales - refunds
    const operatingResult = netRevenue - expenses
    const netOperatingCash = collected - refunds - expenses

    const lineItems = [
      { statement: 'income', category: 'revenue', line_key: 'gross_sales', label: 'Penjualan Bruto dari Kasir', amount: sales, currency: period.currency, position: 0, note: 'Diturunkan otomatis dari invoice terbit dalam periode.' },
      { statement: 'income', category: 'revenue', line_key: 'refunds', label: 'Refund Penjualan', amount: -refunds, currency: period.currency, position: 1, note: 'Refund yang telah diproses dalam periode.' },
      { statement: 'income', category: 'revenue', line_key: 'net_revenue', label: 'Pendapatan Bersih Operasional', amount: netRevenue, currency: period.currency, position: 2, note: 'Penjualan bruto dikurangi refund.' },
      { statement: 'income', category: 'expense', line_key: 'operating_expenses', label: 'Pengeluaran Operasional', amount: expenses, currency: period.currency, position: 3, note: 'Pengeluaran berstatus recorded dalam periode.' },
      { statement: 'income', category: 'revenue', line_key: 'operating_result', label: 'Hasil Operasional', amount: operatingResult, currency: period.currency, position: 4, note: 'Pendapatan bersih dikurangi pengeluaran operasional.' },
      { statement: 'cash_flow', category: 'operating', line_key: 'cash_collected', label: 'Kas Diterima dari Pelanggan', amount: collected, currency: period.currency, position: 5, note: 'Pembayaran confirmed yang diterima dalam periode.' },
      { statement: 'cash_flow', category: 'operating', line_key: 'cash_refunds', label: 'Kas Keluar untuk Refund', amount: -refunds, currency: period.currency, position: 6, note: 'Refund processed dalam periode.' },
      { statement: 'cash_flow', category: 'operating', line_key: 'cash_operating_expenses', label: 'Kas Keluar untuk Pengeluaran', amount: -expenses, currency: period.currency, position: 7, note: 'Pengeluaran recorded dalam periode.' },
      { statement: 'cash_flow', category: 'operating', line_key: 'net_operating_cash', label: 'Arus Kas Operasi Bersih', amount: netOperatingCash, currency: period.currency, position: 8, note: 'Kas masuk dikurangi refund dan pengeluaran.' },
    ]
    const kpis = [
      { kpi_key: 'pax_sold', label: 'Pax Terjual', value: pax, unit: 'count', basis: 'derived', position: 0 },
      { kpi_key: 'invoice_count', label: 'Invoice Terbit', value: invoices.length, unit: 'count', basis: 'derived', position: 1 },
      { kpi_key: 'gross_sales', label: 'Penjualan Bruto', value: sales, unit: 'currency', basis: 'derived', position: 2 },
      { kpi_key: 'cash_collected', label: 'Pembayaran Diterima', value: collected, unit: 'currency', basis: 'derived', position: 3 },
      { kpi_key: 'outstanding_receivable', label: 'Piutang Berjalan', value: outstanding, unit: 'currency', basis: 'derived', position: 4 },
      { kpi_key: 'refund_total', label: 'Refund Diproses', value: refunds, unit: 'currency', basis: 'derived', position: 5 },
      { kpi_key: 'operating_expense', label: 'Pengeluaran Operasional', value: expenses, unit: 'currency', basis: 'derived', position: 6 },
      { kpi_key: 'operating_result', label: 'Hasil Operasional', value: operatingResult, unit: 'currency', basis: 'derived', position: 7 },
    ]

    const { error } = await appRpcClient(supabase).rpc('save_financial_report_draft_content', {
      p_report_id: input.reportId,
      p_document_asset_id: version.document_asset_id,
      p_line_items: lineItems,
      p_kpis: kpis,
    })
    if (error) throw new ConflictError(`Failed to save cashier-derived report: ${error.message}`, 'Data kasir sudah dihitung tetapi belum dapat disimpan ke laporan draft.')

    audit({ entityId: input.reportId, summary: `Laporan disinkronkan dari kasir: ${invoices.length} invoice, ${pax} pax.`, changes: { source: { before: 'manual', after: 'cashier-derived' } } })
    refreshCashier()
    revalidatePath(`/admin/financials/reports/${input.reportId}`)
    return { reportId: input.reportId, invoiceCount: invoices.length, pax, sales, collected, refunds, expenses, outstanding }
  },
})
