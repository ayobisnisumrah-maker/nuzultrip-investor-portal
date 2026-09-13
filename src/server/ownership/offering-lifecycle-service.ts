import type { SupabaseClient } from '@supabase/supabase-js'

import type { OwnershipOffering, OwnershipOfferingStatus } from './offering-service'

type DbClient = SupabaseClient

type RpcOfferingRow = Omit<OwnershipOffering, 'unit_price'> & {
  unit_price: number | string
}

function mapRpcOffering(row: RpcOfferingRow): OwnershipOffering {
  return {
    ...row,
    unit_price: Number(row.unit_price),
  }
}

async function transitionOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  targetStatus: OwnershipOfferingStatus,
): Promise<OwnershipOffering> {
  const { data, error } = await supabase.schema('app').rpc('transition_ownership_offering', {
    p_offering_id: offeringId,
    p_target_status: targetStatus,
  })

  if (error) {
    throw new Error(`Gagal mengubah lifecycle penawaran kepemilikan: ${error.message}`)
  }

  const raw = Array.isArray(data) ? data[0] : data
  if (!raw || typeof raw !== 'object') {
    throw new Error('Lifecycle penawaran tidak mengembalikan data penawaran yang valid.')
  }

  return mapRpcOffering(raw as RpcOfferingRow)
}

export async function publishOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  void updatedBy
  return await transitionOwnershipOffering(supabase, offeringId, 'open')
}

export async function pauseOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  void updatedBy
  return await transitionOwnershipOffering(supabase, offeringId, 'paused')
}

export async function resumeOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  void updatedBy
  return await transitionOwnershipOffering(supabase, offeringId, 'open')
}

export async function closeOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  void updatedBy
  return await transitionOwnershipOffering(supabase, offeringId, 'closed')
}

export async function archiveOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  void updatedBy
  return await transitionOwnershipOffering(supabase, offeringId, 'archived')
}
