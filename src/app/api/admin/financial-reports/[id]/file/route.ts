import 'server-only'

import { NextResponse } from 'next/server'

import { hasPermission } from '@/core/auth/principal'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { getPrincipal } from '@/server/auth/session'
import { getServerSupabase } from '@/server/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getPrincipal()
  if (principal.kind !== 'admin' || !hasPermission(principal, 'financial_reports.view')) {
    return NextResponse.json({ error: 'Akses Admin diperlukan.' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await getServerSupabase()
  const { data: report } = await supabase
    .from('financial_reports')
    .select('current_version_id')
    .eq('id', id)
    .maybeSingle()
  if (!report?.current_version_id)
    return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 })

  const { data: version } = await supabase
    .from('financial_report_versions')
    .select('document_asset_id')
    .eq('id', report.current_version_id)
    .maybeSingle()
  if (!version?.document_asset_id)
    return NextResponse.json({ error: 'Lampiran belum tersedia.' }, { status: 404 })

  return signedAssetResponse(version.document_asset_id)
}

async function signedAssetResponse(assetId: string) {
  const service = getServiceRoleClient()
  const { data: asset } = await service
    .from('media_assets')
    .select('bucket, path, original_filename')
    .eq('id', assetId)
    .maybeSingle()
  if (!asset) return NextResponse.json({ error: 'Lampiran tidak ditemukan.' }, { status: 404 })
  const { data: signed } = await service.storage
    .from(asset.bucket)
    .createSignedUrl(asset.path, 60, { download: asset.original_filename ?? undefined })
  if (!signed?.signedUrl)
    return NextResponse.json({ error: 'Lampiran tidak dapat dibuka.' }, { status: 500 })
  return NextResponse.redirect(signed.signedUrl, 307)
}
