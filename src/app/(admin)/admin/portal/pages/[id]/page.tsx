import Link from 'next/link'
import { notFound } from 'next/navigation'

import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPageSections, getPortalPage } from '@/server/portal/queries'
import { PortalPageEditor } from '@/features/admin/portal-page-editor'

export default async function PortalPageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('portal.view', `/admin/portal/pages/${id}`)

  if (!principal) {
    return <div className="rounded-xl border border-border bg-surface p-6"><h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1><p className="mt-2 text-body-sm text-fg-muted">Anda tidak memiliki izin untuk melihat halaman ini.</p></div>
  }

  const page = await getPortalPage(id)
  if (!page) notFound()

  const sections = await listPortalPageSections(id)
  const canUpdate = principal.permissions.has('portal.update' as never)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/portal/pages" className="text-caption text-fg-muted hover:text-fg">← Kembali ke Halaman</Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">Portal & Content</p>
            <h1 className="mt-1 font-display text-heading-lg text-fg">{page.title}</h1>
            <p className="mt-1 text-body-sm text-fg-muted">/{page.slug}</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-border px-3 py-1 text-caption text-fg-muted">{page.status}</span>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-body font-semibold text-fg">Section Builder</h2>
            <p className="mt-1 text-caption text-fg-muted">Susun konten terstruktur tanpa HTML mentah. Setiap penyimpanan membuat versi draft baru.</p>
          </div>
          <span className="text-caption text-fg-subtle">{sections.length} section</span>
        </div>
        <PortalPageEditor pageId={page.id} sections={sections} canUpdate={canUpdate} />
      </section>

      <aside className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-body font-semibold text-fg">Informasi Halaman</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-caption text-fg-subtle">Jenis</dt><dd className="mt-1 text-fg">{page.page_kind}</dd></div>
          <div><dt className="text-caption text-fg-subtle">Posisi</dt><dd className="mt-1 text-fg">{page.position}</dd></div>
          <div><dt className="text-caption text-fg-subtle">Halaman Sistem</dt><dd className="mt-1 text-fg">{page.is_system ? 'Ya' : 'Tidak'}</dd></div>
          <div><dt className="text-caption text-fg-subtle">Published</dt><dd className="mt-1 text-fg">{page.published_at ? new Date(page.published_at).toLocaleString('id-ID') : 'Belum pernah'}</dd></div>
        </dl>
      </aside>
    </div>
  )
}
