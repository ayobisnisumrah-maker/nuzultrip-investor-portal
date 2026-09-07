import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, BarChart3, FileSpreadsheet } from 'lucide-react'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'KPI Keuangan' }

const PERIOD_TYPE_LABELS: Record<string, string> = {
  monthly: 'Bulanan',
  quarterly: 'Triwulanan',
  semiannual: 'Semester',
  yearly: 'Tahunan',
}

function formatKpi(value: number | string, unit: string) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return String(value)
  if (unit === 'percent' || unit === '%') {
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n)}%`
  }
  if (unit === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n)
  }
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n)} ${unit}`.trim()
}

function formatPeriod(period: {
  period_type: string
  fiscal_year: number
  period_index: number | null
}) {
  const label = PERIOD_TYPE_LABELS[period.period_type] ?? period.period_type
  return `${label} ${period.fiscal_year}${period.period_index ? ` · Periode ${period.period_index}` : ''}`
}

export default async function FinancialKpisPage() {
  const principal = await adminWithPermission('financial_reports.view', '/admin/financials/kpis')
  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk melihat KPI keuangan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const { data: kpis, error } = await supabase
    .from('financial_kpis')
    .select('id, financial_report_version_id, kpi_key, label, value, unit, basis, position')
    .order('position', { ascending: true })

  if (error) {
    return (
      <Alert tone="danger" title="KPI keuangan tidak dapat dimuat">
        Sistem gagal mengambil KPI dari laporan keuangan.
      </Alert>
    )
  }

  const versionIds = [...new Set((kpis ?? []).map((item) => item.financial_report_version_id))]
  const { data: versions } = versionIds.length
    ? await supabase
        .from('financial_report_versions')
        .select('id, financial_report_id, version_number, status, published_at')
        .in('id', versionIds)
    : { data: [] }

  const reportIds = [...new Set((versions ?? []).map((item) => item.financial_report_id))]
  const { data: reports } = reportIds.length
    ? await supabase
        .from('financial_reports')
        .select('id, financial_period_id, title, status, visibility')
        .in('id', reportIds)
    : { data: [] }

  const periodIds = [...new Set((reports ?? []).map((item) => item.financial_period_id))]
  const { data: periods } = periodIds.length
    ? await supabase
        .from('financial_periods')
        .select('id, period_type, fiscal_year, period_index, currency')
        .in('id', periodIds)
    : { data: [] }

  const versionMap = new Map((versions ?? []).map((item) => [item.id, item]))
  const reportMap = new Map((reports ?? []).map((item) => [item.id, item]))
  const periodMap = new Map((periods ?? []).map((item) => [item.id, item]))
  const rows = kpis ?? []
  const reportCount = new Set((versions ?? []).map((item) => item.financial_report_id)).size
  const publishedCount = (versions ?? []).filter((item) => item.status === 'published').length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Laporan & Keuangan"
        title="KPI Keuangan"
        description="Indikator utama yang tersimpan pada versi laporan keuangan. Nilai di halaman ini berasal langsung dari basis data pelaporan, bukan angka simulasi."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/financials">Kelola Laporan</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody className="flex items-center gap-3 py-5"><Activity className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Total KPI</p><p className="text-heading-sm text-fg font-semibold">{rows.length}</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3 py-5"><FileSpreadsheet className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Laporan terkait</p><p className="text-heading-sm text-fg font-semibold">{reportCount}</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3 py-5"><BarChart3 className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Versi terbit</p><p className="text-heading-sm text-fg font-semibold">{publishedCount}</p></div></CardBody></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Indikator per laporan</CardTitle></CardHeader>
        <CardBody>
          {!rows.length ? (
            <EmptyState
              title="Belum ada KPI keuangan"
              description="KPI akan muncul setelah indikator disimpan pada versi laporan keuangan. Sistem tidak membuat nilai contoh secara otomatis."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((kpi) => {
                const version = versionMap.get(kpi.financial_report_version_id)
                const report = version ? reportMap.get(version.financial_report_id) : undefined
                const period = report ? periodMap.get(report.financial_period_id) : undefined
                return (
                  <div key={kpi.id} className="border-border bg-canvas rounded-xl border p-4">
                    <p className="text-caption text-fg-subtle uppercase tracking-wide">{kpi.kpi_key}</p>
                    <p className="text-body-sm text-fg-muted mt-1">{kpi.label}</p>
                    <p className="text-heading-md text-fg mt-3 font-semibold tabular-nums">{formatKpi(kpi.value, kpi.unit)}</p>
                    <p className="text-caption text-fg-muted mt-2">Dasar perhitungan: {kpi.basis}</p>
                    <div className="border-border mt-4 border-t pt-3">
                      {report ? (
                        <Link href={`/admin/financials/reports/${report.id}`} className="text-body-sm text-link font-medium hover:underline">
                          {report.title}
                        </Link>
                      ) : (
                        <p className="text-body-sm text-fg-muted">Laporan tidak ditemukan</p>
                      )}
                      <p className="text-caption text-fg-subtle mt-1">
                        {period ? formatPeriod(period) : 'Periode tidak tersedia'}
                        {version ? ` · Versi ${version.version_number}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
