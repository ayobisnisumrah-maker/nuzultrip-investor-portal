import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'
import { CompanyLogoForm } from '@/features/admin/company-logo-form'
import { getActivePortalTheme } from '@/server/portal/public-queries'

export default async function CompanyProfilePage() {
  const principal = await adminWithPermission('company_profile.view', '/admin/company-profile')
  const theme = principal ? await getActivePortalTheme() : null
  const canManageLogo = Boolean(
    principal?.permissions.has('portal.manage_theme') && principal.permissions.has('media.upload'),
  )

  return (
    <AdminModulePage
      eyebrow="Perusahaan"
      title="Profil Perusahaan"
      description="Kelola informasi profil perusahaan dan lifecycle versi yang digunakan pada portal investor."
      permission="company_profile.view"
      allowed={principal !== null}
    >
      <CompanyLogoForm
        currentLogoUrl={theme?.logo_url ?? null}
        currentFilename={theme?.logo_asset?.original_filename ?? null}
        canManage={canManageLogo}
      />
    </AdminModulePage>
  )
}
