import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPages } from '@/server/portal/queries'

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'review':
      return 'Review'
    case 'approved':
      return 'Approved'
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
    default:
      return status
  }
}

function pageKindLabel(kind: string) {
  switch (kind) {
    case 'home':
      return 'Beranda'
    case 'standard':
      return 'Standard'
    case 'legal':
      return 'Legal'
    default:
      return kind
  }
}

export default async function PortalPagesPage() {
  const principal = await adminWithPermission(
    'portal.view',
    '/admin/portal/pages',
  )

  if (!principal) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-body-sm text-fg-muted">
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
          <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">
            Portal & Content
          </p>

          <h1 className="mt-1 font-display text-heading-lg text-fg">
            Halaman
          </h1>

          <p className="mt-2 max-w-2xl text-body-sm text-fg-muted">
            Kelola halaman yang ditampilkan kepada calon investor dan investor.
          </p>
        </div>

        <Link
          href="/admin/portal/pages/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Buat Halaman
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {pages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-body font-medium text-fg">
              Belum ada halaman.
            </p>

            <p className="mt-1 text-body-sm text-fg-muted">
              Buat halaman pertama untuk mulai membangun Portal.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-body font-semibold text-fg">
                      {page.title}
                    </h2>

                    <span className="rounded-full border border-border px-2 py-0.5 text-caption text-fg-muted">
                      {statusLabel(page.status)}
                    </span>

                    {page.is_system ? (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-caption text-fg-subtle">
                        Sistem
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption text-fg-subtle">
                    <span>/{page.slug}</span>
                    <span>{pageKindLabel(page.page_kind)}</span>
                  </div>
                </div>

                <Link
                  href={`/admin/portal/pages/${page.id}`}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-fg hover:bg-muted"
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
