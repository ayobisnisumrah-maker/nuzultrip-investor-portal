'use server'

import { createHash } from 'node:crypto'
import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { getClientEnv } from '@/lib/env'
import { getServerEnv } from '@/lib/server-env'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { defineAction } from '@/server/auth/guards'
import {
  isValidE164Phone,
  normalizeIndonesianPhone,
  sendInvestorInvitationWhatsApp,
} from '@/server/notifications/whatsapp'

const inviteInvestorSchema = z.object({
  legalName: z.string().trim().min(2, 'Nama lengkap wajib diisi.').max(160),
  identityNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => /^\d{16}$/.test(value), 'NIK/KTP harus terdiri dari 16 digit.'),
  phone: z.string().trim().min(8, 'Nomor HP wajib diisi.').max(24),
  email: z.string().trim().email('Format surel tidak valid.').max(320),
  address: z.string().trim().min(5, 'Alamat wajib diisi.').max(1000),
  investorType: z.enum(['individual', 'institution']).default('individual'),
  organizationName: z.string().trim().max(200).nullable().optional(),
})

function hashIdentityNumber(value: string): string {
  return createHash('sha256')
    .update(`${getServerEnv().IDENTITY_HASH_SALT}:${value}`)
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
    const normalizedPhone = normalizeIndonesianPhone(input.phone)

    if (!isValidE164Phone(normalizedPhone)) {
      throw new ConflictError(
        'Investor phone number is not valid E.164.',
        'Nomor HP tidak valid. Gunakan nomor aktif, misalnya 0812xxxx atau +62812xxxx.',
      )
    }

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

    try {
      const { data: provisioned, error: provisionError } = await service.rpc(
        'provision_investor_account',
        {
          p_user_id: userId,
          p_email: normalizedEmail,
          p_full_name: input.legalName,
          p_legal_name: input.legalName,
          p_investor_type: input.investorType,
          p_phone: normalizedPhone,
          p_address: input.address,
          p_country: 'ID',
          p_identity_number_hash: hashIdentityNumber(input.identityNumber),
          p_organization_name:
            input.investorType === 'institution'
              ? (input.organizationName?.trim() || undefined)
              : undefined,
        },
      )

      if (provisionError || !provisioned) {
        throw new Error(provisionError?.message ?? 'Investor provisioning returned no data.')
      }

      const provisionedRecord = provisioned as { investorId?: string; referenceCode?: string }
      const investorId = provisionedRecord.investorId ?? userId

      const { data: investor, error: investorError } = await service
        .from('investors')
        .select('id, reference_code, status')
        .eq('id', investorId)
        .single()

      if (investorError || !investor) {
        throw new Error(investorError?.message ?? 'Investor record was not readable after provisioning.')
      }

      const whatsapp = await sendInvestorInvitationWhatsApp({
        phone: normalizedPhone,
        name: input.legalName,
        email: normalizedEmail,
      })

      audit({
        entityId: investor.id,
        summary: `Investor ${investor.reference_code} didaftarkan oleh admin dan undangan aktivasi dikirim.`,
        changes: {
          referenceCode: { before: null, after: investor.reference_code },
          email: { before: null, after: normalizedEmail },
          phone: { before: null, after: normalizedPhone },
          addressProvided: { before: false, after: true },
          identityNumberHashProvided: { before: false, after: true },
          whatsappDelivery: { before: null, after: whatsapp.status },
        },
      })

      return {
        investorId: investor.id,
        referenceCode: investor.reference_code,
        status: investor.status,
        email: normalizedEmail,
        phone: normalizedPhone,
        whatsappStatus: whatsapp.status,
      }
    } catch (error) {
      await service.auth.admin.deleteUser(userId).catch(() => {})
      throw new ConflictError(
        error instanceof Error ? error.message : 'Investor provisioning failed.',
        'Profil investor tidak dapat dibuat. Undangan telah dibatalkan agar dapat dicoba kembali.',
      )
    }
  },
})
