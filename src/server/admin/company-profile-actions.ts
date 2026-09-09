'use server'

import { z } from 'zod'

import { defineAction } from '@/server/auth/guards'
import { writeAudit } from '@/server/audit'
import { emitBrandRefresh } from '@/server/realtime/brand-refresh'
import { getServerSupabase } from '@/server/supabase/server'

const companyIdentitySchema = z.object({
  profileId: z.uuid().nullable(),
  displayName: z.string().trim().min(2).max(160),
  legalName: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'),
})

export const saveCompanyProfileIdentity = defineAction({
  access: { permission: 'company_profile.update' },
  input: companyIdentitySchema,
  handler: async ({ input, principal }) => {
    const supabase = await getServerSupabase()

    let before: Record<string, unknown> | null = null
    let profileId = input.profileId

    if (profileId) {
      const { data: existing, error: readError } = await supabase
        .from('company_profiles')
        .select('id, display_name, legal_name, slug')
        .eq('id', profileId)
        .single()

      if (readError || !existing) {
        throw new Error(`Profil perusahaan tidak ditemukan: ${readError?.message ?? 'data tidak tersedia'}`)
      }

      before = existing
      const { error } = await supabase
        .from('company_profiles')
        .update({
          display_name: input.displayName,
          legal_name: input.legalName,
          slug: input.slug,
        })
        .eq('id', profileId)

      if (error) throw new Error(`Gagal memperbarui identitas perusahaan: ${error.message}`)
    } else {
      const { data: created, error } = await supabase
        .from('company_profiles')
        .insert({
          display_name: input.displayName,
          legal_name: input.legalName,
          slug: input.slug,
          status: 'draft',
        })
        .select('id')
        .single()

      if (error || !created) {
        throw new Error(`Gagal membuat profil perusahaan: ${error?.message ?? 'ID profil tidak tersedia'}`)
      }
      profileId = created.id
    }

    if (principal.kind !== 'anonymous') {
      await writeAudit(principal, {
        action: input.profileId ? 'company_profile.identity_updated' : 'company_profile.created',
        entityType: 'company_profile',
        entityId: profileId,
        summary: input.profileId
          ? 'Identitas perusahaan diperbarui dari Profil Perusahaan.'
          : 'Profil perusahaan dibuat dari Profil Perusahaan.',
        changes: {
          identity: {
            before,
            after: {
              display_name: input.displayName,
              legal_name: input.legalName,
              slug: input.slug,
            },
          },
        },
      })
    }

    await emitBrandRefresh(profileId)
    return { profileId }
  },
})
