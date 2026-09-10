import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPrincipal } from '@/server/auth/session'
import { hasPermission } from '@/core/auth/principal'
import { getServiceRoleClient } from '@/server/admin/service-client'

const BUCKET = 'investor-documents'
const FINANCIAL_BUCKET = 'financial-documents'
const MAX_BYTES = 100 * 1024 * 1024
const PORTAL_BUCKET = 'public-media'
const PORTAL_MAX_BYTES = 6 * 1024 * 1024
const PORTAL_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const FINANCIAL_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
])

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function safeFilename(filename: string) {
  const cleaned = filename
    .normalize('NFKC')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/[^\p{L}\p{N}._ -]/gu, '')
    .trim()

  return cleaned || 'document'
}

export async function POST(request: Request) {
  const principal = await getPrincipal()

  if (principal.kind === 'anonymous') {
    return NextResponse.json({ error: 'Anda harus login.' }, { status: 401 })
  }

  if (principal.kind !== 'admin') {
    return NextResponse.json(
      { error: 'Anda tidak memiliki izin mengunggah media.' },
      { status: 403 },
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const requestedPurpose = formData.get('purpose')
  const purpose =
    requestedPurpose === 'portal'
      ? 'portal'
      : requestedPurpose === 'financial-report'
        ? 'financial-report'
        : requestedPurpose === 'finance-branding'
          ? 'finance-branding'
        : 'document'

  const permitted =
    purpose === 'financial-report' || purpose === 'finance-branding'
      ? hasPermission(principal, 'financial_reports.update')
      : hasPermission(principal, 'media.upload')
  if (!permitted) {
    return NextResponse.json(
      { error: 'Anda tidak memiliki izin mengunggah media.' },
      { status: 403 },
    )
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File wajib dipilih.' }, { status: 400 })
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: 'File kosong tidak diperbolehkan.' }, { status: 400 })
  }

  const maxBytes = purpose === 'portal' || purpose === 'finance-branding' ? PORTAL_MAX_BYTES : MAX_BYTES
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error:
          purpose === 'portal' || purpose === 'finance-branding' ? 'Ukuran gambar maksimal 6 MB.' : 'Ukuran file maksimal 100 MB.',
      },
      { status: 400 },
    )
  }

  const allowedMimeTypes =
    purpose === 'portal' || purpose === 'finance-branding'
      ? PORTAL_MIME_TYPES
      : purpose === 'financial-report'
        ? FINANCIAL_MIME_TYPES
        : ALLOWED_MIME_TYPES
  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Format file tidak didukung.' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const checksum = createHash('sha256').update(bytes).digest('hex')

  const assetId = randomUUID()
  const objectPath = `${assetId}/${safeFilename(file.name)}`
  const bucket =
    purpose === 'portal'
      ? PORTAL_BUCKET
      : purpose === 'financial-report'
        ? FINANCIAL_BUCKET
        : BUCKET

  const serviceClient = getServiceRoleClient()

  /*
   * Service-role is required here because investor-documents is a private
   * bucket and Storage object writes are brokered server-side.
   */
  const { error: uploadError } = await serviceClient.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'File gagal diunggah ke storage.' }, { status: 500 })
  }

  const { data: asset, error: assetError } = await serviceClient
    .from('media_assets')
    .insert({
      id: assetId,
      bucket,
      path: objectPath,
      original_filename: file.name,
      mime_type: file.type,
      byte_size: file.size,
      checksum_sha256: checksum,
      visibility: purpose === 'portal' ? 'public' : 'restricted',
      uploaded_by: principal.adminId,
      finalized_at: new Date().toISOString(),
    })
    .select('id, bucket, path, original_filename, mime_type, byte_size')
    .single()

  if (assetError || !asset) {
    /*
     * Roll back the Storage object if metadata finalisation fails.
     */
    await serviceClient.storage.from(bucket).remove([objectPath])

    return NextResponse.json({ error: 'Metadata file gagal disimpan.' }, { status: 500 })
  }

  const publicUrl =
    purpose === 'portal'
      ? serviceClient.storage.from(PORTAL_BUCKET).getPublicUrl(objectPath).data.publicUrl
      : undefined

  return NextResponse.json({
    ok: true,
    asset: { ...asset, public_url: publicUrl },
  })
}
