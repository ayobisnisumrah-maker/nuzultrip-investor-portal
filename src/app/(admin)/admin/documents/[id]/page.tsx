import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  PUBLICATION_STATUS_LABELS,
} from '@/core/documents/publication'
import { hasPermission } from '@/core/auth/principal'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { Stack } from '@/ui/layout'
import { PublicationBadge, VisibilityBadge } from '@/ui/status'
import { DocumentActions } from '@/features/admin/document-actions'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

const kinds: Record<string, string> = {
  investment_proposal: 'Proposal investasi',
  pitch_deck: 'Pitch deck',
  investor_report: 'Laporan investor',
  business_update: 'Pembaruan bisnis',
  supporting: 'Pendukung',
}

export default async function AdminDocumentDetailPage({
  params,
}: PageProps) {
  const principal = await requireAdminPage('/admin/documents')

  if (!hasPermission(principal, 'documents.view')) {
    return (
      <Alert
        tone="info"
        title="Akses terbatas"
      >
        Peran Anda tidak memiliki izin untuk melihat dokumen.
      </Alert>
    )
  }

  const { id } = await params
  const supabase = await getServerSupabase()

  const [
    { data: document, error: documentError },
    { data: versions, error: versionsError },
  ] = await Promise.all([
    supabase
      .from('documents')
      .select(
        'id, title, slug, kind, summary, status, visibility, owner_admin_id, current_version_id, published_version_id, archived_at, created_at, updated_at',
      )
      .eq('id', id)
      .maybeSingle(),

    supabase
      .from('document_versions')
      .select(
        'id, document_id, version_number, title, status, change_note, file_asset_id, approved_at, published_at, created_at',
      )
      .eq('document_id', id)
      .order('version_number', { ascending: false }),
  ])

  if (documentError) {
    return (
      <Alert
        tone="danger"
        title="Dokumen tidak dapat dimuat"
      >
        Sistem gagal mengambil data dokumen.
      </Alert>
    )
  }

  if (!document) {
    notFound()
  }

  if (versionsError) {
    return (
      <Alert
        tone="danger"
        title="Versi dokumen tidak dapat dimuat"
      >
        Sistem gagal mengambil riwayat versi dokumen.
      </Alert>
    )
  }

  const permissions = Array.from(principal.permissions)

  const currentVersion = (versions ?? []).find(
    (version) => version.id === document.current_version_id,
  )

  const publishedVersion = (versions ?? []).find(
    (version) => version.id === document.published_version_id,
  )

  const status = document.status

  return (
    <Stack gap={8}>
      <header>
        <Link
          href="/admin/documents"
          className="text-body-sm text-fg-muted hover:underline"
        >
          ← Kembali ke Dokumen
        </Link>

        <div className="mt-4">
          <p className="text-caption font-medium uppercase tracking-[0.18em] text-fg-subtle">
            Investor Relations / Dokumen
          </p>

          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">
                {document.title}
              </h1>

              {document.summary ? (
                <p className="mt-2 max-w-3xl text-body-sm text-fg-muted">
                  {document.summary}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PublicationBadge status={status} />
              <VisibilityBadge visibility={document.visibility} />
            </div>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Dokumen</CardTitle>
        </CardHeader>

        <CardBody>
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-fg-muted">
              Perubahan status mengikuti workflow dan permission yang
              ditetapkan oleh sistem.
            </p>

            <div className="flex flex-wrap gap-3">
              <DocumentActions
                documentId={document.id}
                title={document.title}
                status={status}
                permissions={permissions}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Tipe</p>
            <p className="mt-2 text-body-sm font-medium">
              {kinds[document.kind] ?? document.kind}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Visibilitas</p>
            <div className="mt-2">
              <VisibilityBadge visibility={document.visibility} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Versi aktif</p>
            <p className="mt-2 text-body-sm font-medium">
              {currentVersion
                ? `v${currentVersion.version_number}`
                : 'Belum tersedia'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Versi terbit</p>
            <p className="mt-2 text-body-sm font-medium">
              {publishedVersion
                ? `v${publishedVersion.version_number}`
                : 'Belum diterbitkan'}
            </p>
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Dokumen</CardTitle>
        </CardHeader>

        <CardBody>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-caption text-fg-subtle">Slug</p>
              <p className="mt-1 break-all text-body-sm">
                {document.slug}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">Status</p>
              <p className="mt-1 text-body-sm">
                {PUBLICATION_STATUS_LABELS[status]}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">Dibuat</p>
              <p className="mt-1 text-body-sm">
                {formatDateTime(document.created_at)}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">Diperbarui</p>
              <p className="mt-1 text-body-sm">
                {formatDateTime(document.updated_at)}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">
                Diarsipkan
              </p>
              <p className="mt-1 text-body-sm">
                {document.archived_at
                  ? formatDateTime(document.archived_at)
                  : '-'}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">
                Owner Admin
              </p>
              <p className="mt-1 break-all text-body-sm">
                {document.owner_admin_id ?? '-'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Versi</CardTitle>
        </CardHeader>

        <CardBody>
          {(versions ?? []).length === 0 ? (
            <p className="text-body-sm text-fg-muted">
              Belum ada versi dokumen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 font-medium">Versi</th>
                    <th className="px-3 py-3 font-medium">Judul</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">
                      Catatan Perubahan
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Dibuat
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Disetujui
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Diterbitkan
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(versions ?? []).map((version) => (
                    <tr
                      key={version.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-3 font-medium">
                        v{version.version_number}
                        {version.id === document.current_version_id ? (
                          <span className="ml-2 text-caption text-fg-muted">
                            Aktif
                          </span>
                        ) : null}
                      </td>

                      <td className="px-3 py-3">
                        {version.title}
                      </td>

                      <td className="px-3 py-3">
                        <PublicationBadge status={version.status} />
                      </td>

                      <td className="max-w-xs px-3 py-3 text-fg-muted">
                        {version.change_note ?? '-'}
                      </td>

                      <td className="px-3 py-3 text-fg-muted">
                        {formatDateTime(version.created_at)}
                      </td>

                      <td className="px-3 py-3 text-fg-muted">
                        {version.approved_at
                          ? formatDateTime(version.approved_at)
                          : '-'}
                      </td>

                      <td className="px-3 py-3 text-fg-muted">
                        {version.published_at
                          ? formatDateTime(version.published_at)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}




