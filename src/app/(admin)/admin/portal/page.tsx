import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalSectionPage } from '@/features/admin/portal-section-page'

export default async function PortalPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal')

  return (
    <PortalSectionPage
      title="Ringkasan Portal"
      description="Kelola dan pantau konten, publikasi, media, serta pengalaman calon investor di portal."
      permission="portal.view"
      currentPermission={principal !== null}
    />
  )
}
