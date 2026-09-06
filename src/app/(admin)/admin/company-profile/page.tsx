import { hasPermission } from '@/core/auth/principal'
import { CompanyProfileEditor } from '@/features/admin/company-profile-editor'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getCompanyProfile } from '@/server/company-profile/queries'

export default async function CompanyProfilePage() {
  const principal = await adminWithPermission('company_profile.view', '/admin/company-profile')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="text-fg text-xl font-semibold">Akses Ditolak</h1>
        <p className="text-fg-muted mt-2 text-sm">Anda tidak memiliki izin untuk melihat Profil Perusahaan.</p>
      </div>
    )
  }

  const profile = await getCompanyProfile()

  return (
    <div className="space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold uppercase tracking-[0.2em]">Perusahaan</p>
        <h1 className="text-fg mt-2 text-3xl font-semibold">Profil Perusahaan</h1>
        <p className="text-fg-muted mt-2 max-w-3xl text-sm leading-6">
          Kelola sumber data utama identitas, legalitas, sejarah, visi dan misi, bisnis, pencapaian, kontak, serta aset brand Nuzultrip dengan versioning dan lifecycle publikasi.
        </p>
      </header>

      <CompanyProfileEditor
        profile={profile}
        canUpdate={hasPermission(principal, 'company_profile.update')}
        canPublish={hasPermission(principal, 'company_profile.publish')}
      />
    </div>
  )
}
