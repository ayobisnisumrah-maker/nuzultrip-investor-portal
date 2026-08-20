import { adminWithPermission } from '@/server/auth/page-guards'
import { AdminModulePage } from '@/features/admin/admin-module-page'

export default async function FinancialKpisPage() {
  const principal = await adminWithPermission(
    'financial_reports.view',
    '/admin/financials/kpis',
  )

  return (
    <AdminModulePage
      eyebrow="Laporan & Keuangan"
      title="KPI Keuangan"
      description="Pantau indikator utama keuangan perusahaan yang menjadi bagian dari pelaporan kepada investor."
      permission="financial_reports.view"
      allowed={principal !== null}
    />
  )
}
