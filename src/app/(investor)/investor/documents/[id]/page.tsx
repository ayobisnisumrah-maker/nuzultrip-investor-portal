import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'

export const metadata: Metadata = { title: 'Dokumen' }

export default async function InvestorDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireInvestorPage()
  const { id } = await params
  const supabase = await getServerSupabase()

  const { data: document } = await supabase
    .from('documents')
    .select('id, title, summary, kind, visibility, status, published_version_id')
    .eq('id', id)
    .eq('status', 'published')
    .in('visibility', ['investors', 'restricted'])
    .maybeSingle()

  if (!document || !document.published_version_id) notFound()

  const { data: version } = await supabase
    .from('document_versions')
    .select('title, content, file_asset_id, version_number, published_at')
    .eq('id', document.published_version_id)
    .maybeSingle()

  if (!version) notFound()

  const content = version.content as Record<string, unknown>

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Data Room"
        title={version.title || document.title}
        description={document.summary || 'Dokumen investor.'}
      />
      <Card>
        <CardHeader>
          <CardTitle>Informasi dokumen</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-body-sm grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-fg-subtle">Versi</span>
              <div className="font-mono">v{version.version_number}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Status</span>
              <div>{document.status}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Kategori</span>
              <div>{document.kind}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Akses</span>
              <div>{document.visibility}</div>
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Konten</CardTitle>
        </CardHeader>
        <CardBody>
          <pre className="border-border-subtle bg-surface-subtle text-caption text-fg-muted overflow-auto rounded-xl border p-4 whitespace-pre-wrap">
            {JSON.stringify(content, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </Stack>
  )
}
