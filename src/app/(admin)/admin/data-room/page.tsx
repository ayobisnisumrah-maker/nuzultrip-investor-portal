import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function DataRoomPage() {
  const principal = await adminWithPermission(
    'documents.view',
    '/admin/data-room',
  )

  return (
    <AdminModulePage
      eyebrow="Dokumen"
      title="Data Room"
      description="Kelola dokumen yang tersedia melalui ruang data investor dengan kontrol akses yang terukur."
      permission="documents.view"
      allowed={principal !== null}
    />
  )
}
