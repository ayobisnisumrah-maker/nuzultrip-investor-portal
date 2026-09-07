import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export default async function FinancialsPage() {
  const principal = await adminWithPermission('financial_periods.view', '/admin/financials')

  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat modul keuangan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const [periodsResult, reportsResult, kpisResult] = await Promise.all([
    supabase.from('financial_periods').select('id, status', { count: 'exact' }),
    supabase.from('financial_reports').select('id, status', { count: 'exact' }),
    supabase.from('financial_kpis').select('id', { count: 'exact', head: true }),
  ])

  if (periodsResult.error || reportsResult.error || kpisResult.error) {
    return (
      <Stack gap={6}>
        <PageHeader
          eyebrow="Keuangan"
          title="Ringkasan Keuangan"
          description="Ringkasan periode, laporan, dan KPI keuangan perusahaan."
        />
        <Alert tone="danger" title="Ringkasan tidak dapat dimuat">
          Sistem gagal mengambil sebagian data keuangan. Silakan coba lagi.
        </Alert>
      </Stack>
    )
  }

  const periods = periodsResult.data ?? []
  const reports = reportsResult.data ?? []
  const openPeriods = periods.filter((item) => item.status === 'open').length
  const publishedReports = reports.filter((item) => item.status === 'published').length
  const reportsInWorkflow = reports.filter((item) => ['review', 'approved'].includes(item.status)).length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan"
        title="Ringkasan Keuangan"
        description="Pantau sumber informasi keuangan resmi yang digunakan Admin dan hanya ditampilkan kepada investor setelah melalui persetujuan dan publikasi."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardBody><div className="text-caption text-fg-subtle">Periode Terbuka</div><div className="text-heading-lg mt-1 font-semibold">{openPeriods}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Laporan Dalam Proses</div><div className="text-heading-lg mt-1 font-semibold">{reportsInWorkflow}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Laporan Terbit</div><div className="text-heading-lg mt-1 font-semibold">{publishedReports}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">KPI Tercatat</div><div className="text-heading-lg mt-1 font-semibold">{kpisResult.count ?? 0}</div></CardBody></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/financials/periods" className="border-border bg-surface hover:border-primary-solid rounded-xl border p-5 transition">
          <h2 className="text-body text-fg font-semibold">Periode Keuangan</h2>
          <p className="text-body-sm text-fg-muted mt-2">Kelola periode pelaporan, pembukaan periode, dan penguncian setelah proses pelaporan selesai.</p>
          <p className="text-caption text-fg-subtle mt-4">{periods.length} periode terdaftar</p>
        </Link>

        <Link href="/admin/financials/reports" className="border-border bg-surface hover:border-primary-solid rounded-xl border p-5 transition">
          <h2 className="text-body text-fg font-semibold">Laporan Keuangan</h2>
          <p className="text-body-sm text-fg-muted mt-2">Pantau laporan, peninjauan, persetujuan, visibilitas, dan publikasi kepada investor.</p>
          <p className="text-caption text-fg-subtle mt-4">{reports.length} laporan terdaftar</p>
        </Link>

        <Link href="/admin/financials/kpis" className="border-border bg-surface hover:border-primary-solid rounded-xl border p-5 transition">
          <h2 className="text-body text-fg font-semibold">KPI Keuangan</h2>
          <p className="text-body-sm text-fg-muted mt-2">Lihat indikator utama yang melekat pada versi laporan keuangan.</p>
          <p className="text-caption text-fg-subtle mt-4">{kpisResult.count ?? 0} KPI tercatat</p>
        </Link>
      </div>
    </Stack>
  )
}
