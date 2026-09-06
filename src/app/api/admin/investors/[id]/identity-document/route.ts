import 'server-only'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hasPermission } from '@/core/auth/principal'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { getPrincipal } from '@/server/auth/session'

const uuidSchema = z.string().uuid()
const BUCKET = 'investor-documents'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getPrincipal()
  if (principal.kind === 'anonymous') {
    return NextResponse.json({ error: 'Anda harus login.' }, { status: 401 })
  }
  if (
    principal.kind !== 'admin' ||
    (!hasPermission(principal, 'investors.view') &&
      !hasPermission(principal, 'investor_documents.view'))
  ) {
    return NextResponse.json({ error: 'Anda tidak memiliki izin melihat dokumen ini.' }, { status: 403 })
  }

  const { id } = await params
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'Investor tidak valid.' }, { status: 400 })
  }

  const serviceClient = getServiceRoleClient()
  const { data: investor, error } = await serviceClient
    .from('investors')
    .select('ktp_storage_bucket, ktp_storage_path')
    .eq('id', id)
    .maybeSingle()

  if (error || !investor?.ktp_storage_path || investor.ktp_storage_bucket !== BUCKET) {
    return NextResponse.json({ error: 'Dokumen identitas tidak ditemukan.' }, { status: 404 })
  }

  const { data, error: signedError } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUrl(investor.ktp_storage_path, 60)

  if (signedError || !data?.signedUrl) {
    return NextResponse.json({ error: 'Dokumen tidak dapat dibuka saat ini.' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
