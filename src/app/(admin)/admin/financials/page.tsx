import { adminWithPermission } from '@/server/auth/page-guards'

export default async function FinancialsPage() {
  const principal = await adminWithPermission(
    'financial_periods.view',
    '/admin/financials',
  )

  if (!principal) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-body-sm text-fg-muted">
          Anda tidak memiliki izin untuk melihat modul keuangan.
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
          Ringkasan Keuangan
        </h1>

        <p className="mt-2 max-w-2xl text-body-sm text-fg-muted">
          Kelola periode pelaporan dan laporan keuangan perusahaan
          yang menjadi sumber informasi resmi untuk investor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <a
          href="/admin/financials/periods"
          className="rounded-xl border border-border bg-surface p-5 transition hover:border-primary-solid"
        >
          <h2 className="text-body font-semibold text-fg">
            Periode Keuangan
          </h2>

          <p className="mt-2 text-body-sm text-fg-muted">
            Kelola periode pelaporan, status periode, dan siklus
            pembukaan hingga penguncian periode.
          </p>
        </a>

        <a
          href="/admin/financials/reports"
          className="rounded-xl border border-border bg-surface p-5 transition hover:border-primary-solid"
        >
          <h2 className="text-body font-semibold text-fg">
            Laporan Keuangan
          </h2>

          <p className="mt-2 text-body-sm text-fg-muted">
            Kelola laporan keuangan, proses review, approval, dan
            publikasi kepada investor.
          </p>
        </a>
      </div>
    </div>
  )
}
