import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalNavigationManager } from '@/features/admin/portal-navigation-manager'
import { getPortalNavigationItems } from '@/server/portal/navigation-queries'

export default async function PortalNavigationPage() {
  const principal = await adminWithPermission(
    'portal.manage_navigation',
    '/admin/portal/navigation',
  )

  if (!principal) {
    return null
  }

  const items = await getPortalNavigationItems()

  return <PortalNavigationManager initialItems={items} />
}
