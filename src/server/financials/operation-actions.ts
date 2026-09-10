'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConflictError } from '@/core/errors'
import {
  financeExpenseSchema,
  financeInvoiceSchema,
  financePaymentSchema,
  financeProductSchema,
  financeRefundSchema,
  financeSettingsSchema,
} from '@/core/financials/operations'
import { defineAction } from '@/server/auth/guards'
import type { Database } from '@/types/database'

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}
const appRpc = (client: SupabaseClient<Database>) => client.schema('app') as unknown as AppRpcClient
const refresh = () => {
  revalidatePath('/admin/financials')
  revalidatePath('/admin/financials/operations')
}

export const createFinanceProduct = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financeProductSchema,
  audit: { action: 'finance.product_created', entityType: 'finance_product' },
  handler: async ({ input, supabase, principal, audit }) => {
    const code = input.code || `PKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const { data, error } = await supabase
      .from('finance_products')
      .insert({
        code,
        name: input.name,
        description: input.description || null,
        unit_label: input.unitLabel,
        default_unit_price: input.defaultUnitPrice,
        tax_rate: input.taxRate,
        created_by: principal.kind === 'anonymous' ? null : principal.userId,
        updated_by: principal.kind === 'anonymous' ? null : principal.userId,
      })
      .select('id')
      .single()
    if (error)
      throw new ConflictError(
        error.message,
        'Produk atau paket tidak dapat disimpan. Pastikan kodenya belum digunakan.',
      )
    audit({ entityId: data.id, summary: `Produk keuangan ${code} dibuat.` })
    refresh()
    return data
  },
})
export const createFinanceInvoice = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financeInvoiceSchema,
  audit: { action: 'finance.invoice_created', entityType: 'finance_invoice' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpc(supabase).rpc('create_finance_invoice', {
      p_customer_name: input.customerName,
      p_customer_email: input.customerEmail,
      p_customer_phone: input.customerPhone,
      p_customer_address: input.customerAddress,
      p_due_on: input.dueOn,
      p_notes: input.notes,
      p_items: input.items.map((item) => ({
        product_id: item.productId,
        product_code: item.productCode,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_label: item.unitLabel,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        tax_rate: item.taxRate,
        position: item.position,
      })),
    })
    if (error || typeof data !== 'string')
      throw new ConflictError(
        error?.message ?? 'Invoice RPC returned no id',
        'Invoice tidak dapat dibuat.',
      )
    audit({ entityId: data, summary: `Invoice untuk ${input.customerName} dibuat.` })
    refresh()
    return { id: data }
  },
})
export const issueFinanceInvoice = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financePaymentSchema.pick({ invoiceId: true }),
  audit: { action: 'finance.invoice_issued', entityType: 'finance_invoice' },
  handler: async ({ input, supabase, audit }) => {
    const { error } = await appRpc(supabase).rpc('issue_finance_invoice', {
      p_invoice_id: input.invoiceId,
    })
    if (error) throw new ConflictError(error.message, 'Invoice tidak dapat diterbitkan.')
    audit({
      entityId: input.invoiceId,
      summary: 'Invoice diterbitkan dan isi finansialnya dikunci.',
    })
    refresh()
    return { id: input.invoiceId }
  },
})
export const recordFinancePayment = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financePaymentSchema,
  audit: { action: 'finance.payment_recorded', entityType: 'finance_payment' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpc(supabase).rpc('record_finance_payment', {
      p_invoice_id: input.invoiceId,
      p_amount: input.amount,
      p_method: input.method,
      p_received_at: new Date().toISOString(),
      p_external_reference: input.externalReference,
      p_notes: input.notes,
      p_idempotency_key: null,
    })
    if (error || typeof data !== 'string')
      throw new ConflictError(
        error?.message ?? 'Payment RPC returned no id',
        'Pembayaran tidak dapat dicatat.',
      )
    audit({ entityId: data, summary: `Pembayaran invoice ${input.invoiceId} dicatat.` })
    refresh()
    return { id: data }
  },
})
export const processFinanceRefund = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financeRefundSchema,
  audit: { action: 'finance.refund_processed', entityType: 'finance_refund' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpc(supabase).rpc('process_finance_refund', {
      p_invoice_id: input.invoiceId,
      p_payment_id: input.paymentId,
      p_amount: input.amount,
      p_reason: input.reason,
      p_notes: input.notes,
    })
    if (error || typeof data !== 'string')
      throw new ConflictError(
        error?.message ?? 'Refund RPC returned no id',
        'Refund tidak dapat diproses.',
      )
    audit({ entityId: data, summary: `Refund invoice ${input.invoiceId} diproses.` })
    refresh()
    return { id: data }
  },
})
export const createFinanceExpense = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financeExpenseSchema,
  audit: { action: 'finance.expense_recorded', entityType: 'finance_expense' },
  handler: async ({ input, supabase, principal, audit }) => {
    const { data: settings } = await supabase
      .from('finance_settings')
      .select('default_currency')
      .eq('singleton', true)
      .single()
    const { data, error } = await supabase
      .from('finance_expenses')
      .insert({
        reference: `EXP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        status: 'recorded',
        expense_on: input.expenseOn,
        category: input.category,
        vendor_name: input.vendorName || null,
        description: input.description,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        tax_amount: input.taxAmount,
        currency: settings?.default_currency ?? 'IDR',
        payment_method: input.paymentMethod || null,
        notes: input.notes || null,
        recorded_by: principal.kind === 'anonymous' ? null : principal.userId,
      })
      .select('id')
      .single()
    if (error) throw new ConflictError(error.message, 'Pengeluaran tidak dapat dicatat.')
    audit({ entityId: data.id, summary: `Pengeluaran ${input.category} dicatat.` })
    refresh()
    return data
  },
})
export const updateFinanceSettings = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financeSettingsSchema,
  audit: { action: 'finance.settings_updated', entityType: 'finance_settings' },
  handler: async ({ input, supabase, principal, audit }) => {
    const { data, error } = await supabase
      .from('finance_settings')
      .update({
        invoice_prefix: input.invoicePrefix,
        receipt_prefix: input.receiptPrefix,
        refund_prefix: input.refundPrefix,
        company_legal_name: input.companyLegalName || null,
        company_address: input.companyAddress || null,
        company_tax_id: input.companyTaxId || null,
        bank_details: input.bankDetails || null,
        payment_instructions: input.paymentInstructions || null,
        invoice_terms: input.invoiceTerms || null,
        invoice_footer: input.invoiceFooter || null,
        logo_asset_id: input.logoAssetId,
        stamp_asset_id: input.stampAssetId,
        signature_asset_id: input.signatureAssetId,
        updated_by: principal.kind === 'anonymous' ? null : principal.userId,
      })
      .eq('singleton', true)
      .select('id')
      .single()
    if (error) throw new ConflictError(error.message, 'Pengaturan invoice tidak dapat disimpan.')
    audit({ entityId: data.id, summary: 'Pengaturan invoice operasional diperbarui.' })
    refresh()
    return data
  },
})
