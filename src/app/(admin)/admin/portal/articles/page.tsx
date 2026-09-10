import Link from 'next/link'

import { PortalArticleManager } from '@/features/admin/portal-article-manager'
import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPages, listPortalPageSections } from '@/server/portal/queries'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default async function PortalArticlesPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal/articles')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat Artikel & Berita portal.
        </p>
      </div>
    )
  }

  const pages = (await listPortalPages()).filter((page) => page.status !== 'archived')
  const homePage = pages.find((page) => page.page_kind === 'home') ?? pages[0] ?? null

  if (!homePage) {
    return (
      <div className="space-y-6">
        <Link href="/admin/portal" className="text-caption text-fg-muted hover:text-fg">← Kembali ke Portal</Link>
        <div className="border-border bg-surface rounded-xl border p-6">
          <h1 className="font-display text-heading-lg text-fg">Artikel & Berita</h1>
          <p className="text-body-sm text-fg-muted mt-2">Belum ada halaman portal aktif.</p>
        </div>
      </div>
    )
  }

  const sections = await listPortalPageSections(homePage.id)
  const articleSection = sections.find((section) => section.section_kind === 'rich_content') ?? null

  if (!articleSection || !articleSection.current_version || !isRecord(articleSection.current_version.content)) {
    return (
      <div className="space-y-6">
        <Link href="/admin/portal" className="text-caption text-fg-muted hover:text-fg">← Kembali ke Portal</Link>
        <div className="border-border bg-surface rounded-xl border p-6">
          <h1 className="font-display text-heading-lg text-fg">Artikel & Berita</h1>
          <p className="text-body-sm text-fg-muted mt-2">
            Bagian Konten Fleksibel belum tersedia pada halaman portal. Tambahkan bagian Konten Fleksibel terlebih dahulu; setelah itu konten Artikel & Berita dapat dikelola dari halaman ini.
          </p>
          <Link href={`/admin/portal/pages/${homePage.id}`} className="bg-primary text-primary-foreground mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold">
            Buka Editor Halaman
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/portal" className="text-caption text-fg-muted hover:text-fg">← Kembali ke Portal</Link>
        <div className="mt-4 max-w-3xl">
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">Portal & Konten</p>
          <h1 className="font-display text-heading-lg text-fg mt-1">Artikel & Berita</h1>
          <p className="text-body-sm text-fg-muted mt-2">
            Buat dan kelola Artikel serta Berita dari Dashboard Admin. Perubahan disimpan ke draf; setelah diterbitkan, portal publik memperbarui konten melalui kanal realtime portal yang sudah aktif.
          </p>
        </div>
      </div>

      <PortalArticleManager
        pageId={homePage.id}
        pageStatus={homePage.status}
        sectionId={articleSection.id}
        initialContent={articleSection.current_version.content}
        canUpdate={principal.permissions.has('portal.update')}
      />
    </div>
  )
}
