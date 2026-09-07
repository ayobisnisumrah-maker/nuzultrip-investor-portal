import type { Metadata } from 'next'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Dokumen & Data Room' }

const KIND_LABELS: Record<string, string> = {
  company_profile: 'Profil perusahaan',
  legal: 'Legal',
  financial: 'Keuangan',
  ownership: 'Kepemilikan',
  offering: 'Penawaran Equity',
  due_diligence: 'Uji tuntas',
  investor_update: 'Pembaruan investor',
  other: 'Dokumen lainnya',
}

const VISIBILITY_LABELS: Record<string, string> = {
  investors: 'Seluruh investor',
  restricted: 'Akses khusus',
}

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function InvestorDocumentsPage() {
  const principal = await requireInvestorPage('/investor/documents')
  const supabase = await getServerSupabase()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, summary, kind, visibility, status, published_version_id, updated_at')
    .eq('status', 'published')
    .in('visibility', ['investors', 'restricted'])
    .order('updated_at', { ascending: false })

  return (
    <Stack gap={8}>
      <RealtimeRefresher topic={topics.allInvestors()} kinds={['document.published']} />
      <RealtimeRefresher
        topic={topics.investor(principal.investorId)}
        kinds={['investor.document_shared', 'investor.document_revoked']}
      />
      <PageHeader
        eyebrow="Dokumen Investor"
        title="Dokumen & Data Room"
        description="Akses dokumen perusahaan dan materi investor yang tersedia untuk akun Anda sesuai hak akses."
      />
      {!documents?.length ? (
        <EmptyState
          title="Belum ada dokumen"
          description="Dokumen yang telah diterbitkan atau diberikan akses kepada akun Anda akan muncul di sini."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader>
                <CardTitle>{document.title}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-3">
                  <p className="text-body-sm text-fg-muted">
                    {document.summary || 'Dokumen perusahaan yang tersedia untuk akun investor Anda.'}
                  </p>
                  <div className="text-caption text-fg-subtle flex flex-wrap gap-2">
                    <span>{KIND_LABELS[document.kind] ?? humanize(document.kind)}</span>
                    <span>•</span>
                    <span>
                      {VISIBILITY_LABELS[document.visibility] ?? humanize(document.visibility)}
                    </span>
                  </div>
                  {document.published_version_id ? (
                    <a
                      href={`/investor/documents/${document.id}`}
                      className="text-body-sm text-link font-medium hover:underline"
                    >
                      Buka dokumen →
                    </a>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Stack>
  )
}
