import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { hasAllPermissions } from '@/core/auth/principal'
import { detectLogoMime, LOGO_MAX_BYTES } from '@/core/media/logo-file'
import { writeAudit } from '@/server/audit'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { getPrincipal } from '@/server/auth/session'
import { getServerSupabase } from '@/server/supabase/server'

const BUCKET = 'public-media'

function safeFilename(filename: string) {
  return (
    filename
      .normalize('NFKC')
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/[^\p{L}\p{N}._ -]/gu, '')
      .trim() || 'logo'
  )
}

export async function POST(request: Request) {
  const principal = await getPrincipal()
  if (principal.kind === 'anonymous')
    return NextResponse.json({ error: 'Anda harus login.' }, { status: 401 })
  if (
    principal.kind !== 'admin' ||
    !hasAllPermissions(principal, ['portal.manage_theme', 'media.upload'])
  ) {
    return NextResponse.json({ error: 'Anda tidak memiliki izin mengganti logo.' }, { status: 403 })
  }

  const file = (await request.formData()).get('file')
  if (!(file instanceof File) || file.size <= 0)
    return NextResponse.json({ error: 'File logo wajib dipilih.' }, { status: 400 })
  if (file.size > LOGO_MAX_BYTES)
    return NextResponse.json({ error: 'Ukuran logo maksimal 2 MB.' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())
  const mimeType = detectLogoMime(bytes)
  if (!mimeType || mimeType !== file.type)
    return NextResponse.json(
      { error: 'File bukan gambar PNG, JPG, atau WebP yang valid.' },
      { status: 400 },
    )

  const supabase = await getServerSupabase()
  const { data: theme, error: themeError } = await supabase
    .from('portal_theme')
    .select('id, logo_asset_id')
    .eq('is_active', true)
    .single()
  if (themeError || !theme)
    return NextResponse.json({ error: 'Tema portal aktif tidak ditemukan.' }, { status: 409 })

  const assetId = randomUUID()
  const objectPath = `brand/${assetId}/${safeFilename(file.name)}`
  const serviceClient = getServiceRoleClient()

  // public-media exposes reads only. Its writes are brokered here after the
  // permission and file-signature checks above, then recorded in the audit log.
  const { error: uploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: false,
    })
  if (uploadError)
    return NextResponse.json({ error: 'Logo gagal diunggah ke penyimpanan.' }, { status: 500 })

  const cleanupNewAsset = async () => {
    await serviceClient.from('media_assets').delete().eq('id', assetId)
    await serviceClient.storage.from(BUCKET).remove([objectPath])
  }

  const { error: assetError } = await serviceClient.from('media_assets').insert({
    id: assetId,
    bucket: BUCKET,
    path: objectPath,
    original_filename: file.name,
    mime_type: mimeType,
    byte_size: file.size,
    checksum_sha256: createHash('sha256').update(bytes).digest('hex'),
    visibility: 'public',
    alt_text: 'Logo Nuzultrip',
    uploaded_by: principal.userId,
    finalized_at: new Date().toISOString(),
  })
  if (assetError) {
    await cleanupNewAsset()
    return NextResponse.json({ error: 'Metadata logo gagal disimpan.' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('portal_theme')
    .update({ logo_asset_id: assetId })
    .eq('id', theme.id)
    .select('id')
    .single()
  if (updateError) {
    await cleanupNewAsset()
    return NextResponse.json({ error: 'Logo gagal diterapkan ke portal.' }, { status: 500 })
  }

  try {
    await writeAudit(principal, {
      action: 'company_profile.logo_update',
      entityType: 'portal_theme',
      entityId: theme.id,
      summary: 'Logo portal publik diperbarui dari Profil Perusahaan.',
      changes: { logo_asset_id: { before: theme.logo_asset_id, after: assetId } },
    })
  } catch {
    // Restore with the same brokered server authority used to create the
    // asset: the privileged change must not survive without an audit record.
    await serviceClient
      .from('portal_theme')
      .update({ logo_asset_id: theme.logo_asset_id })
      .eq('id', theme.id)
    await cleanupNewAsset()
    return NextResponse.json(
      { error: 'Logo tidak diterapkan karena audit gagal dicatat.' },
      { status: 500 },
    )
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
