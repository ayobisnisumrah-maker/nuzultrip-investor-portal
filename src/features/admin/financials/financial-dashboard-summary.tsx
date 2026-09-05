'use client'

import type {
  FinancialDashboardData,
  FinancialDashboardTrendPoint,
} from '@/server/dashboard/financial-dashboard-service'

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

function periodLabel(point: FinancialDashboardTrendPoint) {
  if (point.periodType === 'monthly') {
    return `B${point.periodIndex} ${point.fiscalYear}`
  }

  if (point.periodType === 'quarterly') {
    return `Q${point.periodIndex} ${point.fiscalYear}`
  }

  return `${point.fiscalYear}`
}

function buildPolyline(
  values: number[],
  width: number,
  height: number,
  padding: number,
) {
  if (!values.length) return ''

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX =
    values.length === 1
      ? 0
      : (width - padding * 2) / (values.length - 1)

  return values
    .map((value, index) => {
      const x = padding + index * stepX
      const y =
        height -
        padding -
        ((value - min) / range) * (height - padding * 2)

      return `${x},${y}`
    })
    .join(' ')
}

export function FinancialDashboardSummary({ data }: Props) {
  const latest = data.latest

  if (!latest) {
    return (
      <div className="border-border bg-surface rounded-xl border p-8 text-center">
        <p className="text-body text-fg font-semibold">
          Belum ada laporan keuangan dipublikasikan
        </p>

        <p className="text-body-sm text-fg-muted mt-2">
          Data ringkasan akan muncul setelah laporan disetujui dan
          dipublikasikan.
        </p>
      </div>
    )
  }

  const currency = latest.period.currency

  const chartWidth = 800
  const chartHeight = 260
  const chartPadding = 28

  const revenuePoints = buildPolyline(
    data.trend.map((point) => point.revenue),
    chartWidth,
    chartHeight,
    chartPadding,
  )

  const profitPoints = buildPolyline(
    data.trend.map((point) => point.netProfit),
    chartWidth,
    chartHeight,
    chartPadding,
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">Pendapatan</p>

          <p className="text-heading-sm text-fg mt-2 font-semibold">
            {formatCurrency(latest.revenue, currency)}
          </p>

          <p className="text-caption text-fg-muted mt-2">
            Pertumbuhan {formatPercent(data.revenueGrowth)}
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">Laba Bersih</p>

          <p className="text-heading-sm text-fg mt-2 font-semibold">
            {formatCurrency(latest.netProfit, currency)}
          </p>

          <p className="text-caption text-fg-muted mt-2">
            Pertumbuhan {formatPercent(data.netProfitGrowth)}
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">Margin Laba Bersih</p>

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
          <p className="text-caption text-fg-subtle">Arus Kas Bersih</p>

          <p className="text-heading-sm text-fg mt-2 font-semibold">
            {formatCurrency(latest.netCashFlow, currency)}
          </p>

          <p className="text-caption text-fg-muted mt-2">
            Operasi, investasi, dan pendanaan
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="border-border bg-surface rounded-xl border p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-body text-fg font-semibold">
                Tren Kinerja Keuangan
              </h2>

              <p className="text-caption text-fg-muted mt-1">
                Pendapatan dan laba bersih berdasarkan laporan yang
                dipublikasikan.
              </p>
            </div>

            <div className="text-caption text-fg-subtle">
              {data.trend.length} periode
            </div>
          </div>

          {data.trend.length < 2 ? (
            <div className="border-border bg-background mt-5 rounded-lg border p-8 text-center">
              <p className="text-body-sm text-fg-muted">
                Minimal dua periode diperlukan untuk menampilkan tren.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label="Grafik tren pendapatan dan laba bersih"
                  className="min-w-[42rem] w-full"
                >
                  <line
                    x1={chartPadding}
                    x2={chartWidth - chartPadding}
                    y1={chartHeight - chartPadding}
                    y2={chartHeight - chartPadding}
                    stroke="currentColor"
                    className="text-border"
                  />

                  <polyline
                    points={revenuePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary-solid"
                  />

                  <polyline
                    points={profitPoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-success"
                  />
                </svg>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {data.trend.map((point) => (
                  <div
                    key={`${point.reportId}-${point.versionId}`}
                    className="border-border bg-background rounded-lg border p-3"
                  >
                    <p className="text-caption text-fg-subtle">
                      {periodLabel(point)}
                    </p>

                    <p className="text-caption text-fg mt-2">
                      Pendapatan
                    </p>

                    <p className="text-body-sm text-fg font-semibold">
                      {formatCurrency(point.revenue, currency)}
                    </p>

                    <p className="text-caption text-fg mt-2">
                      Laba Bersih
                    </p>

                    <p className="text-body-sm text-fg font-semibold">
                      {formatCurrency(point.netProfit, currency)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="border-border bg-surface rounded-xl border p-5">
            <h2 className="text-body text-fg font-semibold">
              Posisi Keuangan
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-caption text-fg-subtle">Aset</p>
                <p className="text-body text-fg mt-1 font-semibold">
                  {formatCurrency(latest.assets, currency)}
                </p>
              </div>

              <div>
                <p className="text-caption text-fg-subtle">Liabilitas</p>
                <p className="text-body text-fg mt-1 font-semibold">
                  {formatCurrency(latest.liabilities, currency)}
                </p>
              </div>

              <div>
                <p className="text-caption text-fg-subtle">Ekuitas</p>
                <p className="text-body text-fg mt-1 font-semibold">
                  {formatCurrency(latest.equity, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-border bg-surface rounded-xl border p-5">
            <h2 className="text-body text-fg font-semibold">
              Arus Kas
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-caption text-fg-subtle">Operasi</p>
                <p className="text-body text-fg mt-1 font-semibold">
                  {formatCurrency(latest.operatingCashFlow, currency)}
                </p>
              </div>

              <div>
                <p className="text-caption text-fg-subtle">Investasi</p>
                <p className="text-body text-fg mt-1 font-semibold">
                  {formatCurrency(latest.investingCashFlow, currency)}
                </p>
              </div>

              <div>
                <p className="text-caption text-fg-subtle">Pendanaan</p>
                <p className="text-body text-fg mt-1 font-semibold">
                  {formatCurrency(latest.financingCashFlow, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border bg-surface rounded-xl border p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-body text-fg font-semibold">
              KPI Keuangan Terbaru
            </h2>

            <p className="text-caption text-fg-muted mt-1">
              KPI dari laporan versi {latest.versionNumber}.
            </p>
          </div>

          <p className="text-caption text-fg-subtle">
            {latest.kpis.length} KPI
          </p>
        </div>

        {!latest.kpis.length ? (
          <div className="border-border bg-background mt-4 rounded-lg border p-6 text-center">
            <p className="text-body-sm text-fg-muted">
              Belum ada KPI pada laporan ini.
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
