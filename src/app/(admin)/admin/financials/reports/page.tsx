import { adminWithPermission } from '@/server/auth/page-guards'

export default async function FinancialReportsPage() {
  const principal = await adminWithPermission('financial_reports.view', '/admin/financials/reports')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat laporan keuangan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-fg-subtle text-sm font-medium">Keuangan</p>

        <h1 className="font-display text-heading-lg text-fg mt-1">Laporan Keuangan</h1>

        <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
          Kelola laporan keuangan dan alur review, approval, hingga publikasi kepada investor.
        </p>
      </div>

      <div className="border-border bg-surface rounded-xl border p-6">
        <p className="text-body-sm text-fg-muted">
          Modul laporan keuangan akan menggunakan permission dan lifecycle financial_reports yang
          sudah tersedia.
        </p>
      </div>
    </div>
  )
}
