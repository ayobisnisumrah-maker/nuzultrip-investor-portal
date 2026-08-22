import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalSectionPage } from '@/features/admin/portal-section-page'

export default async function PortalMediaPage() {
  const principal = await adminWithPermission('media.view', '/admin/portal/media')

  return (
    <PortalSectionPage
      title="Media Library"
      description="Kelola gambar dan berkas yang digunakan oleh portal."
      permission="media.view"
      currentPermission={principal !== null}
    />
  )
}
