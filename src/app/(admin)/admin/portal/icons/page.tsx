import Link from 'next/link'

import { PortalIconManager } from '@/features/admin/portal-icon-manager'
import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPages, listPortalPageSections } from '@/server/portal/queries'

type IconSectionKind = 'business_overview' | 'ecosystem' | 'investor_updates'

type PortalSectionContent = {
  kind: IconSectionKind
  items?: unknown
  [key: string]: unknown
}

const ICON_SECTION_KINDS = new Set<IconSectionKind>([
  'business_overview',
  'ecosystem',
  'investor_updates',
])

const SECTION_LABELS: Record<IconSectionKind, string> = {
  business_overview: 'Tentang Nuzultrip',
  ecosystem: 'Ekosistem Bisnis',
  investor_updates: 'Pembaruan Investor',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIconSectionKind(value: string): value is IconSectionKind {
  return ICON_SECTION_KINDS.has(value as IconSectionKind)
}

export default async function PortalIconsPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal/icons')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat pengelola ikon portal.
        </p>
      </div>
    )
  }

  const pages = (await listPortalPages()).filter((page) => page.status !== 'archived')
  const sectionGroups = await Promise.all(
    pages.map(async (page) => ({
      page,
      sections: await listPortalPageSections(page.id),
    })),
  )

  const iconSections = sectionGroups.flatMap(({ page, sections }) =>
    sections.flatMap((section) => {
      if (!isIconSectionKind(section.section_kind)) return []

      const rawContent = section.current_version?.content
      if (!isRecord(rawContent)) return []
      if (!Array.isArray(rawContent.items)) return []

      const content: PortalSectionContent = {
        ...rawContent,
        kind: section.section_kind,
      }

      return [
        {
          pageId: page.id,
          pageTitle: page.title,
          pageStatus: page.status,
          sectionId: section.id,
          sectionKind: section.section_kind,
          sectionLabel: SECTION_LABELS[section.section_kind],
          content,
        },
      ]
    }),
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/portal" className="text-caption text-fg-muted hover:text-fg">
          ← Kembali ke Portal
        </Link>
        <div className="mt-4 max-w-3xl">
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Portal & Konten
          </p>
          <h1 className="font-display text-heading-lg text-fg mt-1">Ikon Portal</h1>
          <p className="text-body-sm text-fg-muted mt-2">
            Kelola ikon item portal dari satu tempat. Tersedia 25 pilihan ikon bawaan dan opsi unggah ikon sendiri. Perubahan disimpan ke versi draf dan mengikuti alur publikasi portal yang sama.
          </p>
        </div>
      </div>

      <div className="border-primary/20 bg-primary/5 rounded-xl border p-4">
        <p className="text-fg text-sm font-semibold">Cara kerja</p>
        <p className="text-fg-muted mt-1 text-xs leading-5">
          Ikon unggahan memiliki prioritas. Jika tidak ada file unggahan, portal memakai ikon bawaan yang dipilih. Halaman yang sudah terbit perlu dimulai sebagai revisi sebelum ikon dapat diubah.
        </p>
      </div>

      <PortalIconManager
        sections={iconSections}
        canUpdate={principal.permissions.has('portal.update')}
      />
    </div>
  )
}
