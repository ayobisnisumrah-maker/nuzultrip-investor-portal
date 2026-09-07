'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { listOwnershipHoldings, getOwnershipHolding } from '@/server/ownership/holding-service'
import { defineAction, requirePermission } from '@/server/auth/guards'
import type { Database } from '@/types/database'

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

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, string | number | null>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function appRpcClient(supabase: SupabaseClient<Database>) {
  return supabase.schema('app') as unknown as AppRpcClient
}

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
    requirePermission(principal, 'ownership.create')

    const { data, error } = await appRpcClient(supabase).rpc('allocate_ownership_holding', {
      p_offering_id: input.offering_id,
      p_investor_id: input.investor_id,
      p_units: input.units,
      p_acquisition_reference: input.acquisition_reference?.trim() || null,
      p_notes: input.notes?.trim() || null,
    })

    if (error) {
      throw new Error(`Gagal membuat kepemilikan investor: ${error.message}`)
    }

    const holding = Array.isArray(data) ? data[0] : data
    const holdingId =
      holding && typeof holding === 'object' && 'id' in holding && typeof holding.id === 'string'
        ? holding.id
        : null

    audit({
      entityId: holdingId ?? input.investor_id,
      summary: 'Alokasi kepemilikan investor berhasil dibuat.',
      changes: {
        offeringId: { before: null, after: input.offering_id },
        investorId: { before: null, after: input.investor_id },
        units: { before: null, after: input.units },
      },
    })

    revalidatePath('/admin/ownership')
    revalidatePath(`/admin/ownership/offerings/${input.offering_id}`)
    revalidatePath(`/admin/ownership/offerings/${input.offering_id}/allocations`)
    revalidatePath('/investor')
    revalidatePath('/investor/ownership')

    return { id: holdingId, allocated: true }
  },
})
