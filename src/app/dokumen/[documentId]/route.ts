import { NextResponse } from 'next/server'

import { ANONYMOUS } from '@/core/auth/principal'
import { writeAudit } from '@/server/audit'
import { createPublicDocumentSignedUrl } from '@/server/admin/public-document-link'
import { getServerSupabase } from '@/server/supabase/server'

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await context.params
  const supabase = await getServerSupabase()

  // This request-scoped query is the authorisation boundary. Anonymous RLS can
  // see only published documents whose visibility is exactly `public`.
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, title, published_version_id')
    .eq('id', documentId)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .not('published_version_id', 'is', null)
    .maybeSingle()

  if (documentError || !document?.published_version_id) {
    return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 })
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .select('id, file_asset_id, published_at, status')
    .eq('id', document.published_version_id)
    .eq('document_id', document.id)
    .eq('status', 'published')
    .maybeSingle()

  if (versionError || !version?.file_asset_id || !version.published_at) {
    return NextResponse.json({ error: 'Berkas dokumen tidak tersedia.' }, { status: 404 })
  }

  // The service-role signing operation below is intentionally preceded by an
  // immutable anonymous audit record. Never put the signed URL in the audit log.
  await writeAudit(ANONYMOUS, {
    action: 'document.public_download_requested',
    entityType: 'document',
    entityId: document.id,
    summary: `Dokumen publik ${document.title} diminta melalui portal.`,
  })

  const signedUrl = await createPublicDocumentSignedUrl(version.file_asset_id)

  if (!signedUrl) {
    return NextResponse.json({ error: 'Berkas dokumen tidak tersedia.' }, { status: 404 })
  }

  return NextResponse.redirect(signedUrl, 302)
}
