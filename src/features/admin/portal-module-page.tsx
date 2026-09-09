import Link from 'next/link'

import type { Permission } from '@/core/rbac/permissions'
import { PortalCreateModuleButton } from '@/features/admin/portal-create-module-button'
import { PortalModuleEditor } from '@/features/admin/portal-module-editor'
import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPages, listPortalPageSections } from '@/server/portal/queries'

type ModuleKind = 'hero_3d' | 'contact_cta' | 'faq' | 'documents'

export async function PortalModulePage({
  kind,
  title,
  description,
  permission,
  returnPath,
}: {
  kind: ModuleKind
  title: string
  description: string
  permission: Permission
  returnPath: string
}) {
  const principal = await adminWithPermission(permission, returnPath)

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk mengelola modul ini.
        </p>
      </div>
    )
  }

  const pages = await listPortalPages()
  const home =
    pages.find((page) => page.page_kind === 'home' && page.status !== 'archived') ??
    pages.find((page) => page.status !== 'archived')

  if (!home) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">{title}</h1>
        <p className="text-body-sm text-fg-muted mt-2">Belum ada halaman portal aktif.</p>
        <Link href="/admin/portal/pages/new" className="text-primary mt-4 inline-flex text-sm font-semibold hover:underline">
          Buat halaman portal →
        </Link>
      </div>
    )
  }

  const sections = await listPortalPageSections(home.id)
  const section = sections.find((item) => item.section_kind === kind)
  const canUpdate = principal.permissions.has('portal.update')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Portal Investor
          </p>
          <h1 className="font-display text-heading-lg text-fg mt-1">{title}</h1>
          <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">{description}</p>
        </div>
        <span className="border-border text-caption text-fg-muted inline-flex w-fit rounded-full border px-3 py-1">
          {home.status}
        </span>
      </div>

      {!section ? (
        <div className="border-border bg-surface rounded-xl border p-6">
          <p className="text-fg font-semibold">Bagian {title} belum aktif.</p>
          <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
            Aktifkan bagian ini langsung dari halaman ini. Sistem akan membuat section dan versi draf pertama pada halaman portal aktif tanpa data contoh.
          </p>
          {home.status === 'draft' && canUpdate ? (
            <PortalCreateModuleButton pageId={home.id} kind={kind} label={title} />
          ) : (
            <div className="mt-4 space-y-2">
              <p className="text-body-sm text-fg-muted">
                Halaman harus berstatus Draf dan akun Anda memerlukan izin pembaruan portal sebelum section baru dapat dibuat.
              </p>
              <Link href={`/admin/portal/pages/${home.id}`} className="text-primary inline-flex text-sm font-semibold hover:underline">
                Buka editor Halaman →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <PortalModuleEditor
          pageId={home.id}
          pageStatus={home.status}
          section={section}
          kind={kind}
          canUpdate={canUpdate}
        />
      )}
    </div>
  )
}
