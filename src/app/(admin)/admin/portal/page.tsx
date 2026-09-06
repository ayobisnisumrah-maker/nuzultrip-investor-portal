import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getPortalNavigationItems } from '@/server/portal/navigation-queries'
import { listPortalMediaAssets } from '@/server/portal/media-queries'
import { listPortalPages, listPortalPageSections } from '@/server/portal/queries'

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

export default async function PortalPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat ringkasan portal.
        </p>
      </div>
    )
  }

  const [pages, navigation, media] = await Promise.all([
    listPortalPages(),
    getPortalNavigationItems(),
    listPortalMediaAssets(),
  ])

  const activePage =
    pages.find((page) => page.page_kind === 'home' && page.status !== 'archived') ??
    pages.find((page) => page.status !== 'archived') ??
    null

  const sections = activePage ? await listPortalPageSections(activePage.id) : []
  const visibleSections = sections.filter((section) => section.is_visible)
  const pendingSections = visibleSections.filter((section) => {
    const current = section.current_version
    return current && current.id !== section.published_version_id
  })

  const publishedPages = pages.filter((page) => page.status === 'published').length
  const draftPages = pages.filter((page) => page.status === 'draft').length
  const reviewPages = pages.filter((page) => page.status === 'review').length
  const activeNavigation = navigation.filter((item) => item.is_visible).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Portal & Konten
          </p>
          <h1 className="font-display text-heading-lg text-fg mt-1">Ringkasan Portal</h1>
          <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
            Pantau status publikasi, revisi konten, navigasi, dan aset media dari satu tempat.
          </p>
        </div>

        {activePage ? (
          <Link
            href={`/admin/portal/pages/${activePage.id}`}
            className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold"
          >
            Kelola Halaman Aktif
          </Link>
        ) : (
          <Link
            href="/admin/portal/pages/new"
            className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold"
          >
            Buat Halaman
          </Link>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Halaman Terbit</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{publishedPages}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Draf / Ditinjau</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{draftPages + reviewPages}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Navigasi Aktif</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{activeNavigation}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Aset Media</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{media.length}</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="border-border bg-surface overflow-hidden rounded-xl border">
          <div className="border-border border-b px-5 py-4">
            <h2 className="text-fg text-sm font-semibold">Halaman Aktif</h2>
            <p className="text-fg-muted mt-1 text-xs">
              Status halaman utama dan revisi konten yang belum dipublikasikan.
            </p>
          </div>

          {activePage ? (
            <div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-fg font-semibold">{activePage.title}</p>
                  <p className="text-fg-muted mt-1 text-xs">/{activePage.slug}</p>
                </div>
                <span className="border-border text-fg-muted inline-flex w-fit rounded-full border px-3 py-1 text-xs">
                  {statusLabel(activePage.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-fg-muted text-xs">Bagian</p>
                  <p className="text-fg mt-1 text-lg font-semibold">{sections.length}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-fg-muted text-xs">Bagian Tampil</p>
                  <p className="text-fg mt-1 text-lg font-semibold">{visibleSections.length}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-fg-muted text-xs">Revisi Belum Terbit</p>
                  <p className="text-fg mt-1 text-lg font-semibold">{pendingSections.length}</p>
                </div>
              </div>

              {pendingSections.length > 0 ? (
                <div className="border-primary/25 bg-primary/5 mt-4 rounded-lg border p-4">
                  <p className="text-fg text-sm font-medium">
                    Ada {pendingSections.length} bagian dengan revisi yang belum menjadi versi publik.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-fg-muted p-8 text-center text-sm">
              Belum ada halaman portal aktif.
            </div>
          )}
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <h2 className="text-fg text-sm font-semibold">Akses Cepat</h2>
          <div className="mt-4 grid gap-2">
            <Link href="/admin/portal/pages" className="border-border hover:bg-muted rounded-lg border px-4 py-3 text-sm">
              Halaman
            </Link>
            <Link href="/admin/portal/navigation" className="border-border hover:bg-muted rounded-lg border px-4 py-3 text-sm">
              Navigasi
            </Link>
            <Link href="/admin/portal/media" className="border-border hover:bg-muted rounded-lg border px-4 py-3 text-sm">
              Media
            </Link>
            <Link href="/admin/portal/documents" className="border-border hover:bg-muted rounded-lg border px-4 py-3 text-sm">
              Dokumen Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
