import 'server-only'

import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import { hasPermission } from '@/core/auth/principal'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { getPrincipal } from '@/server/auth/session'
import { writeAudit } from '@/server/audit'
import { emitBrandRefresh } from '@/server/realtime/brand-refresh'

const BUCKET = 'public-media'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

function extensionFor(file: File) {
  const ext = file.name
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (ext && ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext)) return ext
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/avif') return 'avif'
  return 'jpg'
}

export async function POST(request: Request) {
  const principal = await getPrincipal()
  if (principal.kind === 'anonymous') {
    return NextResponse.json({ error: 'Anda harus login.' }, { status: 401 })
  }
  if (principal.kind !== 'admin' || !hasPermission(principal, 'company_profile.update')) {
    return NextResponse.json(
      { error: 'Anda tidak memiliki izin mengubah profil perusahaan.' },
      { status: 403 },
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Pilih file logo terlebih dahulu.' }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Ukuran logo harus lebih dari 0 dan maksimal 5 MB.' },
      { status: 400 },
    )
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Logo harus berformat JPG, PNG, WebP, atau AVIF.' },
      { status: 400 },
    )
  }

  const serviceClient = getServiceRoleClient()
  const { data: previousSetting } = await serviceClient
    .from('site_settings')
    .select('value')
    .eq('key', 'brand.logo')
    .maybeSingle()

  const previous =
    previousSetting?.value &&
    typeof previousSetting.value === 'object' &&
    !Array.isArray(previousSetting.value)
      ? (previousSetting.value as Record<string, unknown>)
      : null

  const objectPath = `brand/logo-${randomUUID()}.${extensionFor(file)}`
  const bytes = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) {
    return NextResponse.json({ error: 'Logo gagal diunggah ke storage.' }, { status: 500 })
  }

  const publicUrl = serviceClient.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl
  const value = {
    bucket: BUCKET,
    path: objectPath,
    public_url: publicUrl,
    original_filename: file.name,
    mime_type: file.type,
    byte_size: file.size,
    updated_at: new Date().toISOString(),
  }

  const { error: settingError } = await serviceClient.from('site_settings').upsert(
    {
      key: 'brand.logo',
      value,
      description:
        'Logo utama perusahaan untuk portal publik, autentikasi, dasbor Admin, dasbor Investor, dan metadata browser.',
      is_public: true,
      updated_by: principal.userId,
    },
    { onConflict: 'key' },
  )

  if (settingError) {
    await serviceClient.storage.from(BUCKET).remove([objectPath])
    return NextResponse.json(
      { error: 'Logo terunggah tetapi konfigurasi brand gagal disimpan.' },
      { status: 500 },
    )
  }

  const previousPath = previous?.path
  if (
    previous?.bucket === BUCKET &&
    typeof previousPath === 'string' &&
    previousPath &&
    previousPath !== objectPath
  ) {
    await serviceClient.storage.from(BUCKET).remove([previousPath])
  }

  await writeAudit(principal, {
    action: 'company_profile.logo_updated',
    entityType: 'company_profile',
    entityId: null,
    summary: 'Logo perusahaan diperbarui dari Profil Perusahaan.',
    changes: {
      logo: {
        before: previous
          ? { path: previous.path ?? null, fileName: previous.original_filename ?? null }
          : null,
        after: { path: objectPath, fileName: file.name },
      },
    },
  })

  await emitBrandRefresh()

  return NextResponse.json({ ok: true, logo: value })
}
