import 'server-only'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getPrincipal } from '@/server/auth/session'
import { getServerSupabase } from '@/server/supabase/server'

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional()

const requestSchema = z.object({
  email: z.string().trim().email().max(320).optional(),
  whatsappNumber: nullableText(32),
  country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
  city: nullableText(120),
  address: nullableText(1000),
  organizationName: nullableText(180),
  organizationRole: nullableText(120),
  bankName: nullableText(120),
  bankAccountName: nullableText(160),
  bankAccountNumber: z.string().trim().regex(/^[0-9 .-]{4,40}$/).nullable().optional(),
  reason: z.string().trim().min(3).max(2000),
})

function putIfPresent(
  target: Record<string, string | null>,
  source: Record<string, unknown>,
  sourceKey: string,
  targetKey: string,
) {
  if (!Object.prototype.hasOwnProperty.call(source, sourceKey)) return
  const value = source[sourceKey]
  target[targetKey] = typeof value === 'string' ? value.trim() || null : null
}

export async function POST(request: Request) {
  const principal = await getPrincipal()
  if (principal.kind === 'anonymous') {
    return NextResponse.json({ error: 'Anda harus login.' }, { status: 401 })
  }
  if (principal.kind !== 'investor') {
    return NextResponse.json({ error: 'Endpoint ini khusus investor.' }, { status: 403 })
  }
  if (!['approved', 'active', 'inactive'].includes(principal.status)) {
    return NextResponse.json(
      { error: 'Pengajuan perubahan tersedia setelah investor diverifikasi.' },
      { status: 403 },
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data perubahan tidak valid.' },
      { status: 400 },
    )
  }

  const source = parsed.data as unknown as Record<string, unknown>
  const changes: Record<string, string | null> = {}
  putIfPresent(changes, source, 'email', 'email')
  putIfPresent(changes, source, 'whatsappNumber', 'whatsapp_number')
  putIfPresent(changes, source, 'country', 'country')
  putIfPresent(changes, source, 'city', 'city')
  putIfPresent(changes, source, 'address', 'address')
  putIfPresent(changes, source, 'organizationName', 'organization_name')
  putIfPresent(changes, source, 'organizationRole', 'organization_role')
  putIfPresent(changes, source, 'bankName', 'bank_name')
  putIfPresent(changes, source, 'bankAccountName', 'bank_account_name')
  putIfPresent(changes, source, 'bankAccountNumber', 'bank_account_number')

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: 'Pilih sedikitnya satu data yang ingin diubah.' }, { status: 400 })
  }

  const supabase = await getServerSupabase()
  const { data, error } = await supabase.schema('app').rpc('request_investor_profile_change', {
    p_changes: changes,
    p_reason: parsed.data.reason,
  })

  if (error) {
    const message = error.message.includes('one_open')
      ? 'Masih ada pengajuan perubahan yang belum selesai.'
      : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }

  return NextResponse.json({ id: data }, { status: 201 })
}
