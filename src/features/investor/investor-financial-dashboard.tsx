'use client'

import type { FinancialDashboardData } from '@/server/dashboard/financial-dashboard-service'

type Props = {
  data: FinancialDashboardData
}

function formatCurrency(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null) {
  if (value === null) return '-'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function InvestorFinancialDashboard({ data }: Props) {
  const latest = data.latest

  if (!latest) {
    return (
      <div className="border-border bg-surface rounded-xl border p-8 text-center">
        <p className="text-body text-fg font-semibold">
          Belum ada laporan keuangan terbaru
        </p>

        <p className="text-body-sm text-fg-muted mt-2">
          Ringkasan keuangan akan muncul setelah laporan dipublikasikan
          kepada investor.
        </p>
      </div>
    )
  }

  const currency = latest.period.currency

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">
            Pendapatan
          </p>

          <p className="text-heading-sm text-fg mt-2 font-semibold">
            {formatCurrency(latest.revenue, currency)}
          </p>

          <p className="text-caption text-fg-muted mt-2">
            Pertumbuhan {formatPercent(data.revenueGrowth)}
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">
            Laba Bersih
          </p>

          <p className="text-heading-sm text-fg mt-2 font-semibold">
            {formatCurrency(latest.netProfit, currency)}
          </p>

          <p className="text-caption text-fg-muted mt-2">
            Pertumbuhan {formatPercent(data.netProfitGrowth)}
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">
            Margin Laba
          </p>

          <p className="text-heading-sm text-fg mt-2 font-semibold">
            {latest.netProfitMargin === null
              ? '-'
              : `${latest.netProfitMargin.toFixed(1)}%`}
          </p>

          <p className="text-caption text-fg-muted mt-2">
            Berdasarkan laporan terbaru
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">
            Arus Kas Bersih
          </p>

          <p className="text-heading-sm text-fg mt-2 font-semibold">
            {formatCurrency(latest.netCashFlow, currency)}
          </p>

          <p className="text-caption text-fg-muted mt-2">
            Operasi, investasi, dan pendanaan
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="border-border bg-surface rounded-xl border p-5">
          <h2 className="text-body text-fg font-semibold">
            Posisi Keuangan
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-caption text-fg-subtle">Aset</p>
              <p className="text-body text-fg mt-1 font-semibold">
                {formatCurrency(latest.assets, currency)}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">
                Liabilitas
              </p>
              <p className="text-body text-fg mt-1 font-semibold">
                {formatCurrency(latest.liabilities, currency)}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">
                Ekuitas
              </p>
              <p className="text-body text-fg mt-1 font-semibold">
                {formatCurrency(latest.equity, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <h2 className="text-body text-fg font-semibold">
            Ringkasan Arus Kas
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-caption text-fg-subtle">
                Operasi
              </p>
              <p className="text-body text-fg mt-1 font-semibold">
                {formatCurrency(
                  latest.operatingCashFlow,
                  currency,
                )}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">
                Investasi
              </p>
              <p className="text-body text-fg mt-1 font-semibold">
                {formatCurrency(
                  latest.investingCashFlow,
                  currency,
                )}
              </p>
            </div>

            <div>
              <p className="text-caption text-fg-subtle">
                Pendanaan
              </p>
              <p className="text-body text-fg mt-1 font-semibold">
                {formatCurrency(
                  latest.financingCashFlow,
                  currency,
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border bg-surface rounded-xl border p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-body text-fg font-semibold">
              KPI Keuangan
            </h2>

            <p className="text-caption text-fg-muted mt-1">
              Indikator dari laporan keuangan terbaru yang
              dipublikasikan.
            </p>
          </div>

          <span className="text-caption text-fg-subtle">
            {latest.kpis.length} KPI
          </span>
        </div>

        {!latest.kpis.length ? (
          <div className="border-border bg-background mt-4 rounded-lg border p-6 text-center">
            <p className="text-body-sm text-fg-muted">
              Belum ada KPI yang dipublikasikan.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {latest.kpis.map((kpi) => (
              <div
                key={kpi.kpi_key}
                className="border-border bg-background rounded-lg border p-4"
              >
                <p className="text-caption text-fg-subtle">
                  {kpi.label}
                </p>

                <p className="text-heading-sm text-fg mt-2 font-semibold">
                  {kpi.unit === 'currency'
                    ? formatCurrency(kpi.value, currency)
                    : kpi.unit === 'percent'
                      ? `${kpi.value}%`
                      : kpi.value}
                </p>

                <p className="text-caption text-fg-muted mt-2">
                  {kpi.basis === 'derived'
                    ? 'Dihitung'
                    : 'Dilaporkan'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
