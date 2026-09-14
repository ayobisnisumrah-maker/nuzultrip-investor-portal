'use server'

import { createHash } from 'node:crypto'

import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { getClientEnv } from '@/lib/env'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { defineAction } from '@/server/auth/guards'

const inviteInvestorSchema = z.object({
  legalName: z.string().trim().min(2, 'Nama investor wajib diisi.').max(160),
  identityNumber: z.string().trim().regex(/^\d{16}$/, 'Nomor KTP/NIK harus terdiri dari 16 digit.'),
  phone: z.string().trim().min(8, 'Nomor HP wajib diisi.').max(20),
  email: z.string().trim().email('Format email tidak valid.').max(320),
  address: z.string().trim().min(5, 'Alamat wajib diisi.').max(500),
  investorType: z.enum(['individual', 'institution']).default('individual'),
  organizationName: z.string().trim().max(200).nullable().optional(),
})

function normalizeIndonesianPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('62')) return `+${digits}`
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`
  return `+${digits}`
}

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
    const normalizedPhone = normalizeIndonesianPhone(input.phone)
    const identityNumberHash = createHash('sha256').update(input.identityNumber).digest('hex')
    const redirectTo = `${siteUrl}/atur-sandi?undangan=1`

    const { data: duplicateIdentity } = await service
      .from('investors')
      .select('id')
      .eq('identity_number_hash', identityNumberHash)
      .maybeSingle()

    if (duplicateIdentity) {
      throw new ConflictError(
        'Investor identity already exists.',
        'Nomor KTP/NIK sudah terdaftar pada investor lain.',
      )
    }

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
        'Undangan tidak dapat dikirim. Pastikan email belum digunakan oleh akun lain.',
      )
    }

    const userId = invited.user.id

    const { data: provisioned, error: provisionError } = await service.rpc('provision_investor_account', {
      p_user_id: userId,
      p_email: normalizedEmail,
      p_full_name: input.legalName,
      p_legal_name: input.legalName,
      p_investor_type: input.investorType,
      p_phone: normalizedPhone,
      p_country: 'ID',
      p_city: null,
      p_address: input.address,
      p_organization_name:
        input.investorType === 'institution' ? (input.organizationName?.trim() ?? null) : null,
      p_organization_role: null,
      p_application_note: 'Didaftarkan oleh Admin melalui portal investor.',
      p_identity_number_hash: identityNumberHash,
    })

    if (provisionError || !provisioned) {
      await service.auth.admin.deleteUser(userId)
      throw new ConflictError(
        provisionError?.message ?? 'Investor profile was not provisioned.',
        'Profil investor tidak dapat dibuat. Undangan telah dibatalkan.',
      )
    }

    const provisionedResult = provisioned as { investorId?: string; referenceCode?: string }
    const investorId = provisionedResult.investorId ?? userId
    const referenceCode = provisionedResult.referenceCode ?? ''

    /*
     * WhatsApp confirmation is intentionally queued through the canonical
     * notification/outbox subsystem in the follow-up integration PR. We do not
     * call an external provider directly from this transaction: investor
     * provisioning and the Auth invitation must remain deterministic and must
     * not fail merely because a WhatsApp provider is temporarily unavailable.
     */

    audit({
      entityId: investorId,
      summary: `Investor ${referenceCode} didaftarkan dan tautan aktivasi dikirim ke ${normalizedEmail}.`,
      changes: {
        referenceCode: { before: null, after: referenceCode },
        email: { before: null, after: normalizedEmail },
        phone: { before: null, after: normalizedPhone },
        investorType: { before: null, after: input.investorType },
        identityVerifiedByFingerprint: { before: null, after: true },
      },
    })

    return {
      investorId,
      referenceCode,
      status: 'submitted' as const,
      email: normalizedEmail,
      phone: normalizedPhone,
    }
  },
})
