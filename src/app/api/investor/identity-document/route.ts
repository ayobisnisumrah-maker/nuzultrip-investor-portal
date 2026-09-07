import 'server-only'

import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getPrincipal } from '@/server/auth/session'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { writeAudit } from '@/server/audit'

const BUCKET = 'investor-documents'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

function safeFilename(filename: string) {
  const cleaned = filename
    .normalize('NFKC')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/[^\p{L}\p{N}._ -]/gu, '')
    .trim()
  return cleaned || 'identitas'
}

export async function POST(request: Request) {
  const principal = await getPrincipal()
  if (principal.kind === 'anonymous') {
    return NextResponse.json({ error: 'Anda harus login.' }, { status: 401 })
  }
  if (principal.kind !== 'investor') {
    return NextResponse.json({ error: 'Endpoint ini khusus investor.' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dokumen identitas wajib dipilih.' }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ukuran dokumen harus lebih dari 0 dan maksimal 10 MB.' }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Format dokumen harus PDF, JPG, PNG, atau WebP.' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const objectPath = `${principal.investorId}/identity/${randomUUID()}-${safeFilename(file.name)}`
  const serviceClient = getServiceRoleClient()

  const { data: previous } = await serviceClient
    .from('investors')
    .select('ktp_storage_bucket, ktp_storage_path, ktp_original_file_name')
    .eq('id', principal.investorId)
    .maybeSingle()

  const { error: uploadError } = await serviceClient.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) {
    return NextResponse.json({ error: 'Dokumen gagal diunggah.' }, { status: 500 })
  }

  const uploadedAt = new Date().toISOString()
  const { error: updateError } = await serviceClient
    .from('investors')
    .update({
      ktp_storage_bucket: BUCKET,
      ktp_storage_path: objectPath,
      ktp_original_file_name: file.name,
      ktp_mime_type: file.type,
      ktp_file_size_bytes: file.size,
      ktp_uploaded_at: uploadedAt,
    })
    .eq('id', principal.investorId)

  if (updateError) {
    await serviceClient.storage.from(BUCKET).remove([objectPath])
    return NextResponse.json({ error: 'Metadata dokumen gagal disimpan.' }, { status: 500 })
  }

  if (
    previous?.ktp_storage_bucket === BUCKET &&
    previous.ktp_storage_path &&
    previous.ktp_storage_path !== objectPath
  ) {
    await serviceClient.storage.from(BUCKET).remove([previous.ktp_storage_path])
  }

  await writeAudit(principal, {
    action: 'investor.identity_document_uploaded',
    entityType: 'investor',
    entityId: principal.investorId,
    summary: `Investor ${principal.referenceCode} mengunggah dokumen identitas.`,
    changes: {
      identityDocument: {
        before: { fileName: previous?.ktp_original_file_name ?? null },
        after: { fileName: file.name, uploadedAt },
      },
    },
  })

  return NextResponse.json({ ok: true, fileName: file.name, uploadedAt })
}
