import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export async function getCompanyProfile() {
  const supabase = await getServerSupabase()

  const { data: profile, error } = await supabase
    .from('company_profiles')
    .select('id, slug, legal_name, display_name, status, current_version_id, published_version_id, created_at, updated_at')
    .eq('slug', 'nuzultrip')
    .maybeSingle()

  if (error) throw new Error(`Gagal memuat profil perusahaan: ${error.message}`)
  if (!profile) return null

  const versionIds = [profile.current_version_id, profile.published_version_id].filter(
    (id): id is string => Boolean(id),
  )

  const { data: versions, error: versionError } = versionIds.length
    ? await supabase
        .from('company_profile_versions')
        .select(
          'id, version_number, status, identity, legal_information, history, vision, mission, leadership, business_overview, business_ecosystem, strategic_direction, milestones, achievements, statistics, contact, brand_assets, change_note, approved_at, published_at, created_at',
        )
        .in('id', versionIds)
    : { data: [], error: null }

  if (versionError) throw new Error(`Gagal memuat versi profil perusahaan: ${versionError.message}`)

  const byId = new Map((versions ?? []).map((version) => [version.id, version]))

  return {
    ...profile,
    current_version: profile.current_version_id ? (byId.get(profile.current_version_id) ?? null) : null,
    published_version: profile.published_version_id ? (byId.get(profile.published_version_id) ?? null) : null,
  }
}
