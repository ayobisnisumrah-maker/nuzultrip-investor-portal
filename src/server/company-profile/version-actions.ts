'use server'

import { z } from 'zod'

import { ConflictError, ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

const blockKey = z.enum([
  'legal_information',
  'history',
  'vision',
  'mission',
  'leadership',
  'business_overview',
  'business_ecosystem',
  'strategic_direction',
  'milestones',
  'achievements',
  'statistics',
  'contact',
])

const blocksSchema = z.record(blockKey, z.string().trim().max(20_000)).superRefine((value, ctx) => {
  const total = Object.values(value).reduce((sum, item) => sum + item.length, 0)
  if (total > 100_000) {
    ctx.addIssue({ code: 'custom', message: 'Konten profil perusahaan terlalu besar.' })
  }
})

const saveSchema = z.object({
  profileId: z.uuid(),
  blocks: blocksSchema,
  changeNote: z.string().trim().max(500).optional().or(z.literal('')),
})

const transitionSchema = z.object({
  profileId: z.uuid(),
  toStatus: z.enum(['draft', 'review', 'approved', 'published']),
})

type ActionSupabase = Parameters<Parameters<typeof defineAction>[0]['handler']>[0]['supabase']

async function runTransition(
  supabase: ActionSupabase,
  profileId: string,
  target: 'draft' | 'review' | 'approved' | 'published',
) {
  const { data, error } = await (supabase.schema('app') as unknown as typeof supabase).rpc(
    'transition_company_profile' as never,
    { p_profile_id: profileId, p_to_status: target } as never,
  )

  if (error) {
    if (error.code === '42501') throw new ForbiddenError(`Company profile transition denied: ${error.message}`)
    if (error.code === 'P0002') throw new NotFoundError('Profil perusahaan')
    if (error.code === '23514') {
      throw new ConflictError(
        `Company profile transition conflict: ${error.message}`,
        'Status profil sudah berubah atau belum siap untuk tahap berikutnya. Muat ulang halaman lalu coba kembali.',
      )
    }
    throw new Error(`Gagal mengubah status profil perusahaan: ${error.message}`)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) throw new Error('Perubahan status profil tidak menghasilkan data.')
  return result as { previous_status: string; status: string; current_version_id: string }
}

export const saveCompanyProfileContentDraft = defineAction({
  access: { permission: 'company_profile.update' },
  input: saveSchema,
  audit: { action: 'company_profile.version.save', entityType: 'company_profile' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')

    const { data, error } = await (supabase.schema('app') as unknown as typeof supabase).rpc(
      'save_company_profile_draft' as never,
      {
        p_profile_id: input.profileId,
        p_blocks: input.blocks,
        p_change_note: input.changeNote || null,
      } as never,
    )

    if (error) {
      if (error.code === '42501') throw new ForbiddenError(`Company profile update denied: ${error.message}`)
      if (error.code === 'P0002') throw new NotFoundError('Profil perusahaan')
      if (error.code === '23514') {
        throw new ConflictError(
          `Company profile update conflict: ${error.message}`,
          'Profil hanya dapat diedit saat berstatus Draf. Muat ulang halaman lalu coba kembali.',
        )
      }
      throw new Error(`Gagal menyimpan profil perusahaan: ${error.message}`)
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result) throw new Error('Penyimpanan profil tidak menghasilkan versi baru.')

    audit({
      entityId: input.profileId,
      summary: `Konten profil perusahaan disimpan sebagai draf v${String((result as { version_number?: number }).version_number ?? 'baru')}.`,
    })

    return result
  },
})

export const transitionCompanyProfileVersion = defineAction({
  access: { permission: 'company_profile.view' },
  input: transitionSchema,
  audit: { action: 'company_profile.version.transition', entityType: 'company_profile' },
  handler: async ({ input, supabase, audit }) => {
    const result = await runTransition(supabase, input.profileId, input.toStatus)
    audit({
      entityId: input.profileId,
      summary: `Status profil perusahaan berubah dari ${result.previous_status} menjadi ${result.status}.`,
    })
    return result
  },
})
