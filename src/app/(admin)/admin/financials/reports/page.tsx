import { adminWithPermission } from '@/server/auth/page-guards'

export default async function FinancialReportsPage() {
  const principal = await adminWithPermission(
    'financial_reports.view',
    '/admin/financials/reports',
  )

  if (!principal) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-body-sm text-fg-muted">
          Anda tidak memiliki izin untuk melihat laporan keuangan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-fg-subtle">
          Keuangan
        </p>

        <h1 className="mt-1 font-display text-heading-lg text-fg">
          Laporan Keuangan
        </h1>

        <p className="mt-2 max-w-2xl text-body-sm text-fg-muted">
          Kelola laporan keuangan dan alur review, approval, hingga
          publikasi kepada investor.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-body-sm text-fg-muted">
          Modul laporan keuangan akan menggunakan permission dan
          lifecycle financial_reports yang sudah tersedia.
        </p>
      </div>
    </div>
  )
}
