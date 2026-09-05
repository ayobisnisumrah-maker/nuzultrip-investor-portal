import { PortalMediaManager } from '@/features/admin/portal-media-manager'
import { adminWithPermission } from '@/server/auth/page-guards'
import { listPortalMediaAssets } from '@/server/portal/media-queries'

export default async function PortalMediaPage() {
  const principal = await adminWithPermission('media.view', '/admin/portal/media')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk mengakses pustaka media.
        </p>
      </div>
    )
  }

  const assets = await listPortalMediaAssets()

  return (
    <PortalMediaManager
      assets={assets}
      canUpload={principal.permissions.has('media.upload')}
    />
  )
}
