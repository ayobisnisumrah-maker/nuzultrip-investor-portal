'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import { buildTransactionFinancialReport } from '@/server/financials/transaction-report-service'
import type { Database, Json } from '@/types/database'

const createSchema = z.object({
  financialPeriodId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(1000).optional(),
  visibility: z.enum(['investors', 'internal']).default('investors'),
  source: z.enum(['internal', 'reviewed', 'audited']).default('internal'),
  preparedBy: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
})

const transitionSchema = z.object({ reportId: z.uuid() })
const syncSchema = z.object({ reportId: z.uuid() })

const lineItemSchema = z.object({
  statement: z.enum(['income', 'balance', 'cash_flow']),
  category: z.enum([
    'revenue',
    'expense',
    'asset',
    'liability',
    'equity',
    'operating',
    'investing',
    'financing',
  ]),
  lineKey: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(80),
  label: z.string().trim().min(1).max(200),
  amount: z.number().finite().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/),
  note: z.string().trim().max(1000).optional(),
})

const kpiSchema = z.object({
  kpiKey: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(80),
  label: z.string().trim().min(1).max(200),
  value: z.number().finite().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  unit: z.enum(['ratio', 'percent', 'currency', 'count', 'days']),
  basis: z.enum(['reported', 'derived']),
})

const saveContentSchema = z.object({
  reportId: z.uuid(),
  documentAssetId: z.uuid().nullable(),
  lineItems: z.array(lineItemSchema).max(200),
  kpis: z.array(kpiSchema).max(100),
})

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, Json | undefined>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function appRpcClient(supabase: SupabaseClient<Database>) {
  return supabase.schema('app') as unknown as AppRpcClient
}

function firstRow(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function toRpcContent(
  generated: Awaited<ReturnType<typeof buildTransactionFinancialReport>>,
) {
  return {
    lineItems: generated.lineItems.map((item, position) => ({
      statement: item.statement,
      category: item.category,
      line_key: item.lineKey,
      label: item.label,
      amount: item.amount,
      currency: item.currency,
      position,
      note: item.note?.trim() || null,
    })),
    kpis: generated.kpis.map((item, position) => ({
      kpi_key: item.kpiKey,
      label: item.label,
      value: item.value,
      unit: item.unit,
      basis: item.basis,
      position,
    })),
  }
}

async function saveGeneratedContent(
  supabase: SupabaseClient<Database>,
  reportId: string,
  documentAssetId: string | null,
  generated: Awaited<ReturnType<typeof buildTransactionFinancialReport>>,
) {
  const content = toRpcContent(generated)
  return appRpcClient(supabase).rpc('save_financial_report_draft_content', {
    p_report_id: reportId,
    p_document_asset_id: documentAssetId,
    p_line_items: content.lineItems,
    p_kpis: content.kpis,
  })
}

export const createFinancialReport = defineAction({
  access: { permission: 'financial_reports.create' },
  input: createSchema,
  audit: { action: 'financial_report.created', entityType: 'financial_report' },
  handler: async ({ input, principal, supabase, audit }) => {
    const { data, error } = await appRpcClient(supabase).rpc('create_financial_report_with_draft', {
      p_financial_period_id: input.financialPeriodId,
      p_title: input.title,
      p_summary: input.summary?.trim() || null,
      p_visibility: input.visibility,
      p_source: input.source,
      p_prepared_by: input.preparedBy?.trim() || null,
      p_notes: input.notes?.trim() || null,
    })

    if (error) {
      throw new ConflictError(
        `Failed to create financial report: ${error.message}`,
        'Laporan keuangan tidak dapat dibuat saat ini.',
      )
    }

    const row = firstRow(data)
    const reportId = typeof row?.report_id === 'string' ? row.report_id : null
    if (!reportId) {
      throw new ConflictError(
        'Financial report creation returned no id.',
        'Laporan keuangan tidak dapat dibuat saat ini.',
      )
    }

    let generatedFromTransactions = false
    if (principal.kind === 'admin' && principal.permissions.has('financial_reports.update')) {
      try {
        const generated = await buildTransactionFinancialReport(supabase, input.financialPeriodId)
        const generatedResult = await saveGeneratedContent(supabase, reportId, null, generated)
        generatedFromTransactions = !generatedResult.error
      } catch {
        generatedFromTransactions = false
      }
    }

    audit({
      entityId: reportId,
      summary: generatedFromTransactions
        ? `Laporan keuangan ${input.title} dibuat sebagai draft dan diisi otomatis dari transaksi.`
        : `Laporan keuangan ${input.title} dibuat sebagai draft.`,
      changes: {
        status: { before: null, after: 'draft' },
        transactionSync: { before: null, after: generatedFromTransactions ? 'generated' : 'not_generated' },
      },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/financials')
    revalidatePath('/admin/financials/reports')
    return { reportId, generatedFromTransactions }
  },
})

export const saveFinancialReportContent = defineAction({
  access: { permission: 'financial_reports.update' },
  input: saveContentSchema,
  audit: { action: 'financial_report.content_updated', entityType: 'financial_report' },
  handler: async ({ input, supabase, audit }) => {
    const lineItems = input.lineItems.map((item, position) => ({
      statement: item.statement,
      category: item.category,
      line_key: item.lineKey,
      label: item.label,
      amount: item.amount,
      currency: item.currency,
      position,
      note: item.note?.trim() || null,
    }))
    const kpis = input.kpis.map((item, position) => ({
      kpi_key: item.kpiKey,
      label: item.label,
      value: item.value,
      unit: item.unit,
      basis: item.basis,
      position,
    }))

    const { error } = await appRpcClient(supabase).rpc('save_financial_report_draft_content', {
      p_report_id: input.reportId,
      p_document_asset_id: input.documentAssetId,
      p_line_items: lineItems,
      p_kpis: kpis,
    })

    if (error) {
      throw new ConflictError(
        `Failed to save financial report content: ${error.message}`,
        'Isi laporan tidak dapat disimpan. Pastikan laporan masih berstatus draft dan semua data valid.',
      )
    }

    audit({
      entityId: input.reportId,
      summary: `Isi laporan diperbarui: ${lineItems.length} pos, ${kpis.length} KPI.`,
      changes: {
        lineItemCount: { before: null, after: lineItems.length },
        kpiCount: { before: null, after: kpis.length },
        attachment: { before: null, after: input.documentAssetId ? 'attached' : 'none' },
      },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/financials')
    revalidatePath('/admin/financials/reports')
    revalidatePath(`/admin/financials/reports/${input.reportId}`)
    return { reportId: input.reportId, lineItemCount: lineItems.length, kpiCount: kpis.length }
  },
})

export const syncFinancialReportFromTransactions = defineAction({
  access: { permission: 'financial_reports.update' },
  input: syncSchema,
  audit: { action: 'financial_report.transaction_sync', entityType: 'financial_report' },
  handler: async ({ input, supabase, audit }) => {
    const { data: report, error: reportError } = await supabase
      .from('financial_reports')
      .select('id,financial_period_id,current_version_id,status')
      .eq('id', input.reportId)
      .maybeSingle()

    if (reportError || !report || report.status !== 'draft' || !report.current_version_id) {
      throw new ConflictError(
        'Financial report is not an editable draft.',
        'Sinkronisasi hanya dapat dilakukan pada laporan yang masih berstatus draft.',
      )
    }

    const { data: version, error: versionError } = await supabase
      .from('financial_report_versions')
      .select('document_asset_id,status')
      .eq('id', report.current_version_id)
      .maybeSingle()

    if (versionError || !version || version.status !== 'draft') {
      throw new ConflictError(
        'Financial report current version is not editable.',
        'Versi aktif laporan tidak dapat disinkronkan saat ini.',
      )
    }

    const generated = await buildTransactionFinancialReport(supabase, report.financial_period_id)
    const { error } = await saveGeneratedContent(
      supabase,
      report.id,
      version.document_asset_id,
      generated,
    )

    if (error) {
      throw new ConflictError(
        `Failed to synchronize financial report: ${error.message}`,
        'Data transaksi belum dapat disinkronkan ke laporan keuangan.',
      )
    }

    audit({
      entityId: report.id,
      summary: `Draft laporan disinkronkan dari transaksi: ${generated.totals.invoiceCount} invoice, ${generated.totals.pax} pax.`,
      changes: {
        grossRevenue: { before: null, after: generated.totals.grossRevenue },
        cashIn: { before: null, after: generated.totals.cashIn },
        cashOut: { before: null, after: generated.totals.cashOut },
        netCashflow: { before: null, after: generated.totals.netCashflow },
        pax: { before: null, after: generated.totals.pax },
      },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/financials')
    revalidatePath('/admin/financials/reports')
    revalidatePath(`/admin/financials/reports/${report.id}`)
    revalidatePath('/investor')
    revalidatePath('/investor/financials')
    return { reportId: report.id, ...generated.totals }
  },
})

function transition(
  target: 'review' | 'approved' | 'published',
  permission:
    'financial_reports.review' | 'financial_reports.approve' | 'financial_reports.publish',
) {
  return defineAction({
    access: { permission },
    input: transitionSchema,
    audit: { action: `financial_report.${target}`, entityType: 'financial_report' },
    handler: async ({ input, supabase, audit }) => {
      const { data, error } = await appRpcClient(supabase).rpc('transition_financial_report', {
        p_report_id: input.reportId,
        p_target: target,
      })
      if (error) {
        throw new ConflictError(
          `Failed to transition financial report: ${error.message}`,
          target === 'review'
            ? 'Laporan belum dapat ditinjau. Simpan minimal satu pos keuangan, satu KPI, dan satu lampiran terlebih dahulu.'
            : 'Status laporan keuangan tidak dapat diperbarui saat ini.',
        )
      }
      const row = firstRow(data)
      audit({
        entityId: input.reportId,
        summary: `Status laporan keuangan berubah menjadi ${target}.`,
        changes: {
          status: {
            before: typeof row?.previous_status === 'string' ? row.previous_status : null,
            after: target,
          },
        },
      })
      revalidatePath('/admin/financials')
      revalidatePath('/admin/financials/reports')
      revalidatePath(`/admin/financials/reports/${input.reportId}`)
      revalidatePath('/investor')
      revalidatePath('/investor/financials')
      return { reportId: input.reportId, status: target }
    },
  })
}

export const submitFinancialReportForReview = transition('review', 'financial_reports.review')
export const approveFinancialReport = transition('approved', 'financial_reports.approve')
export const publishFinancialReport = transition('published', 'financial_reports.publish')
