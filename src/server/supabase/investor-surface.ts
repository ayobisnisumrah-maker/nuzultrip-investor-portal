import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type InvestorsRow = Database['public']['Tables']['investors']['Row'] & {
  whatsapp_number: string | null
  bank_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  ktp_storage_bucket: string | null
  ktp_storage_path: string | null
  ktp_original_file_name: string | null
  ktp_mime_type: string | null
  ktp_file_size_bytes: number | null
  ktp_uploaded_at: string | null
}

type InvestorsInsert = Database['public']['Tables']['investors']['Insert'] & {
  whatsapp_number?: string | null
  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_number?: string | null
  ktp_storage_bucket?: string | null
  ktp_storage_path?: string | null
  ktp_original_file_name?: string | null
  ktp_mime_type?: string | null
  ktp_file_size_bytes?: number | null
  ktp_uploaded_at?: string | null
}

type InvestorsUpdate = Database['public']['Tables']['investors']['Update'] & InvestorsInsert

type OwnershipHolding = {
  Row: {
    id: string
    offering_id: string
    investor_id: string
    units: number
    ownership_bps: number
    acquisition_at: string
    transfer_eligible_at: string
    status: string
    acquisition_reference: string | null
    notes: string | null
    created_by: string | null
    updated_by: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    offering_id: string
    investor_id: string
    units: number
    ownership_bps: number
    acquisition_at?: string
    transfer_eligible_at: string
    status?: string
    acquisition_reference?: string | null
    notes?: string | null
    id?: string
    created_by?: string | null
    updated_by?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: Partial<OwnershipHolding['Insert']>
  Relationships: []
}

type OwnershipOffering = {
  Row: {
    id: string
    name: string
    code: string
    status: string
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
  Insert: {
    name: string
    code: string
    status?: string
    total_offered_bps: number
    unit_ownership_bps: number
    unit_price: number
    total_units: number
    distribution_cadence_months?: number
    transfer_lock_months?: number
    effective_from?: string | null
    effective_until?: string | null
    description?: string | null
    id?: string
    created_by?: string | null
    updated_by?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: Partial<OwnershipOffering['Insert']>
  Relationships: []
}

type InvestorSurfaceTables = Database['public']['Tables'] & {
  investors: {
    Row: InvestorsRow
    Insert: InvestorsInsert
    Update: InvestorsUpdate
    Relationships: Database['public']['Tables']['investors']['Relationships']
  }
  ownership_holdings: OwnershipHolding
  ownership_offerings: OwnershipOffering
}

type InvestorSurfaceDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: InvestorSurfaceTables
  }
}

export type InvestorSurfaceSupabase = SupabaseClient<InvestorSurfaceDatabase>

export function asInvestorSurfaceSupabase(
  client: SupabaseClient<Database>,
): InvestorSurfaceSupabase {
  return client as InvestorSurfaceSupabase
}
