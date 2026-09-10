'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import type { Database } from '@/types/database'

const createSchema = z
  .object({
    offeringId: z.uuid(),
    financialReportVersionId: z.uuid(),
    companyShareBps: z.number().int().min(0).max(10000),
    investorPoolBps: z.number().int().min(0).max(10000),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((value) => value.companyShareBps + value.investorPoolBps === 10000, {
    message: 'Porsi perusahaan dan pool investor harus berjumlah 100%.',
    path: ['investorPoolBps'],
  })

const distributionSchema = z.object({ distributionId: z.uuid() })

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, string | number | null>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function appRpcClient(supabase: SupabaseClient<Database>) {
  return supabase.schema('app') as unknown as AppRpcClient
}

function rowFrom(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export const createProfitDistributionAction = defineAction({
  access: { permission: 'profit_distributions.create' },
  input: createSchema,
  audit: { action: 'profit_distribution.created', entityType: 'profit_distribution' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpcClient(supabase).rpc('create_profit_distribution', {
      p_offering_id: input.offeringId,
      p_financial_report_version_id: input.financialReportVersionId,
      p_company_share_bps: input.companyShareBps,
      p_investor_pool_bps: input.investorPoolBps,
      p_notes: input.notes?.trim() || null,
    })
    if (error) {
      throw new ConflictError(
        `Failed to create profit distribution: ${error.message}`,
        error.message.includes('overlaps')
          ? 'Periode distribusi bertumpang tindih dengan distribusi lain pada penawaran yang sama.'
          : 'Distribusi bagi hasil tidak dapat dibuat saat ini.',
      )
    }
    const row = rowFrom(data)
    const distributionId = typeof row?.id === 'string' ? row.id : null
    if (!distributionId)
      throw new ConflictError(
        'Distribution RPC returned no id.',
        'Distribusi bagi hasil tidak dapat dibuat saat ini.',
      )
    audit({
      entityId: distributionId,
      summary: 'Distribusi bagi hasil dibuat sebagai draft.',
      changes: { status: { before: null, after: 'draft' } },
    })
    revalidatePath('/admin/profit-distributions')
    return { distributionId }
  },
})

export const regenerateProfitDistributionAllocationsAction = defineAction({
  access: { permission: 'profit_distributions.update' },
  input: distributionSchema,
  audit: {
    action: 'profit_distribution.allocations_regenerated',
    entityType: 'profit_distribution',
  },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await appRpcClient(supabase).rpc(
      'regenerate_profit_distribution_allocations',
      {
        p_distribution_id: input.distributionId,
      },
    )
    if (error)
      throw new ConflictError(
        `Failed to regenerate allocations: ${error.message}`,
        'Allocation investor tidak dapat dihitung saat ini.',
      )
    const count = Array.isArray(data) ? data.length : data ? 1 : 0
    audit({
      entityId: input.distributionId,
      summary: `${count} allocation investor dihitung ulang.`,
    })
    revalidatePath('/admin/profit-distributions')
    revalidatePath(`/admin/profit-distributions/${input.distributionId}`)
    return { count }
  },
})

function transition(
  target: 'review' | 'approved' | 'payable',
  permission:
    'profit_distributions.update' | 'profit_distributions.approve' | 'profit_distributions.publish',
) {
  return defineAction({
    access: { permission },
    input: distributionSchema,
    audit: { action: `profit_distribution.${target}`, entityType: 'profit_distribution' },
    handler: async ({ input, supabase, audit }) => {
      const { data, error } = await appRpcClient(supabase).rpc('transition_profit_distribution', {
        p_distribution_id: input.distributionId,
        p_target: target,
      })
      if (error)
        throw new ConflictError(
          `Failed to transition distribution: ${error.message}`,
          'Status distribusi bagi hasil tidak dapat diperbarui saat ini.',
        )
      const row = rowFrom(data)
      audit({
        entityId: input.distributionId,
        summary: `Distribusi bagi hasil berubah menjadi ${target}.`,
      })
      revalidatePath('/admin/profit-distributions')
      revalidatePath(`/admin/profit-distributions/${input.distributionId}`)
      revalidatePath('/investor')
      revalidatePath('/investor/distributions')
      return {
        distributionId: input.distributionId,
        status: typeof row?.status === 'string' ? row.status : target,
      }
    },
  })
}

export const submitProfitDistributionForReviewAction = transition(
  'review',
  'profit_distributions.update',
)
export const approveProfitDistributionAction = transition(
  'approved',
  'profit_distributions.approve',
)
export const publishProfitDistributionAction = transition('payable', 'profit_distributions.publish')
