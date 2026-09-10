import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  FINANCIAL_CATEGORY_LABELS,
  FINANCIAL_SOURCE_LABELS,
  FINANCIAL_STATEMENT_LABELS,
  formatFinancialKpi,
  KPI_BASIS_LABELS,
} from '@/core/financials/format'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { topics } from '@/core/realtime/events'
import { Button } from '@/ui/button'

export const metadata: Metadata = { title: 'Laporan Keuangan' }

export default async function InvestorFinancialReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireInvestorPage()
  const { id } = await params
  const supabase = await getServerSupabase()

  const { data: report } = await supabase
    .from('financial_reports')
    .select('id, title, summary, status, visibility, financial_period_id, published_version_id')
    .eq('id', id)
    .eq('status', 'published')
    .eq('visibility', 'investors')
    .maybeSingle()

  if (!report || !report.published_version_id) notFound()

  const [{ data: version }, { data: period }] = await Promise.all([
    supabase
      .from('financial_report_versions')
      .select('version_number, source, prepared_by, notes, document_asset_id, published_at')
      .eq('id', report.published_version_id)
      .maybeSingle(),
    supabase
      .from('financial_periods')
      .select('period_type, fiscal_year, period_index, starts_on, ends_on, currency')
      .eq('id', report.financial_period_id)
      .maybeSingle(),
  ])

  if (!version) notFound()

  const { data: lineItems } = await supabase
    .from('financial_line_items')
    .select('statement, category, label, amount, currency, position, note')
    .eq('financial_report_version_id', report.published_version_id)
    .order('position', { ascending: true })

  const { data: kpis } = await supabase
    .from('financial_kpis')
    .select('kpi_key, label, value, unit, basis, position')
    .eq('financial_report_version_id', report.published_version_id)
    .order('position', { ascending: true })

  return (
    <Stack gap={8}>
      <RealtimeRefresher topic={topics.allInvestors()} kinds={['financial_report.published']} />
      <PageHeader
        eyebrow="Financial Report"
        title={report.title}
        description={report.summary || 'Laporan keuangan investor.'}
      />
      <Card>
        <CardHeader>
          <CardTitle>Periode & sumber</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-body-sm grid gap-4 sm:grid-cols-3">
            <div>
              <span className="text-fg-subtle">Periode</span>
              <div>{period ? `${period.starts_on} — ${period.ends_on}` : '—'}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Sumber</span>
              <div>{FINANCIAL_SOURCE_LABELS[version.source] ?? version.source}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Versi</span>
              <div>v{version.version_number}</div>
            </div>
          </div>
        </CardBody>
      </Card>
      {version.document_asset_id ? (
        <Card>
          <CardHeader>
            <CardTitle>Lampiran resmi</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-body-sm text-fg-muted">
                Unduh berkas laporan yang diterbitkan Admin untuk periode ini.
              </p>
              <Button asChild>
                <a href={`/api/investor/financial-reports/${report.id}/file`}>Unduh laporan</a>
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
      {kpis?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.kpi_key}>
              <CardBody>
                <div className="text-caption text-fg-subtle">{kpi.label}</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {formatFinancialKpi(kpi.value, kpi.unit, period?.currency ?? 'IDR')}
                </div>
                <div className="text-caption text-fg-subtle">
                  {KPI_BASIS_LABELS[kpi.basis] ?? kpi.basis}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardBody>
          {!lineItems?.length ? (
            <EmptyState
              title="Belum ada line item"
              description="Versi laporan belum memiliki rincian angka terstruktur."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="text-body-sm w-full">
                <thead>
                  <tr className="border-border-subtle text-caption text-fg-subtle border-b text-left">
                    <th className="px-3 py-2">Statement</th>
                    <th className="px-3 py-2">Kategori</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Catatan</th>
                    <th className="px-3 py-2 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr
                      key={`${item.label}-${index}`}
                      className="border-border-subtle border-b last:border-0"
                    >
                      <td className="px-3 py-2">
                        {FINANCIAL_STATEMENT_LABELS[item.statement] ?? item.statement}
                      </td>
                      <td className="px-3 py-2">
                        {FINANCIAL_CATEGORY_LABELS[item.category] ?? item.category}
                      </td>
                      <td className="px-3 py-2">{item.label}</td>
                      <td className="text-fg-muted px-3 py-2">{item.note || '—'}</td>
                      <td className="tabular px-3 py-2 text-right">
                        {Number(item.amount).toLocaleString('id-ID')} {item.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
