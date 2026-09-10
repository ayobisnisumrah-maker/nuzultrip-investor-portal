import { NextResponse } from 'next/server'
import { hasPermission } from '@/core/auth/principal'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { getPrincipal } from '@/server/auth/session'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getPrincipal()
  if (principal.kind !== 'admin' || !hasPermission(principal, 'financial_reports.view'))
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  const { id } = await params
  const service = getServiceRoleClient()
  const { data: asset } = await service
    .from('media_assets')
    .select('bucket,path')
    .eq('id', id)
    .maybeSingle()
  if (!asset) return NextResponse.json({ error: 'Gambar tidak ditemukan.' }, { status: 404 })

  const { data, error } = await service.storage.from(asset.bucket).createSignedUrl(asset.path, 60)
  if (error || !data?.signedUrl)
    return NextResponse.json({ error: 'Gambar tidak dapat dibuka.' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl, 307)
}
