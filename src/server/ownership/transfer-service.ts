import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

function appRpc(
  supabase: DbClient,
  name: string,
  args: Record<string, unknown>,
) {
  return (supabase.schema('app') as unknown as AppRpcClient).rpc(name, args)
}

function requireUuidResult(data: unknown, operation: string): string {
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error(
      `${operation} berhasil diproses tetapi ID hasil transaksi tidak tersedia.`,
    )
  }

  return data
}

export type OwnershipTransferStatus =
  Database['public']['Enums']['ownership_transfer_status']

export type OwnershipSaleTransfer = {
  id: string
  holding_id: string
  from_investor_id: string
  to_investor_id: string | null
  units: number
  requested_at: string
  eligible_at: string
  status: OwnershipTransferStatus
  requested_unit_price: number | null
  agreed_unit_price: number | null
  notes: string | null
  rejection_reason: string | null
  approved_at: string | null
  approved_by: string | null
  processing_at: string | null
  processing_by: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
}

export async function listInvestorSaleTransfers(
  supabase: DbClient,
): Promise<OwnershipSaleTransfer[]> {
  const { data, error } = await appRpc(
    supabase,
    'list_my_ownership_sales',
    {},
  )

  if (error) {
    throw new Error(
      `Gagal mengambil riwayat penjualan saham: ${error.message}`,
    )
  }

  return (Array.isArray(data) ? data : []) as OwnershipSaleTransfer[]
}

export async function listAdminSaleTransfers(
  supabase: DbClient,
): Promise<OwnershipSaleTransfer[]> {
  const { data, error } = await appRpc(
    supabase,
    'list_admin_ownership_sales',
    {},
  )

  if (error) {
    throw new Error(
      `Gagal mengambil daftar penjualan saham: ${error.message}`,
    )
  }

  return (Array.isArray(data) ? data : []) as OwnershipSaleTransfer[]
}

export async function createOwnershipSaleRequest(
  supabase: DbClient,
  input: {
    holdingId: string
    units: number
    requestedUnitPrice: number
    notes?: string | null
  },
): Promise<string> {
  const { data, error } = await appRpc(
    supabase,
    'create_ownership_sale_request',
    {
      p_holding_id: input.holdingId,
      p_units: input.units,
      p_requested_unit_price: input.requestedUnitPrice,
      p_notes: input.notes?.trim() || null,
    },
  )

  if (error) {
    throw new Error(
      `Gagal mengajukan penjualan saham: ${error.message}`,
    )
  }

  return requireUuidResult(data, 'Permintaan penjualan saham')
}

export async function cancelOwnershipSaleRequest(
  supabase: DbClient,
  transferId: string,
): Promise<void> {
  const { error } = await appRpc(
    supabase,
    'cancel_ownership_sale_request',
    {
      p_transfer_id: transferId,
    },
  )

  if (error) {
    throw new Error(
      `Gagal membatalkan penjualan saham: ${error.message}`,
    )
  }
}

export async function approveOwnershipSale(
  supabase: DbClient,
  transferId: string,
): Promise<void> {
  const { error } = await appRpc(
    supabase,
    'approve_ownership_sale',
    {
      p_transfer_id: transferId,
    },
  )

  if (error) {
    throw new Error(
      `Gagal menyetujui penjualan saham: ${error.message}`,
    )
  }
}

export async function rejectOwnershipSale(
  supabase: DbClient,
  input: {
    transferId: string
    reason: string
  },
): Promise<void> {
  const { error } = await appRpc(
    supabase,
    'reject_ownership_sale',
    {
      p_transfer_id: input.transferId,
      p_reason: input.reason.trim(),
    },
  )

  if (error) {
    throw new Error(
      `Gagal menolak penjualan saham: ${error.message}`,
    )
  }
}

export async function processOwnershipSale(
  supabase: DbClient,
  input: {
    transferId: string
    toInvestorId: string
    agreedUnitPrice: number
  },
): Promise<void> {
  const { error } = await appRpc(
    supabase,
    'process_ownership_sale',
    {
      p_transfer_id: input.transferId,
      p_to_investor_id: input.toInvestorId,
      p_agreed_unit_price: input.agreedUnitPrice,
    },
  )

  if (error) {
    throw new Error(
      `Gagal memproses penjualan saham: ${error.message}`,
    )
  }
}

export async function completeOwnershipSale(
  supabase: DbClient,
  transferId: string,
): Promise<string> {
  const { data, error } = await appRpc(
    supabase,
    'complete_ownership_sale',
    {
      p_transfer_id: transferId,
    },
  )

  if (error) {
    throw new Error(
      `Gagal menyelesaikan penjualan saham: ${error.message}`,
    )
  }

  return requireUuidResult(data, 'Penyelesaian penjualan saham')
}
