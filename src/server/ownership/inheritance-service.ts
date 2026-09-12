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
    throw new Error(`${operation} berhasil diproses tetapi ID hasil tidak tersedia.`)
  }
  return data
}

export type OwnershipInheritanceStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'

export type InheritanceRequest = {
  id: string
  holding_id: string
  current_investor_id: string
  beneficiary_investor_id: string | null
  beneficiary_name: string
  beneficiary_email: string | null
  beneficiary_phone: string | null
  units: number
  status: OwnershipInheritanceStatus
  requested_at: string
  approved_at: string | null
  approved_by: string | null
  completed_at: string | null
  completed_by: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function listMyInheritance(
  supabase: DbClient,
): Promise<InheritanceRequest[]> {
  const { data, error } = await appRpc(
    supabase,
    'list_my_ownership_inheritance',
    {},
  )
  if (error) throw new Error(`Gagal mengambil pengajuan pewaris: ${error.message}`)
  return (Array.isArray(data) ? data : []) as InheritanceRequest[]
}

export async function listAdminInheritance(
  supabase: DbClient,
): Promise<InheritanceRequest[]> {
  const { data, error } = await appRpc(
    supabase,
    'list_admin_ownership_inheritance',
    {},
  )
  if (error) throw new Error(`Gagal mengambil daftar pewarisan: ${error.message}`)
  return (Array.isArray(data) ? data : []) as InheritanceRequest[]
}

export async function createInheritance(
  supabase: DbClient,
  input: {
    holdingId: string
    beneficiaryName: string
    beneficiaryEmail?: string
    beneficiaryPhone?: string
    units?: number
    notes?: string
  },
): Promise<string> {
  const { data, error } = await appRpc(
    supabase,
    'create_ownership_inheritance_request',
    {
      p_holding_id: input.holdingId,
      p_beneficiary_name: input.beneficiaryName,
      p_beneficiary_email: input.beneficiaryEmail?.trim() || null,
      p_beneficiary_phone: input.beneficiaryPhone?.trim() || null,
      p_units: input.units ?? null,
      p_notes: input.notes?.trim() || null,
    },
  )
  if (error) throw new Error(`Gagal mengajukan pewaris: ${error.message}`)
  return requireUuidResult(data, 'Pengajuan pewarisan')
}

export async function cancelInheritance(
  supabase: DbClient,
  requestId: string,
): Promise<void> {
  const { error } = await appRpc(
    supabase,
    'cancel_ownership_inheritance_request',
    { p_request_id: requestId },
  )
  if (error) throw new Error(`Gagal membatalkan pengajuan pewaris: ${error.message}`)
}

export async function approveInheritance(
  supabase: DbClient,
  requestId: string,
): Promise<void> {
  const { error } = await appRpc(
    supabase,
    'approve_ownership_inheritance',
    { p_request_id: requestId },
  )
  if (error) throw new Error(`Gagal menyetujui pewarisan: ${error.message}`)
}

export async function rejectInheritance(
  supabase: DbClient,
  input: { requestId: string; reason: string },
): Promise<void> {
  const { error } = await appRpc(
    supabase,
    'reject_ownership_inheritance',
    { p_request_id: input.requestId, p_reason: input.reason.trim() },
  )
  if (error) throw new Error(`Gagal menolak pewarisan: ${error.message}`)
}

export async function completeInheritance(
  supabase: DbClient,
  input: { requestId: string; beneficiaryInvestorId: string },
): Promise<string> {
  const { data, error } = await appRpc(
    supabase,
    'complete_ownership_inheritance',
    {
      p_request_id: input.requestId,
      p_beneficiary_investor_id: input.beneficiaryInvestorId,
    },
  )
  if (error) throw new Error(`Gagal menyelesaikan pewarisan: ${error.message}`)
  return requireUuidResult(data, 'Penyelesaian pewarisan')
}
