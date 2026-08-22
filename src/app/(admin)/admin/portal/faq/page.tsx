import { adminWithPermission } from '@/server/auth/page-guards'
import { PortalSectionPage } from '@/features/admin/portal-section-page'

export default async function PortalFaqPage() {
  const principal = await adminWithPermission('portal.view', '/admin/portal/faq')

  return (
    <PortalSectionPage
      title="FAQ"
      description="Kelola pertanyaan dan jawaban yang membantu calon investor memahami peluang investasi dan proses pendaftaran."
      permission="portal.view"
      currentPermission={principal !== null}
    />
  )
}
