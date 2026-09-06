'use server'

import { z } from 'zod'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import type { Json } from '@/types/database'

const objectBlock = z.record(z.string(), z.unknown()).refine(
  (value) => JSON.stringify(value).length <= 100_000,
  'Blok profil perusahaan terlalu besar.',
)

const blocksSchema = z.object({
  identity: objectBlock,
  legal_information: objectBlock,
  history: objectBlock,
  vision: objectBlock,
  mission: objectBlock,
  leadership: objectBlock,
  business_overview: objectBlock,
  business_ecosystem: objectBlock,
  strategic_direction: objectBlock,
  milestones: objectBlock,
  achievements: objectBlock,
  statistics: objectBlock,
  contact: objectBlock,
  brand_assets: objectBlock,
})

const initializeSchema = z.object({
  legalName: z.string().trim().min(2).max(240),
  displayName: z.string().trim().min(2).max(160),
})

const saveSchema = z.object({
  profileId: z.uuid(),
  legalName: z.string().trim().min(2).max(240),
  displayName: z.string().trim().min(2).max(160),
  blocks: blocksSchema,
  changeNote: z.string().trim().max(500).optional().or(z.literal('')),
})

const transitionSchema = z.object({
  profileId: z.uuid(),
  toStatus: z.enum(['draft', 'review', 'approved', 'published']),
})

export const initializeCompanyProfile = defineAction({
  access: { permission: 'company_profile.update' },
  input: initializeSchema,
  audit: { action: 'company_profile.initialize', entityType: 'company_profile' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')

    const { data: existing } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('slug', 'nuzultrip')
      .maybeSingle()

    if (existing) return { profileId: existing.id }

    const { data: profile, error } = await supabase
      .from('company_profiles')
      .insert({
        slug: 'nuzultrip',
        legal_name: input.legalName,
        display_name: input.displayName,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error || !profile) throw new Error(`Gagal membuat profil perusahaan: ${error?.message ?? 'unknown error'}`)

    const empty = {} as Json
    const { data: version, error: versionError } = await supabase
      .from('company_profile_versions')
      .insert({
        company_profile_id: profile.id,
        status: 'draft',
        identity: empty,
        legal_information: empty,
        history: empty,
        vision: empty,
        mission: empty,
        leadership: empty,
        business_overview: empty,
        business_ecosystem: empty,
        strategic_direction: empty,
        milestones: empty,
        achievements: empty,
        statistics: empty,
        contact: empty,
        brand_assets: empty,
        change_note: 'Profil perusahaan diinisialisasi.',
      })
      .select('id')
      .single()

    if (versionError || !version) throw new Error(`Gagal membuat versi profil: ${versionError?.message ?? 'unknown error'}`)

    const { error: linkError } = await supabase
      .from('company_profiles')
      .update({ current_version_id: version.id })
      .eq('id', profile.id)

    if (linkError) throw new Error(`Gagal menghubungkan versi profil: ${linkError.message}`)

    audit({ entityId: profile.id, summary: 'Profil perusahaan Nuzultrip diinisialisasi sebagai draf.' })
    return { profileId: profile.id }
  },
})

export const saveCompanyProfileDraft = defineAction({
  access: { permission: 'company_profile.update' },
  input: saveSchema,
  audit: { action: 'company_profile.save', entityType: 'company_profile' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')

    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('id, status')
      .eq('id', input.profileId)
      .maybeSingle()

    if (profileError || !profile) throw new NotFoundError('Profil perusahaan')
    if (profile.status !== 'draft') throw new ForbiddenError('Profil hanya dapat diedit saat berstatus Draf.')

    const { data: version, error: versionError } = await supabase
      .from('company_profile_versions')
      .insert({
        company_profile_id: profile.id,
        status: 'draft',
        identity: input.blocks.identity as Json,
        legal_information: input.blocks.legal_information as Json,
        history: input.blocks.history as Json,
        vision: input.blocks.vision as Json,
        mission: input.blocks.mission as Json,
        leadership: input.blocks.leadership as Json,
        business_overview: input.blocks.business_overview as Json,
        business_ecosystem: input.blocks.business_ecosystem as Json,
        strategic_direction: input.blocks.strategic_direction as Json,
        milestones: input.blocks.milestones as Json,
        achievements: input.blocks.achievements as Json,
        statistics: input.blocks.statistics as Json,
        contact: input.blocks.contact as Json,
        brand_assets: input.blocks.brand_assets as Json,
        change_note: input.changeNote || 'Profil perusahaan diperbarui.',
      })
      .select('id, version_number')
      .single()

    if (versionError || !version) throw new Error(`Gagal menyimpan versi profil: ${versionError?.message ?? 'unknown error'}`)

    const { error: updateError } = await supabase
      .from('company_profiles')
      .update({
        legal_name: input.legalName,
        display_name: input.displayName,
        current_version_id: version.id,
      })
      .eq('id', profile.id)

    if (updateError) throw new Error(`Gagal memperbarui profil perusahaan: ${updateError.message}`)

    audit({ entityId: profile.id, summary: `Profil perusahaan disimpan sebagai draf v${version.version_number}.` })
    return { versionNumber: version.version_number }
  },
})

export const transitionCompanyProfile = defineAction({
  access: { permission: 'company_profile.publish' },
  input: transitionSchema,
  audit: { action: 'company_profile.transition', entityType: 'company_profile' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')

    const { data: profile, error } = await supabase
      .from('company_profiles')
      .select('id, status, current_version_id, published_version_id')
      .eq('id', input.profileId)
      .maybeSingle()

    if (error || !profile) throw new NotFoundError('Profil perusahaan')
    if (!profile.current_version_id) throw new Error('Profil belum memiliki versi aktif.')

    if (input.toStatus === 'draft' && profile.status === 'published') {
      const { data: source, error: sourceError } = await supabase
        .from('company_profile_versions')
        .select('identity, legal_information, history, vision, mission, leadership, business_overview, business_ecosystem, strategic_direction, milestones, achievements, statistics, contact, brand_assets')
        .eq('id', profile.published_version_id ?? profile.current_version_id)
        .single()

      if (sourceError || !source) throw new Error('Snapshot profil terbit tidak ditemukan.')

      const { data: draft, error: draftError } = await supabase
        .from('company_profile_versions')
        .insert({
          company_profile_id: profile.id,
          status: 'draft',
          identity: source.identity,
          legal_information: source.legal_information,
          history: source.history,
          vision: source.vision,
          mission: source.mission,
          leadership: source.leadership,
          business_overview: source.business_overview,
          business_ecosystem: source.business_ecosystem,
          strategic_direction: source.strategic_direction,
          milestones: source.milestones,
          achievements: source.achievements,
          statistics: source.statistics,
          contact: source.contact,
          brand_assets: source.brand_assets,
          change_note: 'Revisi baru dari snapshot terbit.',
        })
        .select('id')
        .single()

      if (draftError || !draft) throw new Error(`Gagal membuat revisi profil: ${draftError?.message ?? 'unknown error'}`)

      const { error: restoreError } = await supabase
        .from('company_profiles')
        .update({ status: 'draft', current_version_id: draft.id })
        .eq('id', profile.id)

      if (restoreError) throw new Error(`Gagal memulai revisi: ${restoreError.message}`)
      audit({ entityId: profile.id, summary: 'Revisi baru profil perusahaan dimulai.' })
      return { status: 'draft' as const }
    }

    const allowed =
      (profile.status === 'draft' && input.toStatus === 'review') ||
      (profile.status === 'review' && ['approved', 'draft'].includes(input.toStatus)) ||
      (profile.status === 'approved' && ['published', 'draft'].includes(input.toStatus))

    if (!allowed) throw new Error(`Transisi profil tidak valid: ${profile.status} → ${input.toStatus}.`)

    const versionStatus = input.toStatus
    const versionPatch: Record<string, unknown> = { status: versionStatus }
    if (versionStatus === 'approved') versionPatch.approved_at = new Date().toISOString()

    const { error: versionError } = await supabase
      .from('company_profile_versions')
      .update(versionPatch)
      .eq('id', profile.current_version_id)

    if (versionError) throw new Error(`Gagal mengubah status versi profil: ${versionError.message}`)

    const profilePatch: Record<string, unknown> = { status: input.toStatus }
    if (input.toStatus === 'published') profilePatch.published_version_id = profile.current_version_id

    const { error: profileUpdateError } = await supabase
      .from('company_profiles')
      .update(profilePatch)
      .eq('id', profile.id)

    if (profileUpdateError) throw new Error(`Gagal mengubah status profil: ${profileUpdateError.message}`)

    audit({ entityId: profile.id, summary: `Status profil perusahaan berubah dari ${profile.status} menjadi ${input.toStatus}.` })
    return { status: input.toStatus }
  },
})
