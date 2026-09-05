import { redirect } from 'next/navigation'

import type { Permission } from '@/core/rbac/permissions'
import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalPages } from '@/server/portal/queries'

export async function openPortalContentEditor({
  permission,
  returnPath,
}: {
  permission: Permission
  returnPath: string
}) {
  const principal = await adminWithPermission(permission, returnPath)

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk mengakses pengelolaan konten portal.
        </p>
      </div>
    )
  }

  const pages = await listPortalPages()
  const home = pages.find((page) => page.page_kind === 'home' && page.status !== 'archived')
    ?? pages.find((page) => page.status !== 'archived')

  if (!home) {
    redirect('/admin/portal/pages/new')
  }

  redirect(`/admin/portal/pages/${home.id}`)
}
