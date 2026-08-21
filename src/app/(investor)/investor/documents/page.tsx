import type { Metadata } from 'next'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Dokumen & Data Room' }

export default async function InvestorDocumentsPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, summary, kind, visibility, status, published_version_id, updated_at')
    .eq('status', 'published')
    .in('visibility', ['investors', 'restricted'])
    .order('updated_at', { ascending: false })

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Protected Content" title="Dokumen & Data Room" description="Dokumen yang tersedia untuk akun investor Anda." />
      {!documents?.length ? (
        <EmptyState title="Belum ada dokumen" description="Dokumen yang telah dipublikasikan untuk investor akan muncul di sini." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader>
                <CardTitle>{document.title}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-3">
                  <p className="text-body-sm text-fg-muted">{document.summary || 'Dokumen investor.'}</p>
                  <div className="flex flex-wrap gap-2 text-caption text-fg-subtle">
                    <span>{document.kind}</span>
                    <span>•</span>
                    <span>{document.visibility}</span>
                  </div>
                  {document.published_version_id ? (
                    <a
                      href={`/investor/documents/${document.id}`}
                      className="text-body-sm font-medium text-link hover:underline"
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
