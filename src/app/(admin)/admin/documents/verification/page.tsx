import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function DocumentVerificationPage() {
  const principal = await adminWithPermission(
    'documents.review',
    '/admin/documents/verification',
  )

  return (
    <AdminModulePage
      eyebrow="Dokumen"
      title="Verifikasi Dokumen"
      description="Periksa dan verifikasi dokumen yang masuk sebelum dapat digunakan dalam workflow investor."
      permission="documents.review"
      allowed={principal !== null}
    />
  )
}
