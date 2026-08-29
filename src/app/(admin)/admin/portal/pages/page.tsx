import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPages } from '@/server/portal/queries'

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Draf'
    case 'review':
      return 'Ditinjau'
    case 'approved':
      return 'Disetujui'
    case 'published':
      return 'Terbit'
    case 'archived':
      return 'Diarsipkan'
    default:
      return status
  }
}

function pageKindLabel(kind: string) {
  switch (kind) {
    case 'home':
      return 'Beranda'
    case 'standard':
      return 'Halaman Standar'
    case 'legal':
      return 'Halaman Legal'
    default:
      return kind
  }
}

export default async function PortalPagesPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal/pages')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat halaman Portal.
        </p>
      </div>
    )
  }

  const pages = await listPortalPages()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Portal & Content
          </p>

          <h1 className="font-display text-heading-lg text-fg mt-1">Halaman</h1>

          <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
            Kelola halaman yang ditampilkan kepada calon investor dan investor.
          </p>
        </div>

        <Link
          href="/admin/portal/pages/new"
          className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium hover:opacity-90"
        >
          + Buat Halaman
        </Link>
      </div>

      <div className="border-border bg-surface overflow-hidden rounded-xl border">
        {pages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-body text-fg font-medium">Belum ada halaman.</p>

            <p className="text-body-sm text-fg-muted mt-1">
              Buat halaman pertama untuk mulai membangun Portal.
            </p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-body text-fg truncate font-semibold">{page.title}</h2>

                    <span className="border-border text-caption text-fg-muted rounded-full border px-2 py-0.5">
                      {statusLabel(page.status)}
                    </span>

                    {page.is_system ? (
                      <span className="border-border bg-muted text-caption text-fg-subtle rounded-full border px-2 py-0.5">
                        Sistem
                      </span>
                    ) : null}
                  </div>

                  <div className="text-caption text-fg-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>/{page.slug}</span>
                    <span>{pageKindLabel(page.page_kind)}</span>
                  </div>
                </div>

                <Link
                  href={`/admin/portal/pages/${page.id}`}
                  className="border-border text-fg hover:bg-muted inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium"
                >
                  Kelola
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
