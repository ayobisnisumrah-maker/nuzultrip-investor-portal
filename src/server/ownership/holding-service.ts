import type { SupabaseClient } from '@supabase/supabase-js'

export type OwnershipHoldingStatus = 'reserved' | 'active' | 'transferred' | 'cancelled'

export type OwnershipHolding = {
  id: string
  offering_id: string
  investor_id: string
  units: number
  ownership_bps: number
  acquisition_at: string
  transfer_eligible_at: string
  status: OwnershipHoldingStatus
  acquisition_reference: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type CreateOwnershipHoldingInput = {
  offering_id: string
  investor_id: string
  units: number
  acquisition_reference?: string | null
  notes?: string | null
  created_by: string
}

type OwnershipHoldingRow = {
  id: string
  offering_id: string
  investor_id: string
  units: number
  ownership_bps: number
  acquisition_at: string
  transfer_eligible_at: string
  status: OwnershipHoldingStatus
  acquisition_reference: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

type OwnershipOfferingRow = {
  id: string
  status: 'draft' | 'open' | 'paused' | 'closed' | 'archived'
  unit_ownership_bps: number
  total_units: number
  transfer_lock_months: number
}

type InvestorRow = {
  id: string
  status:
    'prospective' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'active' | 'inactive'
}
type DbClient = SupabaseClient

const HOLDING_SELECT = `
  id,
  offering_id,
  investor_id,
  units,
  ownership_bps,
  acquisition_at,
  transfer_eligible_at,
  status,
  acquisition_reference,
  notes,
  created_by,
  updated_by,
  created_at,
  updated_at
`

function mapHolding(row: OwnershipHoldingRow): OwnershipHolding {
  return {
    id: row.id,
    offering_id: row.offering_id,
    investor_id: row.investor_id,
    units: row.units,
    ownership_bps: row.ownership_bps,
    acquisition_at: row.acquisition_at,
    transfer_eligible_at: row.transfer_eligible_at,
    status: row.status,
    acquisition_reference: row.acquisition_reference,
    notes: row.notes,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function validateUnits(units: number): void {
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error('Jumlah unit harus berupa bilangan bulat lebih besar dari 0.')
  }
}

function calculateTransferEligibleAt(acquisitionAt: string, transferLockMonths: number): string {
  const date = new Date(acquisitionAt)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Tanggal acquisition tidak valid.')
  }

  date.setUTCMonth(date.getUTCMonth() + transferLockMonths)

  return date.toISOString()
}

export async function listOwnershipHoldings(supabase: DbClient): Promise<OwnershipHolding[]> {
  const { data, error } = await supabase
    .from('ownership_holdings')
    .select(HOLDING_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal mengambil kepemilikan investor: ${error.message}`)
  }

  const rows = (data ?? []) as OwnershipHoldingRow[]

  return rows.map(mapHolding)
}

export async function getOwnershipHolding(
  supabase: DbClient,
  holdingId: string,
): Promise<OwnershipHolding | null> {
  const { data, error } = await supabase
    .from('ownership_holdings')
    .select(HOLDING_SELECT)
    .eq('id', holdingId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil kepemilikan investor: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return mapHolding(data)
}

export async function createOwnershipHolding(
  supabase: DbClient,
  input: CreateOwnershipHoldingInput,
): Promise<OwnershipHolding> {
  validateUnits(input.units)

  const { data: investor, error: investorError } = await supabase
    .from('investors')
    .select('id, status')
    .eq('id', input.investor_id)
    .maybeSingle()

  if (investorError) {
    throw new Error(`Gagal memeriksa investor: ${investorError.message}`)
  }

  if (!investor) {
    throw new Error('Investor tidak ditemukan.')
  }

  const investorStatus = investor.status as InvestorRow['status']

  if (investorStatus !== 'approved' && investorStatus !== 'active') {
    throw new Error(
      'Investor harus berstatus approved atau active sebelum kepemilikan dapat dialokasikan.',
    )
  }

  const { data: offering, error: offeringError } = await supabase
    .from('ownership_offerings')
    .select('id, status, unit_ownership_bps, total_units, transfer_lock_months')
    .eq('id', input.offering_id)
    .maybeSingle()

  if (offeringError) {
    throw new Error(`Gagal memeriksa penawaran kepemilikan: ${offeringError.message}`)
  }

  if (!offering) {
    throw new Error('Penawaran kepemilikan tidak ditemukan.')
  }

  const offeringStatus = offering.status as OwnershipOfferingRow['status']

  const unitOwnershipBps = Number(offering.unit_ownership_bps)
  const totalUnits = Number(offering.total_units)
  const transferLockMonths = Number(offering.transfer_lock_months)

  if (offeringStatus !== 'open') {
    throw new Error('Kepemilikan hanya dapat dialokasikan pada penawaran yang berstatus open.')
  }

  if (!Number.isInteger(unitOwnershipBps) || unitOwnershipBps <= 0) {
    throw new Error('Unit ownership BPS pada penawaran tidak valid.')
  }

  if (!Number.isInteger(totalUnits) || totalUnits <= 0) {
    throw new Error('Total unit pada penawaran tidak valid.')
  }

  if (!Number.isInteger(transferLockMonths) || transferLockMonths < 0) {
    throw new Error('Periode transfer lock pada penawaran tidak valid.')
  }

  if (input.units > totalUnits) {
    throw new Error('Jumlah unit yang dialokasikan melebihi total unit penawaran.')
  }

  const { data: existingHoldings, error: holdingsError } = await supabase
    .from('ownership_holdings')
    .select('units')
    .eq('offering_id', input.offering_id)
    .in('status', ['reserved', 'active'])

  if (holdingsError) {
    throw new Error(`Gagal memeriksa unit yang telah dialokasikan: ${holdingsError.message}`)
  }

  const allocatedUnits = (existingHoldings ?? []).reduce(
    (total, holding) => total + Number(holding.units),
    0,
  )

  const remainingUnits = totalUnits - allocatedUnits

  if (input.units > remainingUnits) {
    throw new Error(`Unit yang tersedia tidak mencukupi. Sisa unit: ${remainingUnits}.`)
  }

  const ownershipBps = input.units * unitOwnershipBps

  if (ownershipBps <= 0) {
    throw new Error('Persentase kepemilikan hasil perhitungan tidak valid.')
  }

  const acquisitionAt = new Date().toISOString()

  const transferEligibleAt = calculateTransferEligibleAt(acquisitionAt, transferLockMonths)

  const { data, error } = await supabase
    .from('ownership_holdings')
    .insert({
      offering_id: input.offering_id,
      investor_id: input.investor_id,
      units: input.units,
      ownership_bps: ownershipBps,
      acquisition_at: acquisitionAt,
      transfer_eligible_at: transferEligibleAt,
      status: 'reserved',
      acquisition_reference: input.acquisition_reference?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: input.created_by,
      updated_by: input.created_by,
    })
    .select(HOLDING_SELECT)
    .single()

  if (error) {
    throw new Error(`Gagal membuat kepemilikan investor: ${error.message}`)
  }

  if (!data) {
    throw new Error('Kepemilikan investor berhasil dibuat tetapi data hasil insert tidak tersedia.')
  }

  return mapHolding(data)
}
