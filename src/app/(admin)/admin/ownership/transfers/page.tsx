import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function OwnershipTransfersPage() {
  const principal = await adminWithPermission(
    'ownership_transfers.view',
    '/admin/ownership/transfers',
  )

  return (
    <AdminModulePage
      eyebrow="Kepemilikan"
      title="Transfer Kepemilikan"
      description="Kelola permintaan perpindahan kepemilikan setelah memenuhi ketentuan transfer yang berlaku."
      permission="ownership_transfers.view"
      allowed={principal !== null}
    />
  )
}
