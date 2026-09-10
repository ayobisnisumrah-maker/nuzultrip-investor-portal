import 'server-only'

import { NextResponse } from 'next/server'

import { getServiceRoleClient } from '@/server/admin/service-client'
import { getPrincipal } from '@/server/auth/session'
import { getServerSupabase } from '@/server/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getPrincipal()
  if (principal.kind !== 'investor' || !principal.hasDataAccess) {
    return NextResponse.json({ error: 'Akses investor diperlukan.' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await getServerSupabase()
  const { data: report } = await supabase
    .from('financial_reports')
    .select('published_version_id')
    .eq('id', id)
    .eq('status', 'published')
    .eq('visibility', 'investors')
    .maybeSingle()
  if (!report?.published_version_id)
    return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 })

  const { data: version } = await supabase
    .from('financial_report_versions')
    .select('document_asset_id')
    .eq('id', report.published_version_id)
    .maybeSingle()
  if (!version?.document_asset_id)
    return NextResponse.json({ error: 'Lampiran belum tersedia.' }, { status: 404 })

  const service = getServiceRoleClient()
  const { data: asset } = await service
    .from('media_assets')
    .select('bucket, path, original_filename')
    .eq('id', version.document_asset_id)
    .maybeSingle()
  if (!asset) return NextResponse.json({ error: 'Lampiran tidak ditemukan.' }, { status: 404 })
  const { data: signed } = await service.storage
    .from(asset.bucket)
    .createSignedUrl(asset.path, 60, { download: asset.original_filename ?? undefined })
  if (!signed?.signedUrl)
    return NextResponse.json({ error: 'Lampiran tidak dapat dibuka.' }, { status: 500 })
  return NextResponse.redirect(signed.signedUrl, 307)
}
