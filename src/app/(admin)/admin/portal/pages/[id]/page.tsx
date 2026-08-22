import Link from 'next/link'
import { notFound } from 'next/navigation'

import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPageSections, getPortalPage } from '@/server/portal/queries'
import { PortalPageEditor } from '@/features/admin/portal-page-editor'

export default async function PortalPageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('portal.view', `/admin/portal/pages/${id}`)

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat halaman ini.
        </p>
      </div>
    )
  }

  const page = await getPortalPage(id)
  if (!page) notFound()

  const sections = await listPortalPageSections(id)
  const canUpdate = principal.permissions.has('portal.update')
  const canPublish = principal.permissions.has('portal.publish')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/portal/pages" className="text-caption text-fg-muted hover:text-fg">
          ← Kembali ke Halaman
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
              Portal & Content
            </p>
            <h1 className="font-display text-heading-lg text-fg mt-1">{page.title}</h1>
            <p className="text-body-sm text-fg-muted mt-1">/{page.slug}</p>
          </div>
          <span className="border-border text-caption text-fg-muted inline-flex w-fit rounded-full border px-3 py-1">
            {page.status}
          </span>
        </div>
      </div>

      <section className="border-border bg-surface rounded-xl border p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-body text-fg font-semibold">Section Builder</h2>
            <p className="text-caption text-fg-muted mt-1">
              Susun konten terstruktur tanpa HTML mentah. Setiap penyimpanan membuat versi draft
              baru.
            </p>
          </div>
          <span className="text-caption text-fg-subtle">{sections.length} section</span>
        </div>
        <PortalPageEditor
          pageId={page.id}
          sections={sections}
          canUpdate={canUpdate}
          canPublish={canPublish}
          pageStatus={page.status}
        />
      </section>

      <aside className="border-border bg-surface rounded-xl border p-6">
        <h2 className="text-body text-fg font-semibold">Informasi Halaman</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-caption text-fg-subtle">Jenis</dt>
            <dd className="text-fg mt-1">{page.page_kind}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Posisi</dt>
            <dd className="text-fg mt-1">{page.position}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Halaman Sistem</dt>
            <dd className="text-fg mt-1">{page.is_system ? 'Ya' : 'Tidak'}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Published</dt>
            <dd className="text-fg mt-1">
              {page.published_at
                ? new Date(page.published_at).toLocaleString('id-ID')
                : 'Belum pernah'}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}
