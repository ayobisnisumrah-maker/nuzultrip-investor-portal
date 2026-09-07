'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { ConflictError, ForbiddenError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import type { Database } from '@/types/database'

const markPaidSchema = z.object({
  allocationId: z.uuid('Allocation pembayaran tidak valid.'),
  paymentReference: z
    .string()
    .trim()
    .max(200, 'Referensi pembayaran terlalu panjang.')
    .nullable()
    .optional(),
})

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, string | null>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function appRpcClient(supabase: SupabaseClient<Database>) {
  return supabase.schema('app') as unknown as AppRpcClient
}

export const markProfitDistributionAllocationPaidAction = defineAction({
  access: { permission: 'profit_distribution_payments.mark_paid' },
  input: markPaidSchema,
  audit: {
    action: 'profit_distribution_payment.mark_paid',
    entityType: 'profit_distribution_allocation',
  },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data, error } = await appRpcClient(supabase).rpc(
      'mark_profit_distribution_allocation_paid',
      {
        p_allocation_id: input.allocationId,
        p_payment_reference: input.paymentReference?.trim() || null,
      },
    )

    if (error) {
      throw new ConflictError(
        `Failed to mark distribution allocation paid: ${error.message}`,
        error.message.includes('Payment proof is required')
          ? 'Unggah bukti pembayaran sebelum menandai pembayaran sebagai paid.'
          : 'Pembayaran bagi hasil tidak dapat ditandai paid saat ini.',
      )
    }

    const result = Array.isArray(data) ? data[0] : data
    const row = result && typeof result === 'object' ? (result as Record<string, unknown>) : null
    const distributionId = typeof row?.distribution_id === 'string' ? row.distribution_id : null
    const distributionStatus =
      typeof row?.distribution_status === 'string' ? row.distribution_status : 'payable'

    audit({
      entityId: input.allocationId,
      summary: 'Pembayaran distribusi bagi hasil ditandai sebagai paid.',
      changes: {
        status: { before: 'payable', after: 'paid' },
        payment_reference: { before: null, after: input.paymentReference?.trim() || null },
      },
    })

    return {
      allocationId: input.allocationId,
      distributionId,
      allocationStatus: 'paid' as const,
      distributionStatus,
    }
  },
})
