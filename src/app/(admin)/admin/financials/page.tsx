import { adminWithPermission } from '@/server/auth/page-guards'

export default async function FinancialsPage() {
  const principal = await adminWithPermission('financial_periods.view', '/admin/financials')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat modul keuangan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-fg-subtle text-sm font-medium">Keuangan</p>

        <h1 className="font-display text-heading-lg text-fg mt-1">Ringkasan Keuangan</h1>

        <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
          Kelola periode pelaporan dan laporan keuangan perusahaan yang menjadi sumber informasi
          resmi untuk investor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <a
          href="/admin/financials/periods"
          className="border-border bg-surface hover:border-primary-solid rounded-xl border p-5 transition"
        >
          <h2 className="text-body text-fg font-semibold">Periode Keuangan</h2>

          <p className="text-body-sm text-fg-muted mt-2">
            Kelola periode pelaporan, status periode, dan siklus pembukaan hingga penguncian
            periode.
          </p>
        </a>

        <a
          href="/admin/financials/reports"
          className="border-border bg-surface hover:border-primary-solid rounded-xl border p-5 transition"
        >
          <h2 className="text-body text-fg font-semibold">Laporan Keuangan</h2>

          <p className="text-body-sm text-fg-muted mt-2">
            Kelola laporan keuangan, proses review, approval, dan publikasi kepada investor.
          </p>
        </a>
      </div>
    </div>
  )
}
