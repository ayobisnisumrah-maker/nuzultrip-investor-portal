'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import type { Database, Json } from '@/types/database'

const lineItemSchema = z.object({
  statement: z.enum(['income', 'balance', 'cash_flow', 'changes_in_equity']),
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
  lineKey: z.string().trim().regex(/^[a-z][a-z0-9_]*$/).max(80),
  label: z.string().trim().min(1).max(200),
  amount: z.number().finite().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  note: z.string().trim().max(1000).optional(),
})

const kpiSchema = z.object({
  kpiKey: z.string().trim().regex(/^[a-z][a-z0-9_]*$/).max(80),
  label: z.string().trim().min(1).max(200),
  value: z.number().finite().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  unit: z.enum(['ratio', 'percent', 'currency', 'count', 'days']),
  basis: z.enum(['reported', 'derived']),
})

const disclosureSchema = z.object({
  disclosureKey: z.string().trim().regex(/^[a-z][a-z0-9_]*$/).max(80),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
})

const schema = z.object({
  reportId: z.uuid(),
  documentAssetId: z.uuid().nullable(),
  lineItems: z.array(lineItemSchema).max(250),
  kpis: z.array(kpiSchema).max(100),
  accountingFramework: z.enum(['sak_ep', 'sak_indonesia', 'other']).nullable(),
  basisOfPreparation: z.string().trim().max(10000),
  disclosures: z.array(disclosureSchema).max(100),
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

export const saveFinancialReportingFoundation = defineAction({
  access: { permission: 'financial_reports.update' },
  input: schema,
  audit: { action: 'financial_report.reporting_foundation_updated', entityType: 'financial_report' },
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
    const disclosures = input.disclosures.map((item, position) => ({
      disclosure_key: item.disclosureKey,
      title: item.title,
      content: item.content,
      position,
    }))

    const { data, error } = await appRpcClient(supabase).rpc(
      'save_financial_report_draft_content',
      {
        p_report_id: input.reportId,
        p_document_asset_id: input.documentAssetId,
        p_line_items: lineItems,
        p_kpis: kpis,
        p_accounting_framework: input.accountingFramework,
        p_basis_of_preparation: input.basisOfPreparation.trim(),
        p_disclosures: disclosures,
      },
    )

    if (error) {
      throw new ConflictError(
        `Failed to save Indonesian reporting foundation: ${error.message}`,
        'Isi laporan belum dapat disimpan. Pastikan laporan masih draft, seluruh angka valid, dan data CALK lengkap.',
      )
    }

    const first = Array.isArray(data) ? data[0] : data
    const row = first && typeof first === 'object' ? (first as Record<string, unknown>) : null

    audit({
      entityId: input.reportId,
      summary: `Snapshot laporan diperbarui: ${lineItems.length} pos, ${kpis.length} KPI, ${disclosures.length} CALK.`,
      changes: {
        lineItemCount: { before: null, after: lineItems.length },
        kpiCount: { before: null, after: kpis.length },
        disclosureCount: { before: null, after: disclosures.length },
        accountingFramework: { before: null, after: input.accountingFramework ?? 'undeclared' },
        attachment: { before: null, after: input.documentAssetId ? 'attached' : 'none' },
      },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/financials')
    revalidatePath('/admin/financials/reports')
    revalidatePath(`/admin/financials/reports/${input.reportId}`)
    revalidatePath('/investor')
    revalidatePath('/investor/financials')

    return {
      reportId: input.reportId,
      lineItemCount:
        typeof row?.line_item_count === 'number' ? row.line_item_count : lineItems.length,
      kpiCount: typeof row?.kpi_count === 'number' ? row.kpi_count : kpis.length,
      disclosureCount:
        typeof row?.disclosure_count === 'number' ? row.disclosure_count : disclosures.length,
    }
  },
})
