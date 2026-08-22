import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalSectionPage } from '@/features/admin/portal-section-page'

export default async function PortalDocumentsPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal/documents')

  return (
    <PortalSectionPage
      title="Dokumen Publik"
      description="Kelola dokumen dan materi yang memang diperuntukkan bagi pengunjung portal."
      permission="portal.view"
      currentPermission={principal !== null}
    />
  )
}
