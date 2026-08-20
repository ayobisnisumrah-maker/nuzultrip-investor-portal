import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function InvestorDocumentsPage() {
  const principal = await adminWithPermission(
    'investor_documents.view',
    '/admin/investor-documents',
  )

  return (
    <AdminModulePage
      eyebrow="Hubungan Investor"
      title="Dokumen Investor"
      description="Kelola pemberian akses dokumen kepada investor serta status akses mereka."
      permission="investor_documents.view"
      allowed={principal !== null}
    />
  )
}
