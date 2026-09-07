import Link from 'next/link'

import { FinancialReportCreateForm } from '@/features/admin/financials/financial-report-create-form'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export default async function NewFinancialReportPage() {
  const principal = await adminWithPermission('financial_reports.create', '/admin/financials/reports/new')
  if (!principal) {
    return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin membuat laporan keuangan.</Alert>
  }

  const supabase = await getServerSupabase()
  const { data: periods, error } = await supabase
    .from('financial_periods')
    .select('id, period_type, fiscal_year, period_index, starts_on, ends_on, status')
    .neq('status', 'locked')
    .order('starts_on', { ascending: false })

  const options = (periods ?? []).map((period) => ({
    id: period.id,
    label: `${period.period_type} ${period.fiscal_year}/${period.period_index} · ${period.starts_on}—${period.ends_on}`,
    status: period.status,
  }))

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Keuangan" title="Laporan Keuangan Baru" description="Buat container laporan dan versi draft pertama secara atomik." actions={<Link href="/admin/financials/reports" className="text-body-sm text-link hover:underline">Kembali</Link>} />
      {error ? <Alert tone="danger" title="Periode tidak dapat dimuat">Sistem gagal mengambil daftar periode keuangan.</Alert> : null}
      <Card>
        <CardHeader><CardTitle>Data laporan</CardTitle></CardHeader>
        <CardBody><FinancialReportCreateForm periods={options} /></CardBody>
      </Card>
      {!options.length ? (
        <div><Link href="/admin/financials/periods" className="text-body-sm text-link font-medium hover:underline">Kelola periode keuangan →</Link></div>
      ) : null}
    </Stack>
  )
}
