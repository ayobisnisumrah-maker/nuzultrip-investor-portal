'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { defineAction } from '@/server/auth/guards'
import {
  approveInheritance,
  cancelInheritance,
  completeInheritance,
  createInheritance,
  rejectInheritance,
} from '@/server/ownership/inheritance-service'

const createSchema = z.object({
  holdingId: z.uuid(),
  beneficiaryName: z.string().trim().min(2).max(200),
  beneficiaryEmail: z.string().email().optional().or(z.literal('')),
  beneficiaryPhone: z.string().trim().max(40).optional(),
  units: z.number().int().positive().optional(),
  notes: z.string().trim().max(5000).optional(),
})

const requestIdSchema = z.object({ requestId: z.uuid() })

const rejectSchema = z.object({
  requestId: z.uuid(),
  reason: z.string().trim().min(1).max(5000),
})

const completeSchema = z.object({
  requestId: z.uuid(),
  beneficiaryInvestorId: z.uuid(),
})

function revalidateInheritancePages() {
  revalidatePath('/investor')
  revalidatePath('/investor/ownership')
  revalidatePath('/investor/ownership/inheritance')
  revalidatePath('/admin')
  revalidatePath('/admin/ownership')
  revalidatePath('/admin/ownership/inheritance')
}

export const createInheritanceAction = defineAction({
  access: 'investor',
  input: createSchema,
  audit: {
    action: 'ownership_inheritance.create',
    entityType: 'ownership_inheritance',
    summary: 'Investor mengajukan pewarisan kepemilikan.',
  },
  handler: async ({ supabase, input, audit }) => {
    const requestId = await createInheritance(supabase, input)
    audit({
      entityId: requestId,
      summary: 'Pengajuan pewarisan kepemilikan berhasil dibuat.',
    })
    revalidateInheritancePages()
    return { requestId }
  },
})

export const cancelInheritanceAction = defineAction({
  access: 'investor',
  input: requestIdSchema,
  audit: {
    action: 'ownership_inheritance.cancel',
    entityType: 'ownership_inheritance',
    summary: 'Investor membatalkan pengajuan pewarisan kepemilikan.',
  },
  handler: async ({ supabase, input, audit }) => {
    await cancelInheritance(supabase, input.requestId)
    audit({
      entityId: input.requestId,
      summary: 'Pengajuan pewarisan kepemilikan dibatalkan.',
    })
    revalidateInheritancePages()
    return { requestId: input.requestId }
  },
})

export const approveInheritanceAction = defineAction({
  access: { permission: 'ownership_inheritance.approve' },
  input: requestIdSchema,
  audit: {
    action: 'ownership_inheritance.approve',
    entityType: 'ownership_inheritance',
    summary: 'Admin menyetujui pengajuan pewarisan kepemilikan.',
  },
  handler: async ({ supabase, input, audit }) => {
    await approveInheritance(supabase, input.requestId)
    audit({
      entityId: input.requestId,
      summary: 'Pengajuan pewarisan kepemilikan disetujui.',
    })
    revalidateInheritancePages()
    return { requestId: input.requestId }
  },
})

export const rejectInheritanceAction = defineAction({
  access: { permission: 'ownership_inheritance.approve' },
  input: rejectSchema,
  audit: {
    action: 'ownership_inheritance.reject',
    entityType: 'ownership_inheritance',
    summary: 'Admin menolak pengajuan pewarisan kepemilikan.',
  },
  handler: async ({ supabase, input, audit }) => {
    await rejectInheritance(supabase, input)
    audit({
      entityId: input.requestId,
      summary: 'Pengajuan pewarisan kepemilikan ditolak.',
    })
    revalidateInheritancePages()
    return { requestId: input.requestId }
  },
})

export const completeInheritanceAction = defineAction({
  access: { permission: 'ownership_inheritance.approve' },
  input: completeSchema,
  audit: {
    action: 'ownership_inheritance.complete',
    entityType: 'ownership_inheritance',
    summary: 'Admin menyelesaikan pewarisan kepemilikan.',
  },
  handler: async ({ supabase, input, audit }) => {
    const beneficiaryHoldingId = await completeInheritance(supabase, input)
    audit({
      entityId: input.requestId,
      summary: `Pewarisan kepemilikan selesai. Holding penerima: ${beneficiaryHoldingId}.`,
    })
    revalidateInheritancePages()
    return { requestId: input.requestId, beneficiaryHoldingId }
  },
})
