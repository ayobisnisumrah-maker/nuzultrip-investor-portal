import 'server-only'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getPrincipal } from '@/server/auth/session'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { writeAudit } from '@/server/audit'

const profileSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  whatsappNumber: z.string().trim().min(6).max(32).nullable(),
  country: z.string().trim().regex(/^[A-Z]{2}$/),
  city: z.string().trim().max(120).nullable(),
  address: z.string().trim().max(1000).nullable(),
  organizationName: z.string().trim().max(180).nullable(),
  organizationRole: z.string().trim().max(120).nullable(),
  bankName: z.string().trim().max(120).nullable(),
  bankAccountName: z.string().trim().max(160).nullable(),
  bankAccountNumber: z.string().trim().regex(/^[0-9 .-]{4,40}$/).nullable(),
})

function emptyToNull(value: string | null) {
  const normalized = value?.trim() ?? ''
  return normalized.length ? normalized : null
}

export async function PATCH(request: Request) {
  const principal = await getPrincipal()
  if (principal.kind === 'anonymous') {
    return NextResponse.json({ error: 'Anda harus login.' }, { status: 401 })
  }
  if (principal.kind !== 'investor') {
    return NextResponse.json({ error: 'Endpoint ini khusus investor.' }, { status: 403 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 })
  }

  const parsed = profileSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data profil tidak valid.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  const bankValues = [input.bankName, input.bankAccountName, input.bankAccountNumber].map(emptyToNull)
  const bankFilled = bankValues.filter(Boolean).length
  if (bankFilled > 0 && bankFilled < 3) {
    return NextResponse.json(
      { error: 'Nama bank, nama pemilik rekening, dan nomor rekening harus diisi lengkap.' },
      { status: 400 },
    )
  }

  const serviceClient = getServiceRoleClient()
  const { data: before, error: readError } = await serviceClient
    .from('investors')
    .select('legal_name, whatsapp_number, country, city, address, organization_name, organization_role, bank_name, bank_account_name, bank_account_number')
    .eq('id', principal.investorId)
    .maybeSingle()

  if (readError || !before) {
    return NextResponse.json({ error: 'Profil investor tidak dapat dibaca.' }, { status: 404 })
  }

  const next = {
    legal_name: input.legalName,
    whatsapp_number: emptyToNull(input.whatsappNumber),
    country: input.country,
    city: emptyToNull(input.city),
    address: emptyToNull(input.address),
    organization_name: emptyToNull(input.organizationName),
    organization_role: emptyToNull(input.organizationRole),
    bank_name: bankValues[0],
    bank_account_name: bankValues[1],
    bank_account_number: bankValues[2],
  }

  const { error } = await serviceClient.from('investors').update(next).eq('id', principal.investorId)
  if (error) {
    return NextResponse.json({ error: 'Profil gagal disimpan. Silakan periksa data dan coba lagi.' }, { status: 500 })
  }

  await writeAudit(principal, {
    action: 'investor.profile_updated',
    entityType: 'investor',
    entityId: principal.investorId,
    summary: `Investor ${principal.referenceCode} memperbarui profil dan/atau rekening.`,
    changes: {
      profile: { before, after: next },
    },
  })

  return NextResponse.json({ ok: true })
}
