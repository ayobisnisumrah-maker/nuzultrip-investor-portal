import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, FileSearch, TimerReset } from 'lucide-react'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { PUBLICATION_STATUS_LABELS } from '@/core/documents/publication'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'
import { PublicationBadge, VisibilityBadge } from '@/ui/status'

export const metadata: Metadata = { title: 'Verifikasi Dokumen' }

export default async function DocumentVerificationPage() {
  const principal = await adminWithPermission('documents.review', '/admin/documents/verification')
  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk membuka antrean verifikasi dokumen.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, summary, kind, visibility, status, current_version_id, updated_at')
    .in('status', ['review', 'approved'])
    .order('updated_at', { ascending: true })

  if (error) {
    return (
      <Alert tone="danger" title="Antrean verifikasi tidak dapat dimuat">
        Sistem gagal mengambil dokumen yang sedang dalam proses peninjauan.
      </Alert>
    )
  }

  const rows = documents ?? []
  const reviewCount = rows.filter((item) => item.status === 'review').length
  const approvedCount = rows.filter((item) => item.status === 'approved').length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Dokumen"
        title="Verifikasi Dokumen"
        description="Antrean dokumen yang sedang ditinjau atau sudah disetujui dan menunggu publikasi. Tindakan persetujuan dan penerbitan tetap dilakukan pada detail dokumen sesuai izin masing-masing."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/documents">Semua Dokumen</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody className="flex items-center gap-3 py-5"><FileSearch className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Dalam antrean</p><p className="text-heading-sm text-fg font-semibold">{rows.length}</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3 py-5"><TimerReset className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Perlu ditinjau</p><p className="text-heading-sm text-fg font-semibold">{reviewCount}</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3 py-5"><CheckCircle2 className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Siap terbit</p><p className="text-heading-sm text-fg font-semibold">{approvedCount}</p></div></CardBody></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Antrean Peninjauan</CardTitle></CardHeader>
        <CardBody>
          {!rows.length ? (
            <EmptyState
              title="Tidak ada dokumen menunggu verifikasi"
              description="Dokumen berstatus Ditinjau atau Disetujui akan muncul di sini secara otomatis."
            />
          ) : (
            <div className="divide-border divide-y">
              {rows.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/documents/${document.id}`} className="text-fg font-semibold hover:underline">
                        {document.title}
                      </Link>
                      <PublicationBadge status={document.status} />
                      <VisibilityBadge visibility={document.visibility} />
                    </div>
                    <p className="text-body-sm text-fg-muted mt-1 line-clamp-2">{document.summary || 'Belum ada ringkasan dokumen.'}</p>
                    <p className="text-caption text-fg-subtle mt-2">
                      {PUBLICATION_STATUS_LABELS[document.status]} · diperbarui {formatDateTime(document.updated_at)}
                    </p>
                  </div>
                  <Button asChild variant="secondary">
                    <Link href={`/admin/documents/${document.id}`}>Periksa Dokumen</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
