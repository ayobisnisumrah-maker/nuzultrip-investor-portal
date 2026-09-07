import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'

export const metadata: Metadata = { title: 'Dokumen' }

const VISIBILITY_LABELS: Record<string, string> = {
  investors: 'Semua investor',
  restricted: 'Akses khusus',
  public: 'Publik',
  internal: 'Internal',
}

const KIND_LABELS: Record<string, string> = {
  company_profile: 'Profil perusahaan',
  investor_report: 'Laporan investor',
  business_update: 'Pembaruan bisnis',
  financial_report: 'Laporan keuangan',
  legal: 'Dokumen legal',
  other: 'Dokumen lainnya',
}

function readableContent(content: Record<string, unknown>) {
  const entries = Object.entries(content).filter(([, value]) => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return typeof value === 'number' || typeof value === 'boolean'
  })

  return entries
}

export default async function InvestorDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const principal = await requireInvestorPage()
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

  const content = (version.content ?? {}) as Record<string, unknown>
  const contentEntries = readableContent(content)

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Data Room"
        title={version.title || document.title}
        description={document.summary || 'Dokumen investor.'}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Informasi dokumen</CardTitle>
            {version.file_asset_id ? (
              <a
                href={`/api/investor/documents/${document.id}/file`}
                className="bg-primary-solid text-primary-fg inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition hover:opacity-90"
              >
                Unduh dokumen
              </a>
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          <div className="text-body-sm grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-fg-subtle">Versi</span>
              <div className="font-mono">v{version.version_number}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Status</span>
              <div>Terbit</div>
            </div>
            <div>
              <span className="text-fg-subtle">Kategori</span>
              <div>{KIND_LABELS[document.kind] ?? document.kind}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Akses</span>
              <div>{VISIBILITY_LABELS[document.visibility] ?? document.visibility}</div>
            </div>
          </div>

          {version.published_at ? (
            <p className="text-caption text-fg-subtle mt-4">
              Diterbitkan {new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'long',
                timeZone: principal.timezone,
              }).format(new Date(version.published_at))}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {contentEntries.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan isi</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4">
              {contentEntries.map(([key, value]) => (
                <div key={key} className="border-border-subtle border-b pb-4 last:border-0 last:pb-0">
                  <div className="text-caption text-fg-subtle font-medium uppercase tracking-wide">
                    {key.replaceAll('_', ' ')}
                  </div>
                  <div className="text-body-sm text-fg mt-1 whitespace-pre-wrap">
                    {Array.isArray(value)
                      ? value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n')
                      : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {!version.file_asset_id && contentEntries.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-body-sm text-fg-muted">
              Dokumen ini sudah diterbitkan, tetapi belum memiliki file atau konten tambahan.
            </p>
          </CardBody>
        </Card>
      ) : null}
    </Stack>
  )
}
