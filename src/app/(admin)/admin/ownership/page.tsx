import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function OwnershipPage() {
  const principal = await adminWithPermission('ownership.view', '/admin/ownership')

  return (
    <AdminModulePage
      eyebrow="Kepemilikan"
      title="Kepemilikan Investor"
      description="Kelola dan pantau kepemilikan unit investor berdasarkan penawaran kepemilikan yang telah ditetapkan."
      permission="ownership.view"
      allowed={principal !== null}
    />
  )
}
