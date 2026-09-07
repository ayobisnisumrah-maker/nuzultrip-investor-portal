import Link from 'next/link'
import type { Metadata } from 'next'

import { PUBLICATION_STATUS_LABELS, VISIBILITY_LABELS } from '@/core/documents/publication'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Laporan Keuangan' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatPeriod(period: { period_type: string; fiscal_year: number; period_index: number | null } | undefined) {
  if (!period) return 'Periode tidak ditemukan'
  const typeLabel: Record<string, string> = { yearly: 'Tahunan', quarterly: 'Triwulanan', monthly: 'Bulanan' }
  const prefix = typeLabel[period.period_type] ?? period.period_type
  return `${prefix}${period.period_index ? ` ${period.period_index}` : ''} / ${period.fiscal_year}`
}

export default async function FinancialReportsPage() {
  const principal = await adminWithPermission('financial_reports.view', '/admin/financials/reports')
  if (!principal) return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin untuk melihat laporan keuangan.</Alert>

  const supabase = await getServerSupabase()
  const { data: reports, error } = await supabase
    .from('financial_reports')
    .select('id, financial_period_id, title, summary, visibility, status, current_version_id, published_version_id, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) return <Stack gap={6}><PageHeader eyebrow="Keuangan" title="Laporan Keuangan" description="Kelola laporan keuangan dan proses publikasinya untuk investor." /><Alert tone="danger" title="Laporan tidak dapat dimuat">Sistem gagal mengambil laporan keuangan. Silakan coba lagi.</Alert></Stack>

  const periodIds = [...new Set((reports ?? []).map((report) => report.financial_period_id))]
  const { data: periods } = periodIds.length
    ? await supabase.from('financial_periods').select('id, period_type, fiscal_year, period_index, currency, starts_on, ends_on, status').in('id', periodIds)
    : { data: [] }
  const periodMap = new Map((periods ?? []).map((period) => [period.id, period]))
  const rows = reports ?? []
  const publishedCount = rows.filter((item) => item.status === 'published').length
  const reviewCount = rows.filter((item) => item.status === 'review').length
  const approvedCount = rows.filter((item) => item.status === 'approved').length
  const draftCount = rows.filter((item) => item.status === 'draft').length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan"
        title="Laporan Keuangan"
        description="Pantau seluruh laporan, periode, visibilitas, dan status peninjauan hingga publikasi kepada investor."
        actions={principal.permissions.has('financial_reports.create') ? <Link href="/admin/financials/reports/new" className="bg-primary-solid text-primary-fg inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium">+ Laporan Baru</Link> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardBody><div className="text-caption text-fg-subtle">Draf</div><div className="text-heading-lg mt-1 font-semibold">{draftCount}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Ditinjau</div><div className="text-heading-lg mt-1 font-semibold">{reviewCount}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Disetujui</div><div className="text-heading-lg mt-1 font-semibold">{approvedCount}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Terbit</div><div className="text-heading-lg mt-1 font-semibold">{publishedCount}</div></CardBody></Card>
      </div>

      {!rows.length ? (
        <EmptyState title="Belum ada laporan keuangan" description="Buat periode keuangan terlebih dahulu, lalu buat laporan draf dari halaman ini." />
      ) : (
        <div className="grid gap-4">
          {rows.map((report) => {
            const period = periodMap.get(report.financial_period_id)
            return (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><CardTitle>{report.title}</CardTitle><p className="text-body-sm text-fg-muted mt-1">{formatPeriod(period)}</p></div>
                    <span className="border-border rounded-full border px-3 py-1 text-caption font-medium">{PUBLICATION_STATUS_LABELS[report.status]}</span>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div><div className="text-caption text-fg-subtle">Visibilitas</div><div className="mt-1 text-body-sm font-medium">{VISIBILITY_LABELS[report.visibility]}</div></div>
                    <div><div className="text-caption text-fg-subtle">Mata uang</div><div className="mt-1 text-body-sm font-medium">{period?.currency ?? '—'}</div></div>
                    <div><div className="text-caption text-fg-subtle">Versi terbit</div><div className="mt-1 text-body-sm font-medium">{report.published_version_id ? 'Tersedia' : 'Belum tersedia'}</div></div>
                    <div><div className="text-caption text-fg-subtle">Diperbarui</div><div className="mt-1 text-body-sm font-medium">{formatDate(report.updated_at)}</div></div>
                  </div>
                  {report.summary ? <p className="text-body-sm text-fg-muted mt-4">{report.summary}</p> : null}
                  <div className="mt-4"><Link href={`/admin/financials/reports/${report.id}`} className="text-body-sm text-link font-medium hover:underline">Kelola laporan →</Link></div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </Stack>
  )
}
