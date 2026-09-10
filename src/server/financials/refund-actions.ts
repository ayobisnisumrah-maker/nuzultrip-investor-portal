'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { financeRefundSchema } from '@/core/financials/operations'
import { defineAction } from '@/server/auth/guards'

const processRefundRequestSchema = z.object({
  refundId: z.string().uuid(),
})

function sumAmounts(rows: Array<{ amount: number }> | null | undefined) {
  return (rows ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
}

export const requestFinanceRefund = defineAction({
  access: { permission: 'financial_reports.update' },
  input: financeRefundSchema,
  audit: { action: 'finance.refund_requested', entityType: 'finance_refund' },
  handler: async ({ input, supabase, principal, audit }) => {
    const [invoiceResult, paymentsResult, refundsResult, settingsResult] = await Promise.all([
      supabase
        .from('finance_invoices')
        .select('id,status')
        .eq('id', input.invoiceId)
        .maybeSingle(),
      supabase
        .from('finance_payments')
        .select('amount')
        .eq('invoice_id', input.invoiceId)
        .eq('status', 'confirmed'),
      supabase
        .from('finance_refunds')
        .select('amount,status')
        .eq('invoice_id', input.invoiceId)
        .in('status', ['requested', 'approved', 'processed']),
      supabase
        .from('finance_settings')
        .select('refund_prefix')
        .eq('singleton', true)
        .maybeSingle(),
    ])

    if (invoiceResult.error || !invoiceResult.data)
      throw new ConflictError(
        invoiceResult.error?.message ?? 'Invoice tidak ditemukan.',
        'Invoice tidak dapat ditemukan.',
      )
    if (!['partially_paid', 'paid'].includes(invoiceResult.data.status))
      throw new ConflictError(
        `Refund request is not allowed for invoice status ${invoiceResult.data.status}`,
        'Pengajuan refund hanya dapat dibuat untuk invoice yang sudah memiliki pembayaran.',
      )
    if (paymentsResult.error || refundsResult.error || settingsResult.error)
      throw new ConflictError(
        paymentsResult.error?.message ?? refundsResult.error?.message ?? settingsResult.error?.message ?? 'Refund data could not be loaded.',
        'Data pembayaran untuk pengajuan refund tidak dapat dimuat.',
      )

    const confirmedPaid = sumAmounts(paymentsResult.data)
    const reservedRefund = sumAmounts(refundsResult.data)
    const refundable = Math.max(confirmedPaid - reservedRefund, 0)
    if (input.amount > refundable)
      throw new ConflictError(
        `Requested refund ${input.amount} exceeds refundable balance ${refundable}`,
        'Nominal pengajuan refund melebihi saldo yang masih dapat direfund.',
      )

    const prefix = settingsResult.data?.refund_prefix?.trim() || 'RFD'
    const reference = `${prefix}-${crypto.randomUUID().slice(0, 10).toUpperCase()}`
    const requestedBy = principal.kind === 'anonymous' ? null : principal.userId
    const { data, error } = await supabase
      .from('finance_refunds')
      .insert({
        invoice_id: input.invoiceId,
        payment_id: input.paymentId,
        reference,
        status: 'requested',
        amount: input.amount,
        reason: input.reason,
        notes: input.notes || null,
        requested_by: requestedBy,
      })
      .select('id,reference')
      .single()

    if (error)
      throw new ConflictError(error.message, 'Pengajuan refund tidak dapat disimpan.')

    audit({
      entityId: data.id,
      summary: `Pengajuan refund ${data.reference} dibuat dari data kasir untuk invoice ${input.invoiceId}.`,
    })
    revalidatePath('/admin/financials')
    revalidatePath('/admin/financials/operations')
    revalidatePath(`/admin/financials/operations/invoices/${input.invoiceId}`)
    return data
  },
})

export const processFinanceRefundRequest = defineAction({
  access: { permission: 'financial_reports.update' },
  input: processRefundRequestSchema,
  audit: { action: 'finance.refund_processed', entityType: 'finance_refund' },
  handler: async ({ input, supabase, principal, audit }) => {
    const { data: request, error: requestError } = await supabase
      .from('finance_refunds')
      .select('id,invoice_id,amount,status,reference')
      .eq('id', input.refundId)
      .maybeSingle()

    if (requestError || !request)
      throw new ConflictError(
        requestError?.message ?? 'Refund request not found',
        'Pengajuan refund tidak dapat ditemukan.',
      )
    if (!['requested', 'approved'].includes(request.status))
      throw new ConflictError(
        `Refund request status ${request.status} cannot be processed`,
        'Pengajuan refund ini sudah diproses atau tidak lagi aktif.',
      )

    const [paymentsResult, processedResult] = await Promise.all([
      supabase
        .from('finance_payments')
        .select('amount')
        .eq('invoice_id', request.invoice_id)
        .eq('status', 'confirmed'),
      supabase
        .from('finance_refunds')
        .select('amount')
        .eq('invoice_id', request.invoice_id)
        .eq('status', 'processed'),
    ])
    if (paymentsResult.error || processedResult.error)
      throw new ConflictError(
        paymentsResult.error?.message ?? processedResult.error?.message ?? 'Refund totals could not be loaded',
        'Saldo refund terkini tidak dapat diverifikasi.',
      )

    const refundable = Math.max(sumAmounts(paymentsResult.data) - sumAmounts(processedResult.data), 0)
    if (Number(request.amount) > refundable)
      throw new ConflictError(
        `Refund amount ${request.amount} exceeds current refundable balance ${refundable}`,
        'Nominal refund tidak lagi tersedia karena saldo refundable telah berubah.',
      )

    const actor = principal.kind === 'anonymous' ? null : principal.userId
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('finance_refunds')
      .update({
        status: 'processed',
        approved_by: actor,
        processed_by: actor,
        approved_at: now,
        processed_at: now,
      })
      .eq('id', request.id)
      .in('status', ['requested', 'approved'])

    if (error) throw new ConflictError(error.message, 'Refund tidak dapat diproses.')

    audit({
      entityId: request.id,
      summary: `Pengajuan refund ${request.reference} diproses. Transaksi ini masuk ke sinkronisasi laporan keuangan pada tanggal processed_at.`,
    })
    revalidatePath('/admin/financials')
    revalidatePath('/admin/financials/operations')
    revalidatePath(`/admin/financials/operations/invoices/${request.invoice_id}`)
    revalidatePath(`/admin/financials/operations/invoices/${request.invoice_id}/refunds/${request.id}`)
    return { id: request.id, invoiceId: request.invoice_id }
  },
})
