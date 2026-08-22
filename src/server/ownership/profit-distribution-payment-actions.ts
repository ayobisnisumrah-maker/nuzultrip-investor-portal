'use server'

import { z } from 'zod'

import { ForbiddenError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

import {
  markProfitDistributionAllocationPaid,
  refreshProfitDistributionPaidStatus,
} from './profit-distribution-service'

const markPaidSchema = z.object({
  allocationId: z.uuid('Allocation pembayaran tidak valid.'),
  paymentReference: z
    .string()
    .trim()
    .max(200, 'Referensi pembayaran terlalu panjang.')
    .nullable()
    .optional(),
})

export const markProfitDistributionAllocationPaidAction = defineAction({
  access: {
    permission: 'profit_distribution_payments.mark_paid',
  },

  input: markPaidSchema,

  audit: {
    action: 'profit_distribution_payment.mark_paid',
    entityType: 'profit_distribution_allocation',
  },

  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const paymentReference = input.paymentReference?.trim() || null

    const allocation = await markProfitDistributionAllocationPaid(
      supabase,
      input.allocationId,
      paymentReference,
    )

    audit({
      entityId: allocation.id,
      summary: 'Pembayaran distribusi bagi hasil ditandai sebagai paid.',
      changes: {
        status: {
          before: 'payable',
          after: 'paid',
        },
        payment_reference: {
          before: null,
          after: allocation.payment_reference,
        },
        paid_at: {
          before: null,
          after: allocation.paid_at,
        },
      },
    })

    const distribution = await refreshProfitDistributionPaidStatus(
      supabase,
      allocation.distribution_id,
      principal.adminId,
    )

    return {
      allocation,
      distribution,
    }
  },
})
