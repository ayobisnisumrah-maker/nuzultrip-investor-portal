'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import type { Database } from '@/types/database'

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

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, string | null>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function appRpcClient(supabase: SupabaseClient<Database>) {
  return supabase.schema('app') as unknown as AppRpcClient
}

function firstRow(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export const createFinancialReport = defineAction({
  access: { permission: 'financial_reports.create' },
  input: createSchema,
  audit: { action: 'financial_report.created', entityType: 'financial_report' },
  handler: async ({ input, supabase, audit }) => {
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

    audit({
      entityId: reportId,
      summary: `Laporan keuangan ${input.title} dibuat sebagai draft.`,
      changes: { status: { before: null, after: 'draft' } },
    })

    revalidatePath('/admin/financials')
    revalidatePath('/admin/financials/reports')
    return { reportId }
  },
})

function transition(target: 'review' | 'approved' | 'published', permission: 'financial_reports.review' | 'financial_reports.approve' | 'financial_reports.publish') {
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
          'Status laporan keuangan tidak dapat diperbarui saat ini.',
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
