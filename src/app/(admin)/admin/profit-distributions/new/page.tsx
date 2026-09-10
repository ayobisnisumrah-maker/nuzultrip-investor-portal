import Link from 'next/link'

import { ProfitDistributionCreateForm } from '@/features/admin/profit-distribution-create-form'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export default async function NewProfitDistributionPage() {
  const principal = await adminWithPermission(
    'profit_distributions.create',
    '/admin/profit-distributions/new',
  )
  if (!principal)
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin membuat distribusi bagi hasil.
      </Alert>
    )

  const supabase = await getServerSupabase()
  const [offeringsResult, reportsResult] = await Promise.all([
    supabase
      .from('ownership_offerings')
      .select('id, name, code, status')
      .neq('status', 'archived')
      .order('created_at', { ascending: false }),
    supabase
      .from('financial_reports')
      .select('title, published_version_id, financial_periods!inner(starts_on, ends_on, status)')
      .eq('status', 'published')
      .eq('visibility', 'investors')
      .in('financial_periods.status', ['closed', 'locked'])
      .not('published_version_id', 'is', null),
  ])

  const reportRows = reportsResult.data ?? []
  const versionIds = reportRows.flatMap((report) =>
    report.published_version_id ? [report.published_version_id] : [],
  )
  const lineItemsResult = versionIds.length
    ? await supabase
        .from('financial_line_items')
        .select('financial_report_version_id, statement, category, amount')
        .in('financial_report_version_id', versionIds)
        .eq('statement', 'income')
    : { data: [], error: null }

  const reports = reportRows.flatMap((report) => {
    if (!report.published_version_id) return []
    const period = Array.isArray(report.financial_periods)
      ? report.financial_periods[0]
      : report.financial_periods
    if (!period) return []
    const items = (lineItemsResult.data ?? []).filter(
      (item) => item.financial_report_version_id === report.published_version_id,
    )
    const revenue = items
      .filter((item) => item.category === 'revenue')
      .reduce((sum, item) => sum + Number(item.amount), 0)
    const expenses = items
      .filter((item) => item.category === 'expense')
      .reduce((sum, item) => sum + Number(item.amount), 0)
    return [
      {
        versionId: report.published_version_id,
        title: report.title,
        periodLabel: `${period.starts_on} – ${period.ends_on}`,
        revenue,
        expenses,
        profit: Math.max(revenue - expenses, 0),
      },
    ]
  })

  const loadError = offeringsResult.error || reportsResult.error || lineItemsResult.error

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Kepemilikan"
        title="Distribusi Bagi Hasil Baru"
        description="Hitung profit setelah OPEX dan siapkan pool investor dari satu penawaran kepemilikan."
        actions={
          <Link
            href="/admin/profit-distributions"
            className="text-body-sm text-link hover:underline"
          >
            Kembali
          </Link>
        }
      />
      {loadError ? (
        <Alert tone="danger" title="Data sumber tidak dapat dimuat">
          Sistem gagal mengambil penawaran atau laporan keuangan resmi.
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Parameter distribusi</CardTitle>
        </CardHeader>
        <CardBody>
          <ProfitDistributionCreateForm offerings={offeringsResult.data ?? []} reports={reports} />
        </CardBody>
      </Card>
    </Stack>
  )
}
