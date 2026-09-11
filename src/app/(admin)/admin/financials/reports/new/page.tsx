import Link from 'next/link'

import { isFinancialPeriodCalendarAligned } from '@/core/financials/periods'
import { topics } from '@/core/realtime/events'
import { FinancialReportCreateForm } from '@/features/admin/financials/financial-report-create-form'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
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
  const [periodsResult, reportsResult] = await Promise.all([
    supabase
      .from('financial_periods')
      .select('id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status')
      .neq('status', 'locked')
      .order('starts_on', { ascending: false }),
    supabase
      .from('financial_reports')
      .select('id, financial_period_id, title, status'),
  ])

  const loadError = periodsResult.error ?? reportsResult.error
  const existingReportByPeriod = new Map(
    (reportsResult.data ?? []).map((report) => [report.financial_period_id, report] as const),
  )

  const periodsWithoutReports = (periodsResult.data ?? []).filter(
    (period) => !existingReportByPeriod.has(period.id),
  )
  const invalidPeriods = periodsWithoutReports.filter(
    (period) =>
      !isFinancialPeriodCalendarAligned({
        periodType: period.period_type,
        fiscalYear: period.fiscal_year,
        periodIndex: period.period_index,
        startsOn: period.starts_on,
        endsOn: period.ends_on,
      }),
  )

  const options = periodsWithoutReports
    .filter((period) => !invalidPeriods.some((invalid) => invalid.id === period.id))
    .map((period) => ({
      id: period.id,
      periodType: period.period_type,
      fiscalYear: period.fiscal_year,
      periodIndex: period.period_index,
      startsOn: period.starts_on,
      endsOn: period.ends_on,
      currency: period.currency.trim().toUpperCase(),
      label: `${period.period_type} ${period.fiscal_year}/${period.period_index} · ${period.starts_on}—${period.ends_on}`,
      status: period.status,
    }))

  const existingReports = (periodsResult.data ?? [])
    .map((period) => {
      const report = existingReportByPeriod.get(period.id)
      return report ? { period, report } : null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={topics.admin()}
        kinds={['financial_period.changed', 'financial_report.state_changed']}
      />
      <PageHeader
        eyebrow="Keuangan"
        title="Laporan Keuangan Baru"
        description="Pilih periode, lalu sistem menyusun draft laporan investor dari transaksi Kasir & Invoice secara otomatis."
        actions={<Link href="/admin/financials/reports" className="text-body-sm text-link hover:underline">Kembali</Link>}
      />
      {loadError ? (
        <Alert tone="danger" title="Periode tidak dapat dimuat">
          Sistem gagal mengambil periode atau laporan keuangan yang sudah tersedia. Pembuatan laporan dinonaktifkan agar tidak terjadi duplikasi.
        </Alert>
      ) : null}
      {!loadError && invalidPeriods.length ? (
        <Alert tone="danger" title="Ada periode lama yang tidak sesuai kalender">
          {invalidPeriods.length} periode belum dapat dipakai untuk laporan karena tanggalnya tidak sesuai jenis, tahun fiskal, dan indeks periode. Perbaiki periode tersebut di Kelola Periode Keuangan; sistem tidak akan membuat laporan dari rentang yang salah.
        </Alert>
      ) : null}
      {!loadError && existingReports.length ? (
        <Alert tone="info" title="Periode yang sudah memiliki laporan tidak ditampilkan">
          Satu periode keuangan hanya dapat memiliki satu laporan. Untuk merevisi laporan yang sudah ada, buka laporan tersebut dari daftar Laporan Keuangan.
        </Alert>
      ) : null}
      <Card>
        <CardHeader><CardTitle>Buat laporan dari transaksi</CardTitle></CardHeader>
        <CardBody><FinancialReportCreateForm periods={loadError ? [] : options} /></CardBody>
      </Card>
      {!loadError && !options.length ? (
        <div className="flex flex-wrap gap-4">
          <Link href="/admin/financials/reports" className="text-body-sm text-link font-medium hover:underline">Buka laporan yang sudah ada →</Link>
          <Link href="/admin/financials/periods" className="text-body-sm text-link font-medium hover:underline">Kelola periode keuangan →</Link>
        </div>
      ) : null}
    </Stack>
  )
}
