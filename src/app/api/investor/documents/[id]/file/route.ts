import 'server-only'

import { NextResponse } from 'next/server'

import { getPrincipal } from '@/server/auth/session'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { getServerSupabase } from '@/server/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const principal = await getPrincipal()

  if (principal.kind !== 'investor') {
    return NextResponse.json({ error: 'Akses investor diperlukan.' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await getServerSupabase()

  // This query deliberately uses the request-scoped client. RLS is the access
  // boundary: investors only receive published documents visible to all
  // investors or restricted documents explicitly granted to their account.
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, published_version_id')
    .eq('id', id)
    .eq('status', 'published')
    .in('visibility', ['investors', 'restricted'])
    .maybeSingle()

  if (documentError || !document?.published_version_id) {
    return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 })
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .select('file_asset_id')
    .eq('id', document.published_version_id)
    .maybeSingle()

  if (versionError || !version?.file_asset_id) {
    return NextResponse.json({ error: 'File dokumen belum tersedia.' }, { status: 404 })
  }

  const service = getServiceRoleClient()
  const { data: asset, error: assetError } = await service
    .from('media_assets')
    .select('bucket, path, original_filename')
    .eq('id', version.file_asset_id)
    .maybeSingle()

  if (assetError || !asset) {
    return NextResponse.json({ error: 'File dokumen tidak ditemukan.' }, { status: 404 })
  }

  const { data: signed, error: signedError } = await service.storage
    .from(asset.bucket)
    .createSignedUrl(asset.path, 60, {
      download: asset.original_filename ?? undefined,
    })

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'File tidak dapat dibuka saat ini.' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl, 307)
}
