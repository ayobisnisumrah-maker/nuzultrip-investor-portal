import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalSectionPage } from '@/features/admin/portal-section-page'

export default async function PortalCtaPage() {
  const principal = await adminWithPermission('portal.manage_cta', '/admin/portal/cta')

  return (
    <PortalSectionPage
      title="CTA & Form"
      description="Kelola ajakan bertindak dan formulir yang digunakan untuk mengubah pengunjung menjadi calon investor."
      permission="portal.manage_cta"
      currentPermission={principal !== null}
    />
  )
}
