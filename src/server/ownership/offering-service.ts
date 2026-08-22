import type { SupabaseClient } from '@supabase/supabase-js'

export type OwnershipOfferingStatus = 'draft' | 'open' | 'paused' | 'closed' | 'archived'

export type OwnershipOffering = {
  id: string
  name: string
  code: string
  status: OwnershipOfferingStatus
  total_offered_bps: number
  unit_ownership_bps: number
  unit_price: number
  total_units: number
  distribution_cadence_months: number
  transfer_lock_months: number
  effective_from: string | null
  effective_until: string | null
  description: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type CreateOwnershipOfferingInput = {
  name: string
  code: string
  total_offered_bps: number
  unit_ownership_bps: number
  unit_price: number
  total_units: number
  distribution_cadence_months?: number
  transfer_lock_months?: number
  effective_from?: string | null
  effective_until?: string | null
  description?: string | null
  created_by: string
}

export type UpdateOwnershipOfferingInput = {
  offeringId: string
  name?: string
  code?: string
  total_offered_bps?: number
  unit_ownership_bps?: number
  unit_price?: number
  total_units?: number
  distribution_cadence_months?: number
  transfer_lock_months?: number
  effective_from?: string | null
  effective_until?: string | null
  description?: string | null
  updated_by: string
}

type OwnershipOfferingRow = {
  id: string
  name: string
  code: string
  status: OwnershipOfferingStatus
  total_offered_bps: number
  unit_ownership_bps: number
  unit_price: number | string
  total_units: number
  distribution_cadence_months: number
  transfer_lock_months: number
  effective_from: string | null
  effective_until: string | null
  description: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

const OFFERING_SELECT = `
  id,
  name,
  code,
  status,
  total_offered_bps,
  unit_ownership_bps,
  unit_price,
  total_units,
  distribution_cadence_months,
  transfer_lock_months,
  effective_from,
  effective_until,
  description,
  created_by,
  updated_by,
  created_at,
  updated_at
`

type DbClient = SupabaseClient

function mapOffering(row: OwnershipOfferingRow): OwnershipOffering {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    total_offered_bps: row.total_offered_bps,
    unit_ownership_bps: row.unit_ownership_bps,
    unit_price: Number(row.unit_price),
    total_units: row.total_units,
    distribution_cadence_months: row.distribution_cadence_months,
    transfer_lock_months: row.transfer_lock_months,
    effective_from: row.effective_from,
    effective_until: row.effective_until,
    description: row.description,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function normalizeName(name: string): string {
  return name.trim()
}

function normalizeCode(code: string): string {
  return code.trim().toLowerCase()
}

function validateOfferingValues(input: {
  name: string
  code: string
  total_offered_bps: number
  unit_ownership_bps: number
  unit_price: number
  total_units: number
  distribution_cadence_months: number
  transfer_lock_months: number
  effective_from?: string | null
  effective_until?: string | null
}) {
  if (!input.name.trim()) {
    throw new Error('Nama penawaran kepemilikan wajib diisi.')
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.code)) {
    throw new Error('Kode penawaran harus menggunakan lowercase kebab-case.')
  }

  if (
    !Number.isInteger(input.total_offered_bps) ||
    input.total_offered_bps <= 0 ||
    input.total_offered_bps > 10000
  ) {
    throw new Error('Total offered BPS harus antara 1 dan 10000.')
  }

  if (
    !Number.isInteger(input.unit_ownership_bps) ||
    input.unit_ownership_bps <= 0 ||
    input.unit_ownership_bps > 10000
  ) {
    throw new Error('Unit ownership BPS harus antara 1 dan 10000.')
  }

  if (!Number.isInteger(input.total_units) || input.total_units <= 0) {
    throw new Error('Total unit harus lebih besar dari 0.')
  }

  if (input.unit_ownership_bps * input.total_units !== input.total_offered_bps) {
    throw new Error('Total offered BPS harus sama dengan unit ownership BPS dikalikan total unit.')
  }

  if (!Number.isFinite(input.unit_price) || input.unit_price <= 0) {
    throw new Error('Harga per unit harus lebih besar dari 0.')
  }

  if (
    !Number.isInteger(input.distribution_cadence_months) ||
    input.distribution_cadence_months < 1 ||
    input.distribution_cadence_months > 24
  ) {
    throw new Error('Cadence distribusi harus antara 1 dan 24 bulan.')
  }

  if (
    !Number.isInteger(input.transfer_lock_months) ||
    input.transfer_lock_months < 36 ||
    input.transfer_lock_months > 120
  ) {
    throw new Error('Transfer lock harus antara 36 dan 120 bulan.')
  }

  if (
    input.effective_from &&
    input.effective_until &&
    new Date(input.effective_until) <= new Date(input.effective_from)
  ) {
    throw new Error('Tanggal efektif sampai harus setelah tanggal efektif mulai.')
  }
}

export async function listOwnershipOfferings(supabase: DbClient): Promise<OwnershipOffering[]> {
  const { data, error } = await supabase
    .from('ownership_offerings')
    .select(OFFERING_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal mengambil penawaran kepemilikan: ${error.message}`)
  }

  const rows = (data ?? []) as OwnershipOfferingRow[]

  return rows.map(mapOffering)
}

export async function getOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
): Promise<OwnershipOffering | null> {
  const { data, error } = await supabase
    .from('ownership_offerings')
    .select(OFFERING_SELECT)
    .eq('id', offeringId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil penawaran kepemilikan: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return mapOffering(data)
}

export async function createOwnershipOffering(
  supabase: DbClient,
  input: CreateOwnershipOfferingInput,
): Promise<OwnershipOffering> {
  const name = normalizeName(input.name)
  const code = normalizeCode(input.code)

  const distributionCadenceMonths = input.distribution_cadence_months ?? 6

  const transferLockMonths = input.transfer_lock_months ?? 36

  validateOfferingValues({
    name,
    code,
    total_offered_bps: input.total_offered_bps,
    unit_ownership_bps: input.unit_ownership_bps,
    unit_price: input.unit_price,
    total_units: input.total_units,
    distribution_cadence_months: distributionCadenceMonths,
    transfer_lock_months: transferLockMonths,
    effective_from: input.effective_from,
    effective_until: input.effective_until,
  })

  const { data, error } = await supabase
    .from('ownership_offerings')
    .insert({
      name,
      code,
      status: 'draft',
      total_offered_bps: input.total_offered_bps,
      unit_ownership_bps: input.unit_ownership_bps,
      unit_price: input.unit_price,
      total_units: input.total_units,
      distribution_cadence_months: distributionCadenceMonths,
      transfer_lock_months: transferLockMonths,
      effective_from: input.effective_from ?? null,
      effective_until: input.effective_until ?? null,
      description: input.description?.trim() || null,
      created_by: input.created_by,
      updated_by: input.created_by,
    })
    .select(OFFERING_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Kode penawaran sudah digunakan.')
    }

    throw new Error(`Gagal membuat penawaran kepemilikan: ${error.message}`)
  }

  return mapOffering(data)
}

export async function updateOwnershipOffering(
  supabase: DbClient,
  input: UpdateOwnershipOfferingInput,
): Promise<OwnershipOffering> {
  const current = await getOwnershipOffering(supabase, input.offeringId)

  if (!current) {
    throw new Error('Penawaran kepemilikan tidak ditemukan.')
  }

  if (current.status !== 'draft' && current.status !== 'paused') {
    throw new Error('Penawaran hanya dapat diubah saat berstatus draft atau paused.')
  }

  const name = input.name !== undefined ? normalizeName(input.name) : current.name

  const code = input.code !== undefined ? normalizeCode(input.code) : current.code

  const totalOfferedBps = input.total_offered_bps ?? current.total_offered_bps

  const unitOwnershipBps = input.unit_ownership_bps ?? current.unit_ownership_bps

  const unitPrice = input.unit_price ?? current.unit_price

  const totalUnits = input.total_units ?? current.total_units

  const distributionCadenceMonths =
    input.distribution_cadence_months ?? current.distribution_cadence_months

  const transferLockMonths = input.transfer_lock_months ?? current.transfer_lock_months

  const effectiveFrom =
    input.effective_from !== undefined ? input.effective_from : current.effective_from

  const effectiveUntil =
    input.effective_until !== undefined ? input.effective_until : current.effective_until

  validateOfferingValues({
    name,
    code,
    total_offered_bps: totalOfferedBps,
    unit_ownership_bps: unitOwnershipBps,
    unit_price: unitPrice,
    total_units: totalUnits,
    distribution_cadence_months: distributionCadenceMonths,
    transfer_lock_months: transferLockMonths,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  })

  const { data, error } = await supabase
    .from('ownership_offerings')
    .update({
      name,
      code,
      total_offered_bps: totalOfferedBps,
      unit_ownership_bps: unitOwnershipBps,
      unit_price: unitPrice,
      total_units: totalUnits,
      distribution_cadence_months: distributionCadenceMonths,
      transfer_lock_months: transferLockMonths,
      effective_from: effectiveFrom,
      effective_until: effectiveUntil,
      description:
        input.description !== undefined ? input.description?.trim() || null : current.description,
      updated_by: input.updated_by,
    })
    .eq('id', input.offeringId)
    .select(OFFERING_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Kode penawaran sudah digunakan.')
    }

    throw new Error(`Gagal mengubah penawaran kepemilikan: ${error.message}`)
  }

  return mapOffering(data)
}

export async function publishOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  const current = await getOwnershipOffering(supabase, offeringId)

  if (!current) {
    throw new Error('Penawaran kepemilikan tidak ditemukan.')
  }

  if (current.status !== 'draft') {
    throw new Error('Hanya penawaran berstatus draft yang dapat diterbitkan.')
  }

  validateOfferingValues({
    name: current.name,
    code: current.code,
    total_offered_bps: current.total_offered_bps,
    unit_ownership_bps: current.unit_ownership_bps,
    unit_price: current.unit_price,
    total_units: current.total_units,
    distribution_cadence_months: current.distribution_cadence_months,
    transfer_lock_months: current.transfer_lock_months,
    effective_from: current.effective_from,
    effective_until: current.effective_until,
  })

  const { data, error } = await supabase
    .from('ownership_offerings')
    .update({
      status: 'open',
      updated_by: updatedBy,
      effective_from: current.effective_from ?? new Date().toISOString(),
    })
    .eq('id', offeringId)
    .eq('status', 'draft')
    .select(OFFERING_SELECT)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal menerbitkan penawaran kepemilikan: ${error.message}`)
  }

  if (!data) {
    throw new Error('Penawaran tidak dapat diterbitkan karena statusnya telah berubah.')
  }

  return mapOffering(data)
}

export async function pauseOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  const current = await getOwnershipOffering(supabase, offeringId)

  if (!current) {
    throw new Error('Penawaran kepemilikan tidak ditemukan.')
  }

  if (current.status !== 'open') {
    throw new Error('Hanya penawaran berstatus open yang dapat dihentikan sementara.')
  }

  const { data, error } = await supabase
    .from('ownership_offerings')
    .update({
      status: 'paused',
      updated_by: updatedBy,
    })
    .eq('id', offeringId)
    .eq('status', 'open')
    .select(OFFERING_SELECT)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal menghentikan penawaran kepemilikan: ${error.message}`)
  }

  if (!data) {
    throw new Error('Penawaran tidak dapat dihentikan karena statusnya telah berubah.')
  }

  return mapOffering(data)
}

export async function resumeOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  const current = await getOwnershipOffering(supabase, offeringId)

  if (!current) {
    throw new Error('Penawaran kepemilikan tidak ditemukan.')
  }

  if (current.status !== 'paused') {
    throw new Error('Hanya penawaran berstatus paused yang dapat dibuka kembali.')
  }

  const { data, error } = await supabase
    .from('ownership_offerings')
    .update({
      status: 'open',
      updated_by: updatedBy,
    })
    .eq('id', offeringId)
    .eq('status', 'paused')
    .select(OFFERING_SELECT)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal membuka kembali penawaran kepemilikan: ${error.message}`)
  }

  if (!data) {
    throw new Error('Penawaran tidak dapat dibuka kembali karena statusnya telah berubah.')
  }

  return mapOffering(data)
}

export async function closeOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  const current = await getOwnershipOffering(supabase, offeringId)

  if (!current) {
    throw new Error('Penawaran kepemilikan tidak ditemukan.')
  }

  if (current.status !== 'open' && current.status !== 'paused') {
    throw new Error('Hanya penawaran berstatus open atau paused yang dapat ditutup.')
  }

  const { data, error } = await supabase
    .from('ownership_offerings')
    .update({
      status: 'closed',
      updated_by: updatedBy,
    })
    .eq('id', offeringId)
    .in('status', ['open', 'paused'])
    .select(OFFERING_SELECT)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal menutup penawaran kepemilikan: ${error.message}`)
  }

  if (!data) {
    throw new Error('Penawaran tidak dapat ditutup karena statusnya telah berubah.')
  }

  return mapOffering(data)
}

export async function archiveOwnershipOffering(
  supabase: DbClient,
  offeringId: string,
  updatedBy: string,
): Promise<OwnershipOffering> {
  const current = await getOwnershipOffering(supabase, offeringId)

  if (!current) {
    throw new Error('Penawaran kepemilikan tidak ditemukan.')
  }

  if (current.status !== 'closed') {
    throw new Error('Hanya penawaran berstatus closed yang dapat diarsipkan.')
  }

  const { data, error } = await supabase
    .from('ownership_offerings')
    .update({
      status: 'archived',
      updated_by: updatedBy,
    })
    .eq('id', offeringId)
    .eq('status', 'closed')
    .select(OFFERING_SELECT)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengarsipkan penawaran kepemilikan: ${error.message}`)
  }

  if (!data) {
    throw new Error('Penawaran tidak dapat diarsipkan karena statusnya telah berubah.')
  }

  return mapOffering(data)
}
