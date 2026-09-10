'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { ConflictError } from '@/core/errors'
import {
  financeInvoiceDepartureSchema,
  financePolicySettingsSchema,
} from '@/core/financials/refund-policy'
import { defineAction } from '@/server/auth/guards'
import type { Database } from '@/types/database'

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

const appRpc = (client: SupabaseClient<Database>) => client.schema('app') as unknown as AppRpcClient

export const updateFinancePolicySettings = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financePolicySettingsSchema,
  audit: { action: 'finance.refund_policy_updated', entityType: 'finance_settings' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpc(supabase).rpc('update_finance_policy_settings', {
      p_terms_body: input.termsBody,
      p_terms_letterhead_asset_id: input.termsLetterheadAssetId,
      p_refund_processing_days: input.refundPolicy.processingDays,
      p_refund_day_basis: input.refundPolicy.dayBasis,
      p_refund_tiers: input.refundPolicy.tiers,
    })

    if (error || typeof data !== 'string')
      throw new ConflictError(
        error?.message ?? 'Finance policy settings RPC returned no id.',
        'Pengaturan syarat, kop surat, dan kebijakan refund tidak dapat disimpan.',
      )

    audit({
      entityId: data,
      summary: `Kebijakan refund diperbarui: proses maksimal ${input.refundPolicy.processingDays} ${
        input.refundPolicy.dayBasis === 'business_days' ? 'hari kerja' : 'hari kalender'
      } dengan ${input.refundPolicy.tiers.length} aturan pengembalian.`,
    })
    revalidatePath('/admin/financials/operations')
    return { id: data }
  },
})

export const updateFinanceInvoiceDeparture = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financeInvoiceDepartureSchema,
  audit: { action: 'finance.invoice_departure_updated', entityType: 'finance_invoice' },
  handler: async ({ input, supabase, audit }) => {
    const { error } = await appRpc(supabase).rpc('set_finance_invoice_departure', {
      p_invoice_id: input.invoiceId,
      p_departure_on: input.departureOn,
    })

    if (error)
      throw new ConflictError(
        error.message,
        'Tanggal keberangkatan tidak dapat disimpan. Setelah ada pengajuan refund, tanggal keberangkatan dikunci untuk menjaga dasar perhitungan.',
      )

    audit({
      entityId: input.invoiceId,
      summary: `Tanggal keberangkatan invoice diatur menjadi ${input.departureOn}.`,
    })
    revalidatePath('/admin/financials/operations')
    revalidatePath(`/admin/financials/operations/invoices/${input.invoiceId}`)
    return { id: input.invoiceId }
  },
})
