'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import type { Permission } from '@/core/rbac/permissions'
import { defineAction } from '@/server/auth/guards'
import {
  approveOwnershipSale,
  cancelOwnershipSaleRequest,
  completeOwnershipSale,
  createOwnershipSaleRequest,
  processOwnershipSale,
  rejectOwnershipSale,
} from '@/server/ownership/transfer-service'

const transferIdSchema = z.object({
  transferId: z.uuid(),
})

const createSaleSchema = z.object({
  holdingId: z.uuid(),
  units: z.number().int().positive(),
  requestedUnitPrice: z.number().positive(),
  notes: z.string().trim().max(5000).optional(),
})

const rejectSaleSchema = z.object({
  transferId: z.uuid(),
  reason: z.string().trim().min(1).max(5000),
})

const processSaleSchema = z.object({
  transferId: z.uuid(),
  toInvestorId: z.uuid(),
  agreedUnitPrice: z.number().positive(),
})

function revalidateOwnershipPages() {
  revalidatePath('/investor')
  revalidatePath('/investor/ownership')
  revalidatePath('/admin')
  revalidatePath('/admin/ownership')
  revalidatePath('/admin/ownership/transfers')
}

export const createOwnershipSaleRequestAction = defineAction({
  access: 'investor',
  input: createSaleSchema,
  audit: {
    action: 'ownership_sale.create',
    entityType: 'ownership_transfer',
    summary: 'Investor mengajukan penjualan saham.',
  },
  handler: async ({ supabase, input, audit }) => {
    const transferId = await createOwnershipSaleRequest(supabase, input)

    audit({
      entityId: transferId,
      summary: 'Permintaan penjualan saham berhasil dibuat.',
    })

    revalidateOwnershipPages()

    return { transferId }
  },
})

export const cancelOwnershipSaleRequestAction = defineAction({
  access: 'investor',
  input: transferIdSchema,
  audit: {
    action: 'ownership_sale.cancel',
    entityType: 'ownership_transfer',
    summary: 'Investor membatalkan penjualan saham.',
  },
  handler: async ({ supabase, input, audit }) => {
    await cancelOwnershipSaleRequest(supabase, input.transferId)

    audit({
      entityId: input.transferId,
      summary: 'Permintaan penjualan saham dibatalkan.',
    })

    revalidateOwnershipPages()

    return { transferId: input.transferId }
  },
})

export const approveOwnershipSaleAction = defineAction({
  access: { permission: 'ownership_transfers.approve' },
  input: transferIdSchema,
  audit: {
    action: 'ownership_sale.approve',
    entityType: 'ownership_transfer',
    summary: 'Admin menyetujui penjualan saham.',
  },
  handler: async ({ supabase, input, audit }) => {
    await approveOwnershipSale(supabase, input.transferId)

    audit({
      entityId: input.transferId,
      summary: 'Penjualan saham disetujui.',
    })

    revalidateOwnershipPages()

    return { transferId: input.transferId }
  },
})

export const rejectOwnershipSaleAction = defineAction({
  access: { permission: 'ownership_transfers.reject' },
  input: rejectSaleSchema,
  audit: {
    action: 'ownership_sale.reject',
    entityType: 'ownership_transfer',
    summary: 'Admin menolak penjualan saham.',
  },
  handler: async ({ supabase, input, audit }) => {
    await rejectOwnershipSale(supabase, input)

    audit({
      entityId: input.transferId,
      summary: 'Penjualan saham ditolak.',
    })

    revalidateOwnershipPages()

    return { transferId: input.transferId }
  },
})

export const processOwnershipSaleAction = defineAction({
  access: { permission: 'ownership_transfers.process' as Permission },
  input: processSaleSchema,
  audit: {
    action: 'ownership_sale.process',
    entityType: 'ownership_transfer',
    summary: 'Admin memproses penjualan saham.',
  },
  handler: async ({ supabase, input, audit }) => {
    await processOwnershipSale(supabase, input)

    audit({
      entityId: input.transferId,
      summary: 'Penjualan saham masuk tahap Dalam Proses.',
    })

    revalidateOwnershipPages()

    return { transferId: input.transferId }
  },
})

export const completeOwnershipSaleAction = defineAction({
  access: { permission: 'ownership_transfers.complete' as Permission },
  input: transferIdSchema,
  audit: {
    action: 'ownership_sale.complete',
    entityType: 'ownership_transfer',
    summary: 'Admin menyelesaikan penjualan saham.',
  },
  handler: async ({ supabase, input, audit }) => {
    const buyerHoldingId = await completeOwnershipSale(
      supabase,
      input.transferId,
    )

    audit({
      entityId: input.transferId,
      summary: `Penjualan saham selesai. Holding pembeli: ${buyerHoldingId}.`,
    })

    revalidateOwnershipPages()

    return {
      transferId: input.transferId,
      buyerHoldingId,
    }
  },
})
