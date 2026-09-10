import { formatFinancialKpi } from '@/core/financials/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'

type LineItem = {
  statement: 'income' | 'balance' | 'cash_flow'
  category: string
  line_key: string
  label: string
  amount: number | string
  currency: string
}

type Kpi = {
  kpi_key: string
  label: string
  value: number | string
  unit: string
}

type Props = {
  summary: string | null
  visibility: string
  preparedBy: string | null
  hasAttachment: boolean
  currency: string
  lines: readonly LineItem[]
  kpis: readonly Kpi[]
}

function money(value: number | string, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function FinancialReportInvestorReadiness({
  summary,
  visibility,
  preparedBy,
  hasAttachment,
  currency,
  lines,
  kpis,
}: Props) {
  const incomeLines = lines.filter((line) => line.statement === 'income')
  const cashFlowLines = lines.filter((line) => line.statement === 'cash_flow')
  const balanceLines = lines.filter((line) => line.statement === 'balance')
  const hasAsset = balanceLines.some((line) => line.category === 'asset')
  const hasLiabilityOrEquity = balanceLines.some(
    (line) => line.category === 'liability' || line.category === 'equity',
  )

  const checks = [
    { label: 'Ringkasan investor sudah diisi', ok: Boolean(summary?.trim()) },
    { label: 'Laba rugi / pendapatan dan beban tersedia', ok: incomeLines.length > 0 },
    { label: 'Arus kas masuk dan keluar tersedia', ok: cashFlowLines.length > 0 },
    { label: 'Posisi keuangan memiliki data aset', ok: hasAsset },
    {
      label: 'Liabilitas / ekuitas sudah ditinjau dan dicatat bila relevan',
      ok: hasLiabilityOrEquity,
    },
    { label: 'KPI operasional dan keuangan tersedia', ok: kpis.length >= 5 },
    { label: 'Nama penyusun laporan tersedia', ok: Boolean(preparedBy?.trim()) },
    { label: 'Lampiran pendukung sudah diunggah', ok: hasAttachment },
    { label: 'Visibilitas laporan ditetapkan untuk investor', ok: visibility === 'investors' },
  ]

  const completed = checks.filter((item) => item.ok).length
  const ready = completed === checks.length

  const kpiByKey = new Map(kpis.map((kpi) => [kpi.kpi_key, kpi]))
  const lineByKey = new Map(lines.map((line) => [line.line_key, line]))

  const grossRevenue = kpiByKey.get('gross_revenue')?.value ?? lineByKey.get('gross_revenue')?.amount ?? 0
  const operatingResult = kpiByKey.get('operating_result')?.value ?? lineByKey.get('operating_result')?.amount ?? 0
  const cashIn = kpiByKey.get('cash_in')?.value ?? lineByKey.get('cash_received')?.amount ?? 0
  const cashOut = kpiByKey.get('cash_out')?.value ?? 0
  const pax = kpiByKey.get('pax_sold')?.value ?? 0
  const receivables = lineByKey.get('accounts_receivable')?.amount ?? 0

  return (
    <div className="grid gap-4">
      <Alert tone={ready ? 'success' : 'info'} title={ready ? 'Laporan siap masuk tahap review' : `Kelengkapan laporan ${completed}/${checks.length}`}>
        {ready
          ? 'Komponen utama laporan investor sudah tersedia. Lakukan pemeriksaan akhir angka dan catatan, lalu kirim ke tahap review.'
          : 'Selesaikan item yang belum terpenuhi sebelum laporan diterbitkan kepada investor. Angka transaksi otomatis tetap perlu ditinjau untuk saldo atau penyesuaian yang belum tercatat di Kasir & Invoice.'}
      </Alert>

      <Card>
        <CardHeader><CardTitle>Ikhtisar yang akan dibaca investor</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="border-border rounded-lg border p-3"><p className="text-caption text-fg-subtle">Pendapatan bruto</p><p className="mt-1 font-semibold tabular">{money(grossRevenue, currency)}</p></div>
            <div className="border-border rounded-lg border p-3"><p className="text-caption text-fg-subtle">Hasil operasional</p><p className="mt-1 font-semibold tabular">{money(operatingResult, currency)}</p></div>
            <div className="border-border rounded-lg border p-3"><p className="text-caption text-fg-subtle">Arus masuk</p><p className="mt-1 font-semibold tabular">{money(cashIn, currency)}</p></div>
            <div className="border-border rounded-lg border p-3"><p className="text-caption text-fg-subtle">Arus keluar</p><p className="mt-1 font-semibold tabular">{money(cashOut, currency)}</p></div>
            <div className="border-border rounded-lg border p-3"><p className="text-caption text-fg-subtle">Pax terjual</p><p className="mt-1 font-semibold tabular">{formatFinancialKpi(pax, 'count', currency)}</p></div>
            <div className="border-border rounded-lg border p-3"><p className="text-caption text-fg-subtle">Piutang invoice periode</p><p className="mt-1 font-semibold tabular">{money(receivables, currency)}</p></div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Checklist sebelum dikirim ke investor</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {checks.map((item) => (
              <div key={item.label} className="border-border flex items-start gap-2 rounded-lg border p-3 text-sm">
                <span aria-hidden="true" className={item.ok ? 'text-positive' : 'text-fg-subtle'}>{item.ok ? '✓' : '○'}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
