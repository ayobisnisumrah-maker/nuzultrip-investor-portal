import Link from 'next/link'
import { notFound } from 'next/navigation'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getPortalPage } from '@/server/portal/queries'

export default async function PortalPageDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const principal = await adminWithPermission(
    'portal.view',
    `/admin/portal/pages/${id}`,
  )

  if (!principal) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-body-sm text-fg-muted">
          Anda tidak memiliki izin untuk melihat halaman ini.
        </p>
      </div>
    )
  }

  const page = await getPortalPage(id)

  if (!page) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/portal/pages"
          className="text-caption text-fg-muted hover:text-fg"
        >
          ← Kembali ke Halaman
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">
              Portal & Content
            </p>

            <h1 className="mt-1 font-display text-heading-lg text-fg">
              {page.title}
            </h1>

            <p className="mt-1 text-body-sm text-fg-muted">
              /{page.slug}
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-border px-3 py-1 text-caption text-fg-muted">
            {page.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-body font-semibold text-fg">
                Sections
              </h2>

              <p className="mt-1 text-caption text-fg-muted">
                Section builder akan tersedia pada tahap berikutnya.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-body-sm font-medium text-fg">
              Belum ada section
            </p>

            <p className="mt-1 text-caption text-fg-muted">
              Halaman ini belum memiliki section tersimpan.
            </p>
          </div>
        </section>

        <aside className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-body font-semibold text-fg">
            Informasi Halaman
          </h2>

          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-caption text-fg-subtle">
                Jenis
              </dt>
              <dd className="mt-1 text-fg">
                {page.page_kind}
              </dd>
            </div>

            <div>
              <dt className="text-caption text-fg-subtle">
                Posisi
              </dt>
              <dd className="mt-1 text-fg">
                {page.position}
              </dd>
            </div>

            <div>
              <dt className="text-caption text-fg-subtle">
                Halaman Sistem
              </dt>
              <dd className="mt-1 text-fg">
                {page.is_system ? 'Ya' : 'Tidak'}
              </dd>
            </div>

            <div>
              <dt className="text-caption text-fg-subtle">
                Published
              </dt>
              <dd className="mt-1 text-fg">
                {page.published_at
                  ? new Date(page.published_at).toLocaleString('id-ID')
                  : 'Belum pernah'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
