import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  ACCOUNTING_FRAMEWORK_LABELS,
  FINANCIAL_CATEGORY_LABELS,
  FINANCIAL_SOURCE_LABELS,
  FINANCIAL_STATEMENT_LABELS,
  formatFinancialKpi,
  KPI_BASIS_LABELS,
} from '@/core/financials/format'
import { FinancialReportContentEditor } from '@/features/admin/financials/financial-report-content-editor'
import { FinancialReportInvestorReadiness } from '@/features/admin/financials/financial-report-investor-readiness'
import { FinancialReportLifecycleActions } from '@/features/admin/financials/financial-report-lifecycle-actions'
import { FinancialReportTransactionSync } from '@/features/admin/financials/financial-report-transaction-sync'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

function money(value: number | string, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value))
}

function ColumnHeading({ title, description, align = 'left' }: { title: string; description: string; align?: 'left' | 'right' }) {
  return <div className={align === 'right' ? 'text-right' : ''}><div>{title}</div><div className="text-[10px] font-normal normal-case tracking-normal text-fg-subtle">{description}</div></div>
}

export default async function FinancialReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('financial_reports.view', `/admin/financials/reports/${id}`)
  if (!principal) return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin melihat laporan keuangan.</Alert>

  const supabase = await getServerSupabase()
  const { data: report, error } = await supabase
    .from('financial_reports')
    .select('id,financial_period_id,title,summary,visibility,status,current_version_id,published_version_id,created_at,updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return <Alert tone="danger" title="Laporan tidak dapat dimuat">Sistem gagal membaca laporan keuangan.</Alert>
  if (!report) notFound()

  const [{ data: period }, { data: versions }] = await Promise.all([
    supabase.from('financial_periods').select('period_type,fiscal_year,period_index,starts_on,ends_on,currency,status').eq('id', report.financial_period_id).maybeSingle(),
    supabase.from('financial_report_versions').select('id,version_number,status,source,prepared_by,notes,document_asset_id,accounting_framework,basis_of_preparation,approved_at,published_at,created_at').eq('financial_report_id', report.id).order('version_number', { ascending: false }),
  ])
  const currentVersion = (versions ?? []).find((version) => version.id === report.current_version_id)
  const versionId = report.current_version_id
  const [{ data: lines }, { data: kpis }, { data: disclosures }] = versionId
    ? await Promise.all([
        supabase.from('financial_line_items').select('id,statement,category,line_key,label,amount,currency,position,note').eq('financial_report_version_id', versionId).order('position'),
        supabase.from('financial_kpis').select('id,kpi_key,label,value,unit,basis,position').eq('financial_report_version_id', versionId).order('position'),
        supabase.from('financial_report_disclosures').select('id,disclosure_key,title,content,position').eq('financial_report_version_id', versionId).order('position'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const { data: attachment } = currentVersion?.document_asset_id
    ? await supabase.from('media_assets').select('id,original_filename,mime_type,byte_size').eq('id', currentVersion.document_asset_id).maybeSingle()
    : { data: null }

  const canEdit = report.status === 'draft' && principal.permissions.has('financial_reports.update')

  return <Stack gap={8}>
    <PageHeader eyebrow="Keuangan / Laporan" title={report.title} description={report.summary || 'Kelola snapshot, basis penyusunan, laporan utama, KPI, dan CALK.'} actions={<div className="flex flex-wrap gap-2">
      <Link href="/admin/financials/reports" className="border-border rounded-lg border px-3 py-2 text-sm">Kembali</Link>
      <Link href={`/print/financial-reports/${report.id}`} target="_blank" className="border-border rounded-lg border px-3 py-2 text-sm font-medium">Pratinjau / PDF</Link>
      {canEdit ? <FinancialReportTransactionSync reportId={report.id} /> : null}
      <FinancialReportLifecycleActions reportId={report.id} title={report.title} status={report.status} permissions={[...principal.permissions]} />
    </div>} />

    {canEdit ? <Alert tone="info" title="Draft terhubung ke transaksi operasional">Sinkronisasi transaksi menghitung ulang data operasional namun mempertahankan pos akuntansi manual, termasuk Laporan Perubahan Ekuitas. Semua angka manual tetap harus direkonsiliasi sebelum review.</Alert> : null}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['Status', 'Tahap lifecycle laporan saat ini.', report.status], ['Visibilitas', 'Pihak yang dapat membaca versi terbit.', report.visibility], ['Periode', 'Periode akuntansi yang dicakup.', period ? `${period.period_type} ${period.fiscal_year}/${period.period_index}` : '—'], ['Versi aktif', 'Snapshot yang sedang dikelola.', currentVersion ? `v${currentVersion.version_number}` : '—']].map(([label,help,value]) => <Card key={label}><CardBody><p className="text-caption text-fg-subtle">{label}</p><p className="text-[11px] text-fg-subtle">{help}</p><p className="mt-1 font-semibold">{value}</p></CardBody></Card>)}
    </div>

    <FinancialReportInvestorReadiness summary={report.summary} visibility={report.visibility} preparedBy={currentVersion?.prepared_by ?? null} hasAttachment={Boolean(attachment)} currency={period?.currency?.trim().toUpperCase() || 'IDR'} lines={lines ?? []} kpis={kpis ?? []} />

    <Card><CardHeader><CardTitle>Basis & versi aktif</CardTitle></CardHeader><CardBody>
      {currentVersion ? <div className="text-body-sm grid gap-4 sm:grid-cols-2">
        <div><p className="text-fg-subtle">Sumber</p><p className="text-caption text-fg-subtle">Tingkat penelaahan dokumen sumber.</p><strong>{FINANCIAL_SOURCE_LABELS[currentVersion.source] ?? currentVersion.source}</strong></div>
        <div><p className="text-fg-subtle">Disiapkan oleh</p><p className="text-caption text-fg-subtle">Penanggung jawab penyusunan versi.</p><strong>{currentVersion.prepared_by || '—'}</strong></div>
        <div><p className="text-fg-subtle">Kerangka akuntansi</p><p className="text-caption text-fg-subtle">Deklarasi manajemen; bukan sertifikasi otomatis oleh sistem.</p><strong>{currentVersion.accounting_framework ? ACCOUNTING_FRAMEWORK_LABELS[currentVersion.accounting_framework] ?? currentVersion.accounting_framework : 'Belum ditetapkan'}</strong></div>
        <div><p className="text-fg-subtle">Status periode</p><p className="text-caption text-fg-subtle">Periode harus final sebelum publikasi.</p><strong>{period?.status ?? '—'}</strong></div>
        <div className="sm:col-span-2"><p className="text-fg-subtle">Dasar penyusunan</p><p className="text-caption text-fg-subtle">Basis pengukuran dan asumsi yang digunakan pada versi ini.</p><p className="mt-1 whitespace-pre-wrap">{currentVersion.basis_of_preparation || 'Belum diisi.'}</p></div>
      </div> : <EmptyState title="Versi belum tersedia" description="Laporan belum memiliki versi aktif." />}
    </CardBody></Card>

    {canEdit ? <Card><CardHeader><CardTitle>Lengkapi laporan untuk investor</CardTitle></CardHeader><CardBody>
      <FinancialReportContentEditor reportId={report.id} initialAsset={attachment} initialAccountingFramework={(currentVersion?.accounting_framework as 'sak_ep' | 'sak_indonesia' | 'other' | null) ?? null} initialBasisOfPreparation={currentVersion?.basis_of_preparation ?? ''} initialDisclosures={(disclosures ?? []).map((item) => ({ disclosureKey: item.disclosure_key, title: item.title, content: item.content }))} initialLines={(lines ?? []).map((line) => ({ statement: line.statement, category: line.category, lineKey: line.line_key, label: line.label, amount: String(line.amount), currency: line.currency.trim(), note: line.note ?? '' }))} initialKpis={(kpis ?? []).map((kpi) => ({ kpiKey: kpi.kpi_key, label: kpi.label, value: String(kpi.value), unit: kpi.unit as 'ratio' | 'percent' | 'currency' | 'count' | 'days', basis: kpi.basis as 'reported' | 'derived' }))} />
    </CardBody></Card> : attachment ? <a href={`/api/admin/financial-reports/${report.id}/file`} className="text-link text-sm font-medium hover:underline">Unduh lampiran laporan →</a> : null}

    <Card><CardHeader><CardTitle>Rincian laporan ({lines?.length ?? 0})</CardTitle></CardHeader><CardBody>
      {!lines?.length ? <EmptyState title="Belum ada rincian angka" description="Sinkronkan transaksi atau tambahkan pos terverifikasi untuk menyusun laporan." /> : <div className="overflow-x-auto"><table className="text-body-sm w-full"><thead><tr className="border-border border-b text-left align-bottom">
        <th className="p-2"><ColumnHeading title="Laporan" description="Komponen laporan utama." /></th>
        <th className="p-2"><ColumnHeading title="Kategori" description="Kelompok akuntansi pos." /></th>
        <th className="p-2"><ColumnHeading title="Nama pos" description="Akun/pos yang disajikan." /></th>
        <th className="p-2"><ColumnHeading title="Keterangan" description="Sumber atau basis rekonsiliasi." /></th>
        <th className="p-2"><ColumnHeading title="Nilai" description="Saldo/nilai periode." align="right" /></th>
      </tr></thead><tbody>{lines.map((line) => <tr key={line.id} className="border-border border-b"><td className="p-2">{FINANCIAL_STATEMENT_LABELS[line.statement] ?? line.statement}</td><td className="p-2">{FINANCIAL_CATEGORY_LABELS[line.category] ?? line.category}</td><td className="p-2">{line.label}</td><td className="text-fg-muted p-2">{line.note || '—'}</td><td className="tabular p-2 text-right">{money(line.amount, line.currency.trim())}</td></tr>)}</tbody></table></div>}
    </CardBody></Card>

    <Card><CardHeader><CardTitle>KPI ({kpis?.length ?? 0})</CardTitle></CardHeader><CardBody>
      {!kpis?.length ? <EmptyState title="Belum ada KPI" description="KPI merangkum kinerja dan tidak menggantikan laporan utama." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{kpis.map((kpi) => <div key={kpi.id} className="border-border rounded-lg border p-3"><p className="text-caption text-fg-subtle">{kpi.label}</p><p className="text-[11px] text-fg-subtle">Nilai indikator untuk periode laporan.</p><p className="text-heading-md tabular mt-1 font-semibold">{formatFinancialKpi(kpi.value, kpi.unit, period?.currency ?? 'IDR')}</p><p className="text-caption text-fg-subtle">Dasar: {KPI_BASIS_LABELS[kpi.basis] ?? kpi.basis}</p></div>)}</div>}
    </CardBody></Card>

    <Card><CardHeader><CardTitle>Catatan atas Laporan Keuangan / CALK ({disclosures?.length ?? 0})</CardTitle></CardHeader><CardBody>
      {!disclosures?.length ? <EmptyState title="Belum ada CALK" description="CALK menjelaskan kebijakan, rincian pos, estimasi, pihak berelasi, peristiwa material, dan pengungkapan relevan lainnya." /> : <div className="grid gap-4">{disclosures.map((item) => <article key={item.id} className="border-border rounded-lg border p-4"><h3 className="font-semibold">{item.title}</h3><p className="text-caption text-fg-subtle mt-1">Catatan versi laporan · {item.disclosure_key}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.content}</p></article>)}</div>}
    </CardBody></Card>
  </Stack>
}
