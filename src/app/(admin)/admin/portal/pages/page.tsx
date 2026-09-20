import Link from 'next/link'
import { redirect } from 'next/navigation'

import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPages } from '@/server/portal/queries'

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
  const home = pages.find((page) => page.page_kind === 'home' && page.status !== 'archived')

  if (home) {
    redirect(`/admin/portal/pages/${home.id}`)
  }

  return (
    <div className="border-border bg-surface rounded-xl border p-6">
      <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
        Portal & Konten
      </p>
      <h1 className="font-display text-heading-lg text-fg mt-1">Halaman Utama</h1>
      <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
        Halaman utama portal belum tersedia. Buat halaman Beranda terlebih dahulu.
      </p>
      <Link
        href="/admin/portal/pages/new"
        className="bg-primary text-primary-foreground mt-5 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium hover:opacity-90"
      >
        Buat Halaman Utama
      </Link>
    </div>
  )
}
