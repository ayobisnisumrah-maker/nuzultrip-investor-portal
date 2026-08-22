import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'

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
              <div>{version.source}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Versi</span>
              <div>v{version.version_number}</div>
            </div>
          </div>
        </CardBody>
      </Card>
      {kpis?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.kpi_key}>
              <CardBody>
                <div className="text-caption text-fg-subtle">{kpi.label}</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {Number(kpi.value).toLocaleString('id-ID')}
                </div>
                <div className="text-caption text-fg-subtle">
                  {kpi.unit} · {kpi.basis}
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
                    <th className="px-3 py-2 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr
                      key={`${item.label}-${index}`}
                      className="border-border-subtle border-b last:border-0"
                    >
                      <td className="px-3 py-2">{item.statement}</td>
                      <td className="px-3 py-2">{item.category}</td>
                      <td className="px-3 py-2">{item.label}</td>
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
