import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function CompanyProfilePage() {
  const principal = await adminWithPermission('company_profile.view', '/admin/company-profile')

  return (
    <AdminModulePage
      eyebrow="Perusahaan"
      title="Profil Perusahaan"
      description="Kelola informasi profil perusahaan dan lifecycle versi yang digunakan pada portal investor."
      permission="company_profile.view"
      allowed={principal !== null}
    />
  )
}
