import Link from 'next/link'

import { PortalModulePage } from '@/features/admin/portal-module-page'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getPublicDocuments } from '@/server/portal/public-queries'

export default async function PortalDocumentsPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal/documents')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat Dokumen Portal.
        </p>
      </div>
    )
  }

  const publicDocuments = await getPublicDocuments()

  return (
    <div className="space-y-6">
      <PortalModulePage
        kind="documents"
        title="Dokumen Portal"
        description="Atur judul dan deskripsi area dokumen pada portal publik. Daftar file berasal dari Pustaka Dokumen yang berstatus Terbit dan visibilitas Publik."
        permission="portal.update"
        returnPath="/admin/portal/documents"
      />

      <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-fg text-sm font-semibold">Dokumen Publik Aktif</p>
            <p className="text-fg-muted mt-1 max-w-2xl text-xs leading-5">
              Ini adalah sumber data tunggal dokumen yang tampil dan dapat diunduh calon investor.
              Publikasikan file dari Pustaka Dokumen dengan visibilitas Publik; jangan menambahkan
              tautan dokumen secara manual di konten Portal.
            </p>
          </div>
          <Link
            href="/admin/documents?status=published&visibility=public"
            className="border-border text-fg inline-flex shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted/40"
          >
            Kelola Pustaka Dokumen →
          </Link>
        </div>

        <div className="mt-5 space-y-2">
          {publicDocuments.length ? (
            publicDocuments.map((document) => (
              <div
                key={document.id}
                className="border-border flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-fg text-sm font-medium">{document.title}</p>
                  {document.summary ? (
                    <p className="text-fg-muted mt-1 text-xs">{document.summary}</p>
                  ) : null}
                </div>
                <Link
                  href={document.href}
                  target="_blank"
                  className="text-primary shrink-0 text-xs font-semibold hover:underline"
                >
                  Buka dokumen →
                </Link>
              </div>
            ))
          ) : (
            <div className="border-border text-fg-muted rounded-lg border border-dashed p-5 text-center text-sm">
              Belum ada dokumen berstatus Terbit dengan visibilitas Publik.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
