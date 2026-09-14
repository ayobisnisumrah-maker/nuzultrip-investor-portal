'use server'

import { createHash } from 'node:crypto'
import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { getClientEnv } from '@/lib/env'
import { getServerEnv } from '@/lib/server-env'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { defineAction } from '@/server/auth/guards'
import { sendInvestorInvitationWhatsApp } from '@/server/notifications/whatsapp-delivery'

const inviteInvestorSchema = z.object({
  legalName: z.string().trim().min(2, 'Nama investor wajib diisi.').max(160),
  identityNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'Nomor KTP/NIK wajib terdiri dari 16 digit.'),
  whatsappNumber: z
    .string()
    .trim()
    .min(8, 'Nomor WhatsApp terlalu pendek.')
    .max(32)
    .regex(/^\+?[0-9()\-\s]+$/, 'Format nomor WhatsApp tidak valid.'),
  email: z.string().trim().email('Format surel tidak valid.').max(320),
  address: z.string().trim().min(5, 'Alamat wajib diisi.').max(500),
  investorType: z.enum(['individual', 'institution']).default('individual'),
  organizationName: z.string().trim().max(200).nullable().optional(),
})

function hashIdentityNumber(value: string): string {
  return createHash('sha256')
    .update(`${getServerEnv().IDENTITY_HASH_SALT}:${value.replace(/\s+/g, '')}`)
    .digest('hex')
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
    let provisioned: { investorId: string; referenceCode: string }

    try {
      const { data, error } = await service.rpc('provision_investor_account', {
        p_user_id: userId,
        p_email: normalizedEmail,
        p_full_name: input.legalName,
        p_legal_name: input.legalName,
        p_investor_type: input.investorType,
        p_phone: input.whatsappNumber.trim(),
        p_country: 'ID',
        p_address: input.address.trim(),
        p_organization_name:
          input.investorType === 'institution' ? input.organizationName?.trim() || undefined : undefined,
        p_identity_number_hash: hashIdentityNumber(input.identityNumber),
      })

      if (error) {
        throw new ConflictError(
          error.message,
          'Profil calon investor tidak dapat dibuat. Undangan telah dibatalkan.',
        )
      }

      provisioned = data as { investorId: string; referenceCode: string }
    } catch (error) {
      await service.auth.admin.deleteUser(userId).catch(() => {})
      throw error
    }

    // Delivery is deliberately outside the provisioning rollback boundary. Once
    // the Auth + domain account exists, a provider outage must never delete the
    // newly-created account or leave the investor unable to use the email invite.
    let whatsapp: { status: 'sent' | 'skipped' | 'failed' }
    try {
      const delivery = await sendInvestorInvitationWhatsApp({
        to: input.whatsappNumber,
        investorName: input.legalName,
        email: normalizedEmail,
      })
      whatsapp = { status: delivery.status }
    } catch {
      whatsapp = { status: 'failed' }
    }

    audit({
      entityId: provisioned.investorId,
      summary: `Calon investor ${provisioned.referenceCode} didaftarkan oleh Admin dan tautan aktivasi dikirim ke ${normalizedEmail}.`,
      changes: {
        referenceCode: { before: null, after: provisioned.referenceCode },
        email: { before: null, after: normalizedEmail },
        investorType: { before: null, after: input.investorType },
        identityNumber: { before: null, after: '[hashed]' },
        whatsappConfigured: { before: null, after: true },
        addressConfigured: { before: null, after: true },
        whatsappDelivery: { before: null, after: whatsapp.status },
      },
    })

    return {
      investorId: provisioned.investorId,
      referenceCode: provisioned.referenceCode,
      status: 'prospective' as const,
      email: normalizedEmail,
      whatsappDelivery: whatsapp.status,
    }
  },
})
