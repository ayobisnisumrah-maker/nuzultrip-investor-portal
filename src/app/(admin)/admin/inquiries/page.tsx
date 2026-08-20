import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function InquiriesPage() {
  const principal = await adminWithPermission(
    'inquiries.view',
    '/admin/inquiries',
  )

  return (
    <AdminModulePage
      eyebrow="Hubungan Investor"
      title="Permintaan Masuk"
      description="Kelola inquiry yang berasal dari portal publik dan tindak lanjutnya."
      permission="inquiries.view"
      allowed={principal !== null}
    />
  )
}
