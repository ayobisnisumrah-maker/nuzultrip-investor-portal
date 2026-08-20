import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalSectionPage } from '@/features/admin/portal-section-page'

export default async function PortalNavigationPage() {
  const principal = await adminWithPermission(
    'portal.manage_navigation',
    '/admin/portal/navigation',
  )

  return (
    <PortalSectionPage
      title="Navigasi"
      description="Kelola menu, urutan navigasi, dan tautan yang tersedia pada portal."
      permission="portal.manage_navigation"
      currentPermission={principal !== null}
    />
  )
}
