import type { SupabaseClient } from '@supabase/supabase-js'

type DbClient = SupabaseClient

export type ProfitDistributionStatus =
  'draft' | 'review' | 'approved' | 'payable' | 'paid' | 'cancelled'

export type ProfitDistribution = {
  id: string
  offering_id: string
  period_start: string
  period_end: string
  revenue_amount: number
  opex_amount: number
  profit_amount: number
  company_share_bps: number
  investor_pool_bps: number
  investor_pool_amount: number
  status: ProfitDistributionStatus
  approved_at: string | null
  approved_by: string | null
  paid_at: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ProfitDistributionAllocation = {
  id: string
  distribution_id: string
  holding_id: string
  investor_id: string
  ownership_bps: number
  investor_pool_share_bps: number
  allocation_amount: number
  status: 'pending' | 'payable' | 'paid' | 'cancelled'
  paid_at: string | null
  payment_reference: string | null
  created_at: string
  updated_at: string
}

type ProfitDistributionRow = {
  id: string
  offering_id: string
  period_start: string
  period_end: string
  revenue_amount: number | string
  opex_amount: number | string
  profit_amount: number | string
  company_share_bps: number
  investor_pool_bps: number
  investor_pool_amount: number | string
  status: ProfitDistributionStatus
  approved_at: string | null
  approved_by: string | null
  paid_at: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

type AllocationRow = {
  id: string
  distribution_id: string
  holding_id: string
  investor_id: string
  ownership_bps: number
  investor_pool_share_bps: number
  allocation_amount: number | string
  status: 'pending' | 'payable' | 'paid' | 'cancelled'
  paid_at: string | null
  payment_reference: string | null
  created_at: string
  updated_at: string
}

type HoldingRow = {
  id: string
  offering_id: string
  investor_id: string
  units: number
  ownership_bps: number
  status: 'reserved' | 'active' | 'transferred' | 'cancelled'
}

const DISTRIBUTION_SELECT = `
  id,
  offering_id,
  period_start,
  period_end,
  revenue_amount,
  opex_amount,
  profit_amount,
  company_share_bps,
  investor_pool_bps,
  investor_pool_amount,
  status,
  approved_at,
  approved_by,
  paid_at,
  notes,
  created_by,
  updated_by,
  created_at,
  updated_at
`

const ALLOCATION_SELECT = `
  id,
  distribution_id,
  holding_id,
  investor_id,
  ownership_bps,
  investor_pool_share_bps,
  allocation_amount,
  status,
  paid_at,
  payment_reference,
  created_at,
  updated_at
`

function mapDistribution(row: ProfitDistributionRow): ProfitDistribution {
  return {
    id: row.id,
    offering_id: row.offering_id,
    period_start: row.period_start,
    period_end: row.period_end,
    revenue_amount: Number(row.revenue_amount),
    opex_amount: Number(row.opex_amount),
    profit_amount: Number(row.profit_amount),
    company_share_bps: row.company_share_bps,
    investor_pool_bps: row.investor_pool_bps,
    investor_pool_amount: Number(row.investor_pool_amount),
    status: row.status,
    approved_at: row.approved_at,
    approved_by: row.approved_by,
    paid_at: row.paid_at,
    notes: row.notes,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapAllocation(row: AllocationRow): ProfitDistributionAllocation {
  return {
    id: row.id,
    distribution_id: row.distribution_id,
    holding_id: row.holding_id,
    investor_id: row.investor_id,
    ownership_bps: row.ownership_bps,
    investor_pool_share_bps: row.investor_pool_share_bps,
    allocation_amount: Number(row.allocation_amount),
    status: row.status,
    paid_at: row.paid_at,
    payment_reference: row.payment_reference,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listProfitDistributions(supabase: DbClient): Promise<ProfitDistribution[]> {
  const { data, error } = await supabase
    .from('profit_distributions')
    .select(DISTRIBUTION_SELECT)
    .order('period_end', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal mengambil distribusi bagi hasil: ${error.message}`)
  }

  return ((data ?? []) as ProfitDistributionRow[]).map(mapDistribution)
}

export async function getProfitDistribution(
  supabase: DbClient,
  distributionId: string,
): Promise<ProfitDistribution | null> {
  const { data, error } = await supabase
    .from('profit_distributions')
    .select(DISTRIBUTION_SELECT)
    .eq('id', distributionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil distribusi bagi hasil: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return mapDistribution(data)
}

export async function listProfitDistributionAllocations(
  supabase: DbClient,
  distributionId: string,
): Promise<ProfitDistributionAllocation[]> {
  const { data, error } = await supabase
    .from('profit_distribution_allocations')
    .select(ALLOCATION_SELECT)
    .eq('distribution_id', distributionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Gagal mengambil allocation distribusi: ${error.message}`)
  }

  return ((data ?? []) as AllocationRow[]).map(mapAllocation)
}

export async function calculateInvestorPoolAmount(
  supabase: DbClient,
  distributionId: string,
): Promise<number> {
  const distribution = await getProfitDistribution(supabase, distributionId)

  if (!distribution) {
    throw new Error('Distribusi bagi hasil tidak ditemukan.')
  }

  return (distribution.profit_amount * distribution.investor_pool_bps) / 10_000
}

export async function generateProfitDistributionAllocations(
  supabase: DbClient,
  distributionId: string,
): Promise<ProfitDistributionAllocation[]> {
  const distribution = await getProfitDistribution(supabase, distributionId)

  if (!distribution) {
    throw new Error('Distribusi bagi hasil tidak ditemukan.')
  }

  if (distribution.status !== 'draft' && distribution.status !== 'review') {
    throw new Error(
      'Allocation hanya dapat dibuat atau dihitung ulang ketika distribusi masih draft atau review.',
    )
  }

  const investorPoolAmount = (distribution.profit_amount * distribution.investor_pool_bps) / 10_000

  const { error: updateDistributionError } = await supabase
    .from('profit_distributions')
    .update({
      investor_pool_amount: investorPoolAmount,
    })
    .eq('id', distribution.id)

  if (updateDistributionError) {
    throw new Error(`Gagal menyimpan investor pool: ${updateDistributionError.message}`)
  }

  /*
   * Allocation lama harus dihapus hanya apabila seluruh allocation
   * masih pending. Allocation yang sudah payable/paid tidak boleh
   * dihancurkan oleh proses generate ulang.
   */
  const existingAllocations = await listProfitDistributionAllocations(supabase, distribution.id)

  const hasLockedAllocation = existingAllocations.some(
    (allocation) => allocation.status === 'payable' || allocation.status === 'paid',
  )

  if (hasLockedAllocation) {
    throw new Error(
      'Allocation tidak dapat dibuat ulang karena sudah terdapat allocation payable atau paid.',
    )
  }

  if (existingAllocations.length > 0) {
    const { error: deleteError } = await supabase
      .from('profit_distribution_allocations')
      .delete()
      .eq('distribution_id', distribution.id)

    if (deleteError) {
      throw new Error(`Gagal membersihkan allocation lama: ${deleteError.message}`)
    }
  }

  if (investorPoolAmount <= 0) {
    return []
  }

  const { data: holdings, error: holdingsError } = await supabase
    .from('ownership_holdings')
    .select(
      `
          id,
          offering_id,
          investor_id,
          units,
          ownership_bps,
          status
        `,
    )
    .eq('offering_id', distribution.offering_id)
    .eq('status', 'active')
    .gt('ownership_bps', 0)
    .gt('units', 0)

  if (holdingsError) {
    throw new Error(`Gagal mengambil ownership holdings aktif: ${holdingsError.message}`)
  }

  const activeHoldings = (holdings ?? []) as HoldingRow[]

  if (activeHoldings.length === 0) {
    return []
  }

  const totalOwnershipBps = activeHoldings.reduce(
    (total, holding) => total + holding.ownership_bps,
    0,
  )

  if (totalOwnershipBps <= 0) {
    throw new Error('Total ownership investor aktif tidak valid.')
  }

  const rows = activeHoldings.map((holding) => {
    const investorPoolShareBps = Math.round((holding.ownership_bps * 10_000) / totalOwnershipBps)

    const allocationAmount = (investorPoolAmount * investorPoolShareBps) / 10_000

    return {
      distribution_id: distribution.id,
      holding_id: holding.id,
      investor_id: holding.investor_id,
      ownership_bps: holding.ownership_bps,
      investor_pool_share_bps: investorPoolShareBps,
      allocation_amount: allocationAmount,
      status: 'pending' as const,
    }
  })

  const { data, error } = await supabase
    .from('profit_distribution_allocations')
    .insert(rows)
    .select(ALLOCATION_SELECT)

  if (error) {
    throw new Error(`Gagal membuat allocation distribusi: ${error.message}`)
  }

  return ((data ?? []) as AllocationRow[]).map(mapAllocation)
}

export async function submitProfitDistributionForReview(
  supabase: DbClient,
  distributionId: string,
  updatedBy: string,
): Promise<ProfitDistribution> {
  const distribution = await getProfitDistribution(supabase, distributionId)

  if (!distribution) {
    throw new Error('Distribusi bagi hasil tidak ditemukan.')
  }

  if (distribution.status !== 'draft') {
    throw new Error('Hanya distribusi draft yang dapat diajukan untuk review.')
  }

  const allocations = await listProfitDistributionAllocations(supabase, distribution.id)

  if (distribution.profit_amount > 0 && allocations.length === 0) {
    throw new Error('Allocation investor belum dibuat.')
  }

  const { data, error } = await supabase
    .from('profit_distributions')
    .update({
      status: 'review',
      updated_by: updatedBy,
    })
    .eq('id', distribution.id)
    .eq('status', 'draft')
    .select(DISTRIBUTION_SELECT)
    .single()

  if (error || !data) {
    throw new Error(
      `Gagal mengajukan distribusi untuk review: ${error?.message ?? 'Distribusi tidak berubah.'}`,
    )
  }

  return mapDistribution(data)
}

export async function approveProfitDistribution(
  supabase: DbClient,
  distributionId: string,
  approvedBy: string,
): Promise<ProfitDistribution> {
  const distribution = await getProfitDistribution(supabase, distributionId)

  if (!distribution) {
    throw new Error('Distribusi bagi hasil tidak ditemukan.')
  }

  if (distribution.status !== 'review') {
    throw new Error('Hanya distribusi berstatus review yang dapat disetujui.')
  }

  const { data, error } = await supabase
    .from('profit_distributions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      updated_by: approvedBy,
    })
    .eq('id', distribution.id)
    .eq('status', 'review')
    .select(DISTRIBUTION_SELECT)
    .single()

  if (error || !data) {
    throw new Error(`Gagal menyetujui distribusi: ${error?.message ?? 'Distribusi tidak berubah.'}`)
  }

  return mapDistribution(data)
}

export async function markProfitDistributionPayable(
  supabase: DbClient,
  distributionId: string,
  updatedBy: string,
): Promise<ProfitDistribution> {
  const distribution = await getProfitDistribution(supabase, distributionId)

  if (!distribution) {
    throw new Error('Distribusi bagi hasil tidak ditemukan.')
  }

  if (distribution.status !== 'approved') {
    throw new Error('Hanya distribusi yang sudah approved yang dapat menjadi payable.')
  }

  const { error: allocationError } = await supabase
    .from('profit_distribution_allocations')
    .update({
      status: 'payable',
      updated_at: new Date().toISOString(),
    })
    .eq('distribution_id', distribution.id)
    .eq('status', 'pending')

  if (allocationError) {
    throw new Error(`Gagal mengubah allocation menjadi payable: ${allocationError.message}`)
  }

  const { data, error } = await supabase
    .from('profit_distributions')
    .update({
      status: 'payable',
      updated_by: updatedBy,
    })
    .eq('id', distribution.id)
    .eq('status', 'approved')
    .select(DISTRIBUTION_SELECT)
    .single()

  if (error || !data) {
    throw new Error(
      `Gagal mengubah distribusi menjadi payable: ${error?.message ?? 'Distribusi tidak berubah.'}`,
    )
  }

  return mapDistribution(data)
}

export async function markProfitDistributionAllocationPaid(
  supabase: DbClient,
  allocationId: string,
  paymentReference: string | null,
): Promise<ProfitDistributionAllocation> {
  const { data: allocation, error: allocationError } = await supabase
    .from('profit_distribution_allocations')
    .select(ALLOCATION_SELECT)
    .eq('id', allocationId)
    .maybeSingle()

  if (allocationError) {
    throw new Error(`Gagal mengambil allocation pembayaran: ${allocationError.message}`)
  }

  if (!allocation) {
    throw new Error('Allocation pembayaran tidak ditemukan.')
  }

  const currentAllocation = allocation

  if (currentAllocation.status !== 'payable') {
    throw new Error('Hanya allocation payable yang dapat ditandai paid.')
  }

  const { data, error } = await supabase
    .from('profit_distribution_allocations')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: paymentReference?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', allocationId)
    .eq('status', 'payable')
    .select(ALLOCATION_SELECT)
    .single()

  if (error || !data) {
    throw new Error(
      `Gagal menandai allocation sebagai paid: ${error?.message ?? 'Allocation tidak berubah.'}`,
    )
  }

  return mapAllocation(data)
}

export async function refreshProfitDistributionPaidStatus(
  supabase: DbClient,
  distributionId: string,
  updatedBy: string,
): Promise<ProfitDistribution> {
  const allocations = await listProfitDistributionAllocations(supabase, distributionId)

  if (allocations.length === 0) {
    throw new Error('Distribusi belum memiliki allocation.')
  }

  const allPaid = allocations.every((allocation) => allocation.status === 'paid')

  if (!allPaid) {
    throw new Error('Belum semua allocation investor berstatus paid.')
  }

  const { data, error } = await supabase
    .from('profit_distributions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .eq('id', distributionId)
    .eq('status', 'payable')
    .select(DISTRIBUTION_SELECT)
    .single()

  if (error || !data) {
    throw new Error(
      `Gagal menandai distribusi sebagai paid: ${error?.message ?? 'Distribusi tidak berubah.'}`,
    )
  }

  return mapDistribution(data)
}
