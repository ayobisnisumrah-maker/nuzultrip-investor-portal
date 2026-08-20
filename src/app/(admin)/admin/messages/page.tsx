import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function MessagesPage() {
  const principal = await adminWithPermission(
    'messages.view',
    '/admin/messages',
  )

  return (
    <AdminModulePage
      eyebrow="Komunikasi"
      title="Pesan"
      description="Kelola percakapan antara investor atau calon investor dengan tim Nuzultrip."
      permission="messages.view"
      allowed={principal !== null}
    />
  )
}
