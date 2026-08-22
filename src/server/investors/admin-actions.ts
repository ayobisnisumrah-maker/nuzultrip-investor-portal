'use server'

import { z } from 'zod'

import { canTransition } from '@/core/investors/status'
import { ConflictError, ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

const investorStatusSchema = z.object({
  investorId: z.string().uuid(),
})

const rejectInvestorSchema = z.object({
  investorId: z.string().uuid(),
  rejectionReason: z
    .string()
    .trim()
    .min(1, 'Alasan penolakan wajib diisi.')
    .max(2000, 'Alasan penolakan maksimal 2000 karakter.'),
})

type TargetStatus = 'under_review' | 'approved' | 'rejected' | 'active' | 'inactive'

async function transitionInvestor(
  investorId: string,
  targetStatus: TargetStatus,
  supabase: Parameters<Parameters<typeof defineAction>[0]['handler']>[0]['supabase'],
  rejectionReason?: string,
) {
  const { data: investor, error: readError } = await supabase
    .from('investors')
    .select('id, reference_code, status')
    .eq('id', investorId)
    .maybeSingle()

  if (readError) {
    throw new ConflictError(
      `Failed to read investor: ${readError.message}`,
      'Data investor tidak dapat dibaca saat ini.',
    )
  }

  if (!investor) {
    throw new NotFoundError('Investor')
  }

  const currentStatus = investor.status

  if (currentStatus === targetStatus) {
    throw new ConflictError(
      `Investor is already in status "${currentStatus}".`,
      'Investor sudah berada pada status tersebut.',
    )
  }

  if (!canTransition(currentStatus, targetStatus)) {
    throw new ForbiddenError(
      `Invalid investor status transition: ${currentStatus} -> ${targetStatus}.`,
      {
        from: currentStatus,
        to: targetStatus,
      },
    )
  }

  const { data: updated, error } = await supabase
    .from('investors')
    .update({
      status: targetStatus,
      rejection_reason: targetStatus === 'rejected' ? (rejectionReason ?? null) : null,
    })
    .eq('id', investor.id)
    .select('id, reference_code, status')
    .maybeSingle()

  if (error) {
    throw new ConflictError(
      `Failed to update investor status: ${error.message}`,
      'Status investor tidak dapat diperbarui. Periksa lifecycle investor dan coba lagi.',
    )
  }

  if (!updated) {
    throw new NotFoundError('Investor')
  }

  return {
    investorId: updated.id,
    referenceCode: updated.reference_code,
    previousStatus: currentStatus,
    status: updated.status,
  }
}

export const startInvestorReview = defineAction({
  access: {
    permission: 'investors.update',
  },
  input: investorStatusSchema,
  audit: {
    action: 'investor.review_started',
    entityType: 'investor',
  },
  handler: async ({ input, supabase, audit }) => {
    const result = await transitionInvestor(input.investorId, 'under_review', supabase)

    audit({
      entityId: result.investorId,
      summary: `Investor ${result.referenceCode} masuk tahap peninjauan.`,
      changes: {
        status: {
          before: result.previousStatus,
          after: result.status,
        },
      },
    })

    return result
  },
})

export const approveInvestor = defineAction({
  access: {
    permission: 'investors.approve',
  },
  input: investorStatusSchema,
  audit: {
    action: 'investor.approved',
    entityType: 'investor',
  },
  handler: async ({ input, supabase, audit }) => {
    const result = await transitionInvestor(input.investorId, 'approved', supabase)

    audit({
      entityId: result.investorId,
      summary: `Investor ${result.referenceCode} disetujui.`,
      changes: {
        status: {
          before: result.previousStatus,
          after: result.status,
        },
      },
    })

    return result
  },
})

export const rejectInvestor = defineAction({
  access: {
    permission: 'investors.reject',
  },
  input: rejectInvestorSchema,
  audit: {
    action: 'investor.rejected',
    entityType: 'investor',
  },
  handler: async ({ input, supabase, audit }) => {
    const result = await transitionInvestor(
      input.investorId,
      'rejected',
      supabase,
      input.rejectionReason,
    )

    audit({
      entityId: result.investorId,
      summary: `Investor ${result.referenceCode} ditolak.`,
      changes: {
        status: {
          before: result.previousStatus,
          after: result.status,
        },
      },
    })

    return result
  },
})

export const activateInvestor = defineAction({
  access: {
    permission: 'investors.update',
  },
  input: investorStatusSchema,
  audit: {
    action: 'investor.activated',
    entityType: 'investor',
  },
  handler: async ({ input, supabase, audit }) => {
    const result = await transitionInvestor(input.investorId, 'active', supabase)

    audit({
      entityId: result.investorId,
      summary: `Investor ${result.referenceCode} diaktifkan.`,
      changes: {
        status: {
          before: result.previousStatus,
          after: result.status,
        },
      },
    })

    return result
  },
})

export const deactivateInvestor = defineAction({
  access: {
    permission: 'investors.deactivate',
  },
  input: investorStatusSchema,
  audit: {
    action: 'investor.deactivated',
    entityType: 'investor',
  },
  handler: async ({ input, supabase, audit }) => {
    const result = await transitionInvestor(input.investorId, 'inactive', supabase)

    audit({
      entityId: result.investorId,
      summary: `Investor ${result.referenceCode} dinonaktifkan.`,
      changes: {
        status: {
          before: result.previousStatus,
          after: result.status,
        },
      },
    })

    return result
  },
})

export const reactivateInvestor = defineAction({
  access: {
    permission: 'investors.reactivate',
  },
  input: investorStatusSchema,
  audit: {
    action: 'investor.reactivated',
    entityType: 'investor',
  },
  handler: async ({ input, supabase, audit }) => {
    const result = await transitionInvestor(input.investorId, 'active', supabase)

    audit({
      entityId: result.investorId,
      summary: `Investor ${result.referenceCode} diaktifkan kembali.`,
      changes: {
        status: {
          before: result.previousStatus,
          after: result.status,
        },
      },
    })

    return result
  },
})
