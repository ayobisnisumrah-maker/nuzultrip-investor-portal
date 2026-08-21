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
  Insert: Partial<OwnershipHolding['Row']> & Pick<OwnershipHolding['Row'], 'offering_id' | 'investor_id' | 'units' | 'ownership_bps' | 'acquisition_at' | 'transfer_eligible_at' | 'status'>
  Update: Partial<OwnershipHolding['Row']>
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
    unit_price: string
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
  Insert: Partial<OwnershipOffering['Row']> & Pick<OwnershipOffering['Row'], 'name' | 'code' | 'status' | 'total_offered_bps' | 'unit_ownership_bps' | 'unit_price' | 'total_units' | 'distribution_cadence_months' | 'transfer_lock_months'>
  Update: Partial<OwnershipOffering['Row']>
  Relationships: []
}

type InvestorSurfaceDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Omit<Database['public']['Tables'], 'investors'> & {
      investors: {
        Row: InvestorsRow
        Insert: InvestorsInsert
        Update: InvestorsUpdate
        Relationships: Database['public']['Tables']['investors']['Relationships']
      }
      ownership_holdings: OwnershipHolding
      ownership_offerings: OwnershipOffering
    }
  }
}

export type InvestorSurfaceSupabase = SupabaseClient<InvestorSurfaceDatabase>

export function asInvestorSurfaceSupabase(
  client: SupabaseClient<Database>,
): InvestorSurfaceSupabase {
  return client
}
