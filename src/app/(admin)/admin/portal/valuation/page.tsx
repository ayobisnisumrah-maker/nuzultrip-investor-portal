import Link from 'next/link'

import { CompanyValuationEditor } from '@/features/admin/company-valuation-editor'
import { adminWithPermission } from '@/server/auth/page-guards'
import { listOwnershipOfferings } from '@/server/ownership/offering-service'
import { listPortalPages, listPortalPageSections } from '@/server/portal/queries'
import { getServerSupabase } from '@/server/supabase/server'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default async function PortalValuationPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal/valuation')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat pengaturan valuasi portal.
        </p>
      </div>
    )
  }

  const pages = (await listPortalPages()).filter((page) => page.status !== 'archived')
  const homePage = pages.find((page) => page.page_kind === 'home') ?? pages[0] ?? null

  if (!homePage) {
    return (
      <div className="space-y-6">
        <Link href="/admin/portal" className="text-caption text-fg-muted hover:text-fg">
          ← Kembali ke Portal
        </Link>
        <div className="border-border bg-surface rounded-xl border p-6">
          <h1 className="font-display text-heading-lg text-fg">Valuasi Perusahaan</h1>
          <p className="text-body-sm text-fg-muted mt-2">Belum ada halaman portal aktif.</p>
        </div>
      </div>
    )
  }

  const sections = await listPortalPageSections(homePage.id)
  const statSection =
    sections.find((section) => section.section_kind === 'stat_grid') ??
    sections.find((section) => section.section_kind === 'financial_highlights') ??
    null

  if (!statSection || !statSection.current_version || !isRecord(statSection.current_version.content)) {
    return (
      <div className="space-y-6">
        <Link href="/admin/portal" className="text-caption text-fg-muted hover:text-fg">
          ← Kembali ke Portal
        </Link>
        <div className="border-border bg-surface rounded-xl border p-6">
          <h1 className="font-display text-heading-lg text-fg">Valuasi Perusahaan</h1>
          <p className="text-body-sm text-fg-muted mt-2">
            Bagian Statistik Utama belum tersedia pada halaman portal. Tambahkan bagian Statistik Utama terlebih dahulu dari editor halaman.
          </p>
          <Link
            href={`/admin/portal/pages/${homePage.id}`}
            className="bg-primary text-primary-foreground mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold"
          >
            Buka Editor Halaman
          </Link>
        </div>
      </div>
    )
  }

  let totalOfferedBps: number | null = null
  let unitOwnershipBps: number | null = null
  let totalUnits: number | null = null
  let offeringName: string | null = null

  if (principal.permissions.has('ownership_offerings.view')) {
    const supabase = await getServerSupabase()
    const offerings = await listOwnershipOfferings(supabase)
    const offering =
      offerings.find((item) => item.status === 'open') ??
      offerings.find((item) => item.status === 'paused') ??
      offerings.find((item) => item.status === 'draft') ??
      null

    if (offering) {
      totalOfferedBps = Number(offering.total_offered_bps)
      unitOwnershipBps = Number(offering.unit_ownership_bps)
      totalUnits = Number(offering.total_units)
      offeringName = offering.name
    }
  }

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
          <h1 className="font-display text-heading-lg text-fg mt-1">Valuasi Perusahaan</h1>
          <p className="text-body-sm text-fg-muted mt-2">
            Kelola nilai valuasi yang tampil sebagai kartu kelima Statistik Utama. Nilai disimpan pada versi CMS sehingga perubahan mengikuti alur draf, review, approval, dan publikasi portal.
          </p>
        </div>
      </div>

      {offeringName ? (
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-fg text-sm font-semibold">Dasar konversi: {offeringName}</p>
          <p className="text-fg-muted mt-1 text-xs">
            Sistem memakai struktur penawaran aktif untuk menghitung persentase ditawarkan, nilai teoritis per unit, dan sisa kepemilikan. Nilai transaksi historis tidak diubah.
          </p>
        </div>
      ) : (
        <div className="border-amber-200 bg-amber-50 rounded-xl border p-4">
          <p className="text-amber-800 text-sm font-semibold">Konversi struktur kepemilikan belum tersedia.</p>
          <p className="text-amber-700 mt-1 text-xs">
            Valuasi tetap dapat disimpan. Nilai turunan akan tampil setelah akun memiliki akses ke penawaran kepemilikan yang aktif.
          </p>
        </div>
      )}

      <CompanyValuationEditor
        pageId={homePage.id}
        pageStatus={homePage.status}
        sectionId={statSection.id}
        initialContent={statSection.current_version.content}
        totalOfferedBps={totalOfferedBps}
        unitOwnershipBps={unitOwnershipBps}
        totalUnits={totalUnits}
        canUpdate={principal.permissions.has('portal.update')}
      />
    </div>
  )
}
