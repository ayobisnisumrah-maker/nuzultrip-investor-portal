import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, LockKeyhole, Users } from 'lucide-react'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'
import { PublicationBadge, VisibilityBadge } from '@/ui/status'

export const metadata: Metadata = { title: 'Data Room' }

export default async function DataRoomPage() {
  const principal = await adminWithPermission('documents.view', '/admin/data-room')
  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk melihat Data Room.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const [{ data: documents, error }, { data: grants }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, title, summary, kind, visibility, status, published_version_id, updated_at')
      .in('visibility', ['investors', 'restricted'])
      .order('updated_at', { ascending: false }),
    principal.permissions.has('investor_documents.view')
      ? supabase
          .from('document_access_grants')
          .select('document_id')
          .is('revoked_at', null)
      : Promise.resolve({ data: null, error: null }),
  ])

  if (error) {
    return (
      <Alert tone="danger" title="Data Room tidak dapat dimuat">
        Sistem gagal mengambil dokumen Data Room. Silakan coba lagi.
      </Alert>
    )
  }

  const grantCount = new Map<string, number>()
  for (const grant of grants ?? []) {
    grantCount.set(grant.document_id, (grantCount.get(grant.document_id) ?? 0) + 1)
  }

  const rows = documents ?? []
  const published = rows.filter((item) => item.status === 'published').length
  const restricted = rows.filter((item) => item.visibility === 'restricted').length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Dokumen"
        title="Data Room"
        description="Pusat kontrol dokumen yang dapat diakses investor, termasuk dokumen umum investor dan dokumen restricted yang diberikan per akun."
        actions={
          principal.permissions.has('documents.create') ? (
            <Button asChild>
              <Link href="/admin/documents/new">+ Tambah Dokumen</Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex items-center gap-3 py-5">
            <FileText className="text-fg-muted size-5" aria-hidden="true" />
            <div>
              <p className="text-caption text-fg-muted">Total Data Room</p>
              <p className="text-heading-sm text-fg font-semibold">{rows.length}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3 py-5">
            <Users className="text-fg-muted size-5" aria-hidden="true" />
            <div>
              <p className="text-caption text-fg-muted">Sudah terbit</p>
              <p className="text-heading-sm text-fg font-semibold">{published}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3 py-5">
            <LockKeyhole className="text-fg-muted size-5" aria-hidden="true" />
            <div>
              <p className="text-caption text-fg-muted">Restricted</p>
              <p className="text-heading-sm text-fg font-semibold">{restricted}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dokumen Data Room</CardTitle>
        </CardHeader>
        <CardBody>
          {!rows.length ? (
            <EmptyState
              title="Data Room masih kosong"
              description="Tambahkan dokumen dengan visibilitas Investor atau Restricted dari modul Dokumen. Tidak ada data dummy yang dibuat otomatis."
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
                    <p className="text-body-sm text-fg-muted mt-1 line-clamp-2">
                      {document.summary || 'Belum ada ringkasan dokumen.'}
                    </p>
                    <p className="text-caption text-fg-subtle mt-2">
                      Diperbarui {formatDateTime(document.updated_at)}
                      {document.visibility === 'restricted'
                        ? ` · ${grantCount.get(document.id) ?? 0} akses aktif`
                        : ' · tersedia untuk seluruh investor yang memenuhi akses'}
                    </p>
                  </div>
                  <Button asChild variant="secondary">
                    <Link href={`/admin/documents/${document.id}`}>Kelola</Link>
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
