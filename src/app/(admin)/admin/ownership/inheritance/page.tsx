import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function OwnershipInheritancePage() {
  const principal = await adminWithPermission(
    'ownership_inheritance.view',
    '/admin/ownership/inheritance',
  )

  return (
    <AdminModulePage
      eyebrow="Kepemilikan"
      title="Pewarisan Kepemilikan"
      description="Kelola proses pewarisan kepemilikan investor sesuai workflow verifikasi dan persetujuan."
      permission="ownership_inheritance.view"
      allowed={principal !== null}
    />
  )
}
