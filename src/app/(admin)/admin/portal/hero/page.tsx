import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalSectionPage } from '@/features/admin/portal-section-page'

export default async function PortalHeroPage() {
  const principal = await adminWithPermission('portal.manage_hero', '/admin/portal/hero')

  return (
    <PortalSectionPage
      title="Hero & Banner"
      description="Kelola hero, banner utama, gambar, headline, dan pesan utama pada portal."
      permission="portal.manage_hero"
      currentPermission={principal !== null}
    />
  )
}
