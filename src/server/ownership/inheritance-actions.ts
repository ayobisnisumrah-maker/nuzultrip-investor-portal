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

// Lifecycle audit is written atomically by the database trigger
// ownership_inheritance_audit_lifecycle. Keeping audit out of the action avoids
// duplicate audit rows and prevents a post-RPC audit failure from misrepresenting
// an already-committed ownership mutation.
export const createInheritanceAction = defineAction({
  access: 'investor',
  input: createSchema,
  handler: async ({ supabase, input }) => {
    const requestId = await createInheritance(supabase, input)
    revalidateInheritancePages()
    return { requestId }
  },
})

export const cancelInheritanceAction = defineAction({
  access: 'investor',
  input: requestIdSchema,
  handler: async ({ supabase, input }) => {
    await cancelInheritance(supabase, input.requestId)
    revalidateInheritancePages()
    return { requestId: input.requestId }
  },
})

export const approveInheritanceAction = defineAction({
  access: { permission: 'ownership_inheritance.approve' },
  input: requestIdSchema,
  handler: async ({ supabase, input }) => {
    await approveInheritance(supabase, input.requestId)
    revalidateInheritancePages()
    return { requestId: input.requestId }
  },
})

export const rejectInheritanceAction = defineAction({
  access: { permission: 'ownership_inheritance.approve' },
  input: rejectSchema,
  handler: async ({ supabase, input }) => {
    await rejectInheritance(supabase, input)
    revalidateInheritancePages()
    return { requestId: input.requestId }
  },
})

export const completeInheritanceAction = defineAction({
  access: { permission: 'ownership_inheritance.approve' },
  input: completeSchema,
  handler: async ({ supabase, input }) => {
    const beneficiaryHoldingId = await completeInheritance(supabase, input)
    revalidateInheritancePages()
    return { requestId: input.requestId, beneficiaryHoldingId }
  },
})
