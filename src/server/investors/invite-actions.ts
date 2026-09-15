'use server'

import { createHash } from 'node:crypto'

import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { getClientEnv } from '@/lib/env'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { defineAction } from '@/server/auth/guards'

function normalizeIndonesianPhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '')

  if (/^08\d{8,12}$/.test(compact)) return `+62${compact.slice(1)}`
  if (/^628\d{8,12}$/.test(compact)) return `+${compact}`
  if (/^\+628\d{8,12}$/.test(compact)) return compact

  return null
}

function hashIdentityNumber(value: string) {
  return createHash('sha256').update(`id:ktp:${value}`, 'utf8').digest('hex')
}

const inviteInvestorSchema = z.object({
  legalName: z.string().trim().min(2, 'Nama lengkap wajib diisi.').max(160),
  identityNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'No. KTP harus terdiri dari tepat 16 digit.'),
  phone: z.string().trim().min(10, 'No. HP wajib diisi.').max(24),
  email: z.string().trim().email('Format surel tidak valid.').max(320),
  address: z.string().trim().min(5, 'Alamat wajib diisi.').max(500),
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
    const normalizedPhone = normalizeIndonesianPhone(input.phone)
    if (!normalizedPhone) {
      throw new ConflictError(
        'Invalid Indonesian phone number.',
        'Format No. HP tidak valid. Gunakan nomor Indonesia, misalnya 0812xxxx atau +62812xxxx.',
      )
    }

    const identityNumberHash = hashIdentityNumber(input.identityNumber)

    const [{ data: duplicateIdentity }, { data: duplicateAccount }] = await Promise.all([
      service
        .from('investors')
        .select('id')
        .eq('identity_number_hash', identityNumberHash)
        .maybeSingle(),
      service.from('user_accounts').select('id').eq('email', normalizedEmail).maybeSingle(),
    ])

    if (duplicateIdentity) {
      throw new ConflictError(
        'Identity number already registered.',
        'No. KTP tersebut sudah terdaftar pada profil investor lain.',
      )
    }

    if (duplicateAccount) {
      throw new ConflictError(
        'Email already registered.',
        'Surel tersebut sudah digunakan oleh akun lain.',
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

    const { error: accountError } = await service.from('user_accounts').insert({
      id: userId,
      account_type: 'investor',
      email: normalizedEmail,
      full_name: input.legalName,
      phone: normalizedPhone,
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
        identity_number_hash: identityNumberHash,
        whatsapp_number: normalizedPhone,
        address: input.address,
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
      summary: `Investor ${investor.reference_code} didaftarkan dan undangan aktivasi dikirim ke ${normalizedEmail}.`,
      changes: {
        referenceCode: { before: null, after: investor.reference_code },
        email: { before: null, after: normalizedEmail },
        phone: { before: null, after: normalizedPhone.replace(/.(?=.{4})/g, '•') },
        investorType: { before: null, after: input.investorType },
        addressCaptured: { before: false, after: true },
        identityVerifiedInputCaptured: { before: false, after: true },
      },
    })

    return {
      investorId: investor.id,
      referenceCode: investor.reference_code,
      status: investor.status,
      email: normalizedEmail,
      phone: normalizedPhone,
    }
  },
})
