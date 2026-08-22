import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

function formatPeriodType(periodType: string) {
  const labels: Record<string, string> = {
    annual: 'Tahunan',
    quarterly: 'Kuartal',
    monthly: 'Bulanan',
  }

  return labels[periodType] ?? periodType
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Terbuka',
    closed: 'Ditutup',
    locked: 'Terkunci',
  }

  return labels[status] ?? status
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    open: 'border-success/30 bg-success/10 text-success',
    closed: 'border-warning/30 bg-warning/10 text-warning',
    locked: 'border-border bg-muted text-fg-muted',
  }

  return classes[status] ?? 'border-border bg-muted text-fg-muted'
}

export default async function FinancialPeriodsPage() {
  const principal = await adminWithPermission('financial_periods.view', '/admin/financials/periods')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat periode keuangan.
        </p>
      </div>
    )
  }

  const supabase = await getServerSupabase()

  const { data: periods, error } = await supabase
    .from('financial_periods')
    .select(
      'id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status, created_at, updated_at',
    )
    .order('starts_on', { ascending: false })

  if (error) {
    return (
      <div className="border-danger/30 bg-danger/5 rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Periode Keuangan</h1>

        <p className="text-body-sm text-danger mt-2">
          Data periode keuangan tidak dapat dimuat saat ini.
        </p>
      </div>
    )
  }

  const openCount = periods?.filter((period) => period.status === 'open').length ?? 0
  const closedCount = periods?.filter((period) => period.status === 'closed').length ?? 0
  const lockedCount = periods?.filter((period) => period.status === 'locked').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-fg-subtle text-sm font-medium">Keuangan</p>

          <h1 className="font-display text-heading-lg text-fg mt-1">Periode Keuangan</h1>

          <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
            Kelola periode pelaporan keuangan perusahaan dan lifecycle setiap periode.
          </p>
        </div>

        {principal.permissions.has('financial_periods.create') ? (
          <Link
            href="/admin/financials/periods/new"
            className="bg-primary-solid text-primary-fg inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition hover:opacity-90"
          >
            + Periode Baru
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-caption text-fg-subtle">Terbuka</p>

          <p className="text-heading-md text-fg mt-1 font-semibold">{openCount}</p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-caption text-fg-subtle">Ditutup</p>

          <p className="text-heading-md text-fg mt-1 font-semibold">{closedCount}</p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-caption text-fg-subtle">Terkunci</p>

          <p className="text-heading-md text-fg mt-1 font-semibold">{lockedCount}</p>
        </div>
      </div>

      <div className="border-border bg-surface overflow-hidden rounded-xl border">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-body text-fg font-semibold">Semua Periode</h2>

          <p className="text-caption text-fg-muted mt-1">
            {periods?.length ?? 0} periode terdaftar.
          </p>
        </div>

        {!periods?.length ? (
          <div className="px-5 py-12 text-center">
            <p className="text-body text-fg font-medium">Belum ada periode keuangan</p>

            <p className="text-body-sm text-fg-muted mt-1">
              Buat periode pertama untuk mulai mengelola pelaporan keuangan.
            </p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {periods.map((period) => (
              <div
                key={period.id}
                className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-body text-fg font-semibold">
                      {formatPeriodType(period.period_type)} {period.period_index} /{' '}
                      {period.fiscal_year}
                    </h3>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${statusClass(period.status)}`}
                    >
                      {statusLabel(period.status)}
                    </span>
                  </div>

                  <p className="text-body-sm text-fg-muted mt-1">
                    {formatDate(period.starts_on)} — {formatDate(period.ends_on)}
                  </p>

                  <p className="text-caption text-fg-subtle mt-1">Mata uang: {period.currency}</p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/admin/financials/periods/${period.id}`}
                    className="border-border text-fg hover:bg-muted inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition"
                  >
                    Lihat
                  </Link>

                  {period.status === 'open' &&
                  principal.permissions.has('financial_periods.update') ? (
                    <Link
                      href={`/admin/financials/periods/${period.id}/edit`}
                      className="border-border text-fg hover:bg-muted inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
