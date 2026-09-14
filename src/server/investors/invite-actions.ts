'use server'

import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { getClientEnv } from '@/lib/env'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { defineAction } from '@/server/auth/guards'

const inviteInvestorSchema = z.object({
  legalName: z.string().trim().min(2, 'Nama investor wajib diisi.').max(160),
  email: z.string().trim().email('Format surel tidak valid.').max(320),
  investorType: z.enum(['individual', 'institution']).default('individual'),
  organizationName: z.string().trim().max(200).nullable().optional(),
})

export const inviteInvestor = defineAction({
  access: { permission: 'investors.create' },
  input: inviteInvestorSchema,
  audit: {
    action: 'investor.invited',
    entityType: 'investor',
  },
  handler: async ({ input, audit }) => {
    const service = getServiceRoleClient()
    const siteUrl = getClientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

    if (input.investorType === 'institution' && !input.organizationName?.trim()) {
      throw new ConflictError(
        'Institution investor requires organization name.',
        'Nama institusi wajib diisi untuk investor institusi.',
      )
    }

    const normalizedEmail = input.email.toLowerCase()
    const redirectTo = `${siteUrl}/atur-sandi?undangan=1`

    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo,
        data: {
          account_type: 'investor',
          full_name: input.legalName,
        },
      },
    )

    if (inviteError || !invited.user) {
      throw new ConflictError(
        inviteError?.message ?? 'Supabase Auth did not return an invited user.',
        'Undangan tidak dapat dikirim. Pastikan surel belum digunakan oleh akun lain.',
      )
    }

    const userId = invited.user.id

    const { error: accountError } = await service.from('user_accounts').insert({
      id: userId,
      account_type: 'investor',
      email: normalizedEmail,
      full_name: input.legalName,
    })

    if (accountError) {
      await service.auth.admin.deleteUser(userId)
      throw new ConflictError(
        accountError.message,
        'Akun investor tidak dapat dibuat. Undangan telah dibatalkan.',
      )
    }

    const { data: investor, error: investorError } = await service
      .from('investors')
      .insert({
        id: userId,
        reference_code: '',
        investor_type: input.investorType,
        legal_name: input.legalName,
        organization_name:
          input.investorType === 'institution' ? (input.organizationName?.trim() ?? null) : null,
      })
      .select('id, reference_code, status')
      .single()

    if (investorError || !investor) {
      await service.from('user_accounts').delete().eq('id', userId)
      await service.auth.admin.deleteUser(userId)
      throw new ConflictError(
        investorError?.message ?? 'Investor record was not created.',
        'Profil investor tidak dapat dibuat. Undangan telah dibatalkan.',
      )
    }

    audit({
      entityId: investor.id,
      summary: `Undangan investor ${investor.reference_code} dikirim ke ${normalizedEmail}.`,
      changes: {
        referenceCode: { before: null, after: investor.reference_code },
        email: { before: null, after: normalizedEmail },
        investorType: { before: null, after: input.investorType },
      },
    })

    return {
      investorId: investor.id,
      referenceCode: investor.reference_code,
      status: investor.status,
      email: normalizedEmail,
    }
  },
})
