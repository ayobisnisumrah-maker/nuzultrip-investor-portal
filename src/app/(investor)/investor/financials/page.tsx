import type { Metadata } from 'next'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Keuangan' }

export default async function InvestorFinancialsPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: reports } = await supabase
    .from('financial_reports')
    .select('id, financial_period_id, title, summary, published_version_id, created_at, updated_at')
    .eq('status', 'published')
    .eq('visibility', 'investors')
    .order('updated_at', { ascending: false })

  const periodIds = [...new Set((reports ?? []).map((report) => report.financial_period_id))]
  const { data: periods } = periodIds.length
    ? await supabase.from('financial_periods').select('id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status').in('id', periodIds)
    : { data: [] }

  const periodMap = new Map((periods ?? []).map((period) => [period.id, period]))

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Financial Information" title="Keuangan" description="Laporan keuangan yang telah dipublikasikan untuk investor." />
      {!reports?.length ? (
        <EmptyState title="Belum ada laporan" description="Laporan yang telah dipublikasikan untuk investor akan muncul di sini." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reports.map((report) => {
            const period = periodMap.get(report.financial_period_id)
            return (
              <Card key={report.id}>
                <CardHeader><CardTitle>{report.title}</CardTitle></CardHeader>
                <CardBody>
                  <div className="flex flex-col gap-3 text-body-sm">
                    <p className="text-fg-muted">{report.summary || 'Laporan keuangan investor.'}</p>
                    <div className="text-caption text-fg-subtle">
                      Periode {period ? `${period.period_type} ${period.fiscal_year}${period.period_index ? `/${period.period_index}` : ''}` : '—'} · {period?.currency ?? 'IDR'}
                    </div>
                    {report.published_version_id ? (
                      <a href={`/investor/financials/${report.id}`} className="text-link hover:underline">Lihat laporan →</a>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </Stack>
  )
}
