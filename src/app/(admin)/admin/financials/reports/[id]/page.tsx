import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  FINANCIAL_CATEGORY_LABELS,
  FINANCIAL_SOURCE_LABELS,
  FINANCIAL_STATEMENT_LABELS,
  formatFinancialKpi,
  KPI_BASIS_LABELS,
} from '@/core/financials/format'
import { FinancialReportLifecycleActions } from '@/features/admin/financials/financial-report-lifecycle-actions'
import { FinancialReportContentEditor } from '@/features/admin/financials/financial-report-content-editor'
import { FinancialReportTransactionSync } from '@/features/admin/financials/financial-report-transaction-sync'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'
import { PageHeader, Stack } from '@/ui/layout'

function money(value: number | string, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export default async function FinancialReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const principal = await adminWithPermission(
    'financial_reports.view',
    `/admin/financials/reports/${id}`,
  )
  if (!principal)
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin melihat laporan keuangan.
      </Alert>
    )

  const supabase = await getServerSupabase()
  const { data: report, error } = await supabase
    .from('financial_reports')
    .select(
      'id, financial_period_id, title, summary, visibility, status, current_version_id, published_version_id, owner_admin_id, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()
  if (error)
    return (
      <Alert tone="danger" title="Laporan tidak dapat dimuat">
        Sistem gagal membaca laporan keuangan.
      </Alert>
    )
  if (!report) notFound()

  const [{ data: period }, { data: versions }] = await Promise.all([
    supabase
      .from('financial_periods')
      .select('period_type, fiscal_year, period_index, starts_on, ends_on, currency, status')
      .eq('id', report.financial_period_id)
      .maybeSingle(),
    supabase
      .from('financial_report_versions')
      .select(
        'id, version_number, status, source, prepared_by, notes, document_asset_id, approved_at, published_at, created_at',
      )
      .eq('financial_report_id', report.id)
      .order('version_number', { ascending: false }),
  ])
  const currentVersion = (versions ?? []).find((v) => v.id === report.current_version_id)
  const versionId = report.current_version_id
  const [{ data: lines }, { data: kpis }] = versionId
    ? await Promise.all([
        supabase
          .from('financial_line_items')
          .select('id, statement, category, line_key, label, amount, currency, position, note')
          .eq('financial_report_version_id', versionId)
          .order('position'),
        supabase
          .from('financial_kpis')
          .select('id, kpi_key, label, value, unit, basis, position')
          .eq('financial_report_version_id', versionId)
          .order('position'),
      ])
    : [{ data: [] }, { data: [] }]
  const { data: attachment } = currentVersion?.document_asset_id
    ? await supabase
        .from('media_assets')
        .select('id, original_filename, mime_type, byte_size')
        .eq('id', currentVersion.document_asset_id)
        .maybeSingle()
    : { data: null }

  const canSyncTransactions =
    report.status === 'draft' && principal.permissions.has('financial_reports.update')

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan / Laporan"
        title={report.title}
        description={report.summary || 'Kelola lifecycle dan isi versi laporan keuangan.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/financials/reports"
              className="border-border rounded-lg border px-3 py-2 text-sm"
            >
              Kembali
            </Link>
            {canSyncTransactions ? <FinancialReportTransactionSync reportId={report.id} /> : null}
            <FinancialReportLifecycleActions
              reportId={report.id}
              title={report.title}
              status={report.status}
              permissions={[...principal.permissions]}
            />
          </div>
        }
      />

      {canSyncTransactions ? (
        <Alert tone="info" title="Draft terhubung ke transaksi operasional">
          Klik “Sinkronkan dari transaksi” untuk menghitung ulang invoice, pembayaran, refund, pengeluaran,
          arus kas, piutang, dan jumlah pax sesuai periode. Setelah itu Admin dapat merevisi angka atau
          catatan yang memang membutuhkan penyesuaian sebelum peninjauan.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Status</p>
            <p className="mt-1 font-semibold">{report.status}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Visibilitas</p>
            <p className="mt-1 font-semibold">{report.visibility}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Periode</p>
            <p className="mt-1 font-semibold">
              {period ? `${period.period_type} ${period.fiscal_year}/${period.period_index}` : '—'}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-caption text-fg-subtle">Versi aktif</p>
            <p className="mt-1 font-semibold">
              {currentVersion ? `v${currentVersion.version_number}` : '—'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Versi aktif</CardTitle>
        </CardHeader>
        <CardBody>
          {currentVersion ? (
            <div className="text-body-sm grid gap-3 sm:grid-cols-2">
              <p>
                Sumber:{' '}
                <strong>
                  {FINANCIAL_SOURCE_LABELS[currentVersion.source] ?? currentVersion.source}
                </strong>
              </p>
              <p>
                Disiapkan oleh: <strong>{currentVersion.prepared_by || '—'}</strong>
              </p>
              <p>
                Disetujui: <strong>{currentVersion.approved_at || '—'}</strong>
              </p>
              <p>
                Diterbitkan: <strong>{currentVersion.published_at || '—'}</strong>
              </p>
              {currentVersion.notes ? (
                <p className="whitespace-pre-wrap sm:col-span-2">{currentVersion.notes}</p>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="Versi belum tersedia"
              description="Laporan belum memiliki versi aktif."
            />
          )}
        </CardBody>
      </Card>

      {report.status === 'draft' && principal.permissions.has('financial_reports.update') ? (
        <Card>
          <CardHeader>
            <CardTitle>Lengkapi laporan untuk investor</CardTitle>
          </CardHeader>
          <CardBody>
            <FinancialReportContentEditor
              reportId={report.id}
              initialAsset={attachment}
              initialLines={(lines ?? []).map((line) => ({
                statement: line.statement,
                category: line.category,
                lineKey: line.line_key,
                label: line.label,
                amount: String(line.amount),
                currency: line.currency.trim(),
                note: line.note ?? '',
              }))}
              initialKpis={(kpis ?? []).map((kpi) => ({
                kpiKey: kpi.kpi_key,
                label: kpi.label,
                value: String(kpi.value),
                unit: kpi.unit as 'ratio' | 'percent' | 'currency' | 'count' | 'days',
                basis: kpi.basis as 'reported' | 'derived',
              }))}
            />
          </CardBody>
        </Card>
      ) : attachment ? (
        <a
          href={`/api/admin/financial-reports/${report.id}/file`}
          className="text-link text-sm font-medium hover:underline"
        >
          Unduh lampiran laporan →
        </a>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Line items ({lines?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardBody>
          {!lines?.length ? (
            <EmptyState
              title="Belum ada rincian angka"
              description="Klik sinkronisasi transaksi untuk membuat rincian awal, lalu revisi bila diperlukan."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="text-body-sm w-full">
                <thead>
                  <tr className="border-border border-b text-left">
                    <th className="p-2">Statement</th>
                    <th className="p-2">Kategori</th>
                    <th className="p-2">Label</th>
                    <th className="p-2">Catatan</th>
                    <th className="p-2 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-border border-b">
                      <td className="p-2">
                        {FINANCIAL_STATEMENT_LABELS[line.statement] ?? line.statement}
                      </td>
                      <td className="p-2">
                        {FINANCIAL_CATEGORY_LABELS[line.category] ?? line.category}
                      </td>
                      <td className="p-2">{line.label}</td>
                      <td className="text-fg-muted p-2">{line.note || '—'}</td>
                      <td className="tabular p-2 text-right">
                        {money(line.amount, line.currency.trim())}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KPI ({kpis?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardBody>
          {!kpis?.length ? (
            <EmptyState
              title="Belum ada KPI"
              description="Klik sinkronisasi transaksi untuk membentuk KPI awal dari transaksi operasional."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="border-border rounded-lg border p-3">
                  <p className="text-caption text-fg-subtle">{kpi.label}</p>
                  <p className="text-heading-md tabular mt-1 font-semibold">
                    {formatFinancialKpi(kpi.value, kpi.unit, period?.currency ?? 'IDR')}
                  </p>
                  <p className="text-caption text-fg-subtle">
                    {KPI_BASIS_LABELS[kpi.basis] ?? kpi.basis}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
