'use server'

import { revalidatePath } from 'next/cache'

import {
  createOwnershipHolding,
  getOwnershipHolding,
  listOwnershipHoldings,
  type CreateOwnershipHoldingInput,
} from '@/server/ownership/holding-service'

import {
  defineAction,
  requirePermission,
} from '@/server/auth/guards'

import { z } from 'zod'

const holdingIdSchema = z.object({
  holdingId: z.uuid(),
})

const createOwnershipHoldingSchema = z.object({
  offering_id: z.uuid(),
  investor_id: z.uuid(),
  units: z.number().int().positive(),
  acquisition_reference: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(5000).optional(),
})

export const listOwnershipHoldingsAction = defineAction({
  access: { permission: 'ownership.view' },
  handler: async ({ supabase }) => {
    return await listOwnershipHoldings(supabase)
  },
})

export const getOwnershipHoldingAction = defineAction({
  access: { permission: 'ownership.view' },
  input: holdingIdSchema,
  handler: async ({ supabase, input }) => {
    return await getOwnershipHolding(supabase, input.holdingId)
  },
})

export const createOwnershipHoldingAction = defineAction({
  access: { permission: 'ownership.create' },
  input: createOwnershipHoldingSchema,
  audit: {
    action: 'ownership.create',
    entityType: 'ownership_holding',
    summary: 'Membuat alokasi kepemilikan investor.',
  },
  handler: async ({ principal, supabase, input, audit }) => {
    const admin = requirePermission(principal, 'ownership.create')

    const holding = await createOwnershipHolding(supabase, {
      ...input,
      created_by: admin.userId,
    } satisfies CreateOwnershipHoldingInput)

    audit({
      entityId: holding.id,
      summary: 'Alokasi kepemilikan investor berhasil dibuat.',
    })

    revalidatePath('/admin/ownership')
    revalidatePath('/admin/ownership/holdings')

    return holding
  },
})

