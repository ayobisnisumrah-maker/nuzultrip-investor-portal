import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  ACCOUNTING_FRAMEWORK_LABELS,
  FINANCIAL_CATEGORY_LABELS,
  FINANCIAL_SOURCE_LABELS,
  FINANCIAL_STATEMENT_LABELS,
  formatFinancialKpi,
  KPI_BASIS_LABELS,
} from '@/core/financials/format'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Laporan Keuangan' }

function Heading({ title, description, right = false }: { title: string; description: string; right?: boolean }) {
  return <div className={right ? 'text-right' : ''}><div>{title}</div><div className="text-[10px] font-normal normal-case tracking-normal text-fg-subtle">{description}</div></div>
}

export default async function InvestorFinancialReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireInvestorPage()
  const { id } = await params
  const supabase = await getServerSupabase()

  const { data: report } = await supabase
    .from('financial_reports')
    .select('id,title,summary,status,visibility,financial_period_id,published_version_id')
    .eq('id', id).eq('status', 'published').eq('visibility', 'investors').maybeSingle()
  if (!report || !report.published_version_id) notFound()

  const versionId = report.published_version_id
  const [{ data: version }, { data: period }, { data: lineItems }, { data: kpis }, { data: disclosures }] = await Promise.all([
    supabase.from('financial_report_versions').select('version_number,source,prepared_by,notes,document_asset_id,published_at,accounting_framework,basis_of_preparation').eq('id', versionId).maybeSingle(),
    supabase.from('financial_periods').select('period_type,fiscal_year,period_index,starts_on,ends_on,currency').eq('id', report.financial_period_id).maybeSingle(),
    supabase.from('financial_line_items').select('statement,category,label,amount,currency,position,note').eq('financial_report_version_id', versionId).order('position'),
    supabase.from('financial_kpis').select('kpi_key,label,value,unit,basis,position').eq('financial_report_version_id', versionId).order('position'),
    supabase.from('financial_report_disclosures').select('id,title,content,position').eq('financial_report_version_id', versionId).order('position'),
  ])
  if (!version) notFound()

  return <Stack gap={8}>
    <RealtimeRefresher topic={topics.allInvestors()} kinds={['financial_report.published']} />
    <PageHeader eyebrow="Laporan Keuangan" title={report.title} description={report.summary || 'Laporan keuangan resmi yang telah diterbitkan untuk investor.'} />

    <Card><CardHeader><CardTitle>Identitas laporan</CardTitle></CardHeader><CardBody><div className="text-body-sm grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div><span className="text-fg-subtle">Periode</span><p className="text-caption text-fg-subtle">Rentang transaksi dan posisi yang dicakup.</p><strong>{period ? `${period.starts_on} — ${period.ends_on}` : '—'}</strong></div>
      <div><span className="text-fg-subtle">Sumber</span><p className="text-caption text-fg-subtle">Tingkat penelaahan versi laporan.</p><strong>{FINANCIAL_SOURCE_LABELS[version.source] ?? version.source}</strong></div>
      <div><span className="text-fg-subtle">Versi</span><p className="text-caption text-fg-subtle">Snapshot immutable yang diterbitkan.</p><strong>v{version.version_number}</strong></div>
      <div><span className="text-fg-subtle">Kerangka</span><p className="text-caption text-fg-subtle">Kerangka yang dinyatakan pada versi ini.</p><strong>{version.accounting_framework ? ACCOUNTING_FRAMEWORK_LABELS[version.accounting_framework] ?? version.accounting_framework : 'Tidak dideklarasikan'}</strong></div>
    </div></CardBody></Card>

    {version.basis_of_preparation ? <Card><CardHeader><CardTitle>Dasar penyusunan</CardTitle></CardHeader><CardBody><p className="text-caption text-fg-subtle mb-2">Basis pengukuran dan asumsi yang digunakan pada snapshot laporan ini.</p><p className="whitespace-pre-wrap text-sm leading-6">{version.basis_of_preparation}</p></CardBody></Card> : null}

    {version.document_asset_id ? <Card><CardHeader><CardTitle>Lampiran resmi</CardTitle></CardHeader><CardBody><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-body-sm text-fg-muted">Berkas pendukung yang terikat pada versi laporan terbit ini.</p><Button asChild><a href={`/api/investor/financial-reports/${report.id}/file`}>Unduh laporan</a></Button></div></CardBody></Card> : null}

    {kpis?.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{kpis.map((kpi) => <Card key={kpi.kpi_key}><CardBody><div className="text-caption text-fg-subtle">{kpi.label}</div><div className="text-heading-lg tabular mt-1 font-semibold">{formatFinancialKpi(kpi.value, kpi.unit, period?.currency ?? 'IDR')}</div><div className="text-caption text-fg-subtle">Dasar: {KPI_BASIS_LABELS[kpi.basis] ?? kpi.basis}</div></CardBody></Card>)}</div> : null}

    <Card><CardHeader><CardTitle>Rincian laporan utama</CardTitle></CardHeader><CardBody>
      {!lineItems?.length ? <EmptyState title="Belum ada rincian" description="Versi laporan belum memiliki rincian angka terstruktur." /> : <div className="overflow-x-auto"><table className="text-body-sm w-full"><thead><tr className="border-border-subtle text-caption text-fg-subtle border-b text-left align-bottom">
        <th className="px-3 py-2"><Heading title="Laporan" description="Komponen laporan utama." /></th><th className="px-3 py-2"><Heading title="Kategori" description="Kelompok akuntansi pos." /></th><th className="px-3 py-2"><Heading title="Nama pos" description="Akun/pos yang disajikan." /></th><th className="px-3 py-2"><Heading title="Keterangan" description="Sumber atau basis rekonsiliasi." /></th><th className="px-3 py-2"><Heading title="Nilai" description="Saldo/nilai periode." right /></th>
      </tr></thead><tbody>{lineItems.map((item,index) => <tr key={`${item.label}-${index}`} className="border-border-subtle border-b last:border-0"><td className="px-3 py-2">{FINANCIAL_STATEMENT_LABELS[item.statement] ?? item.statement}</td><td className="px-3 py-2">{FINANCIAL_CATEGORY_LABELS[item.category] ?? item.category}</td><td className="px-3 py-2">{item.label}</td><td className="text-fg-muted px-3 py-2">{item.note || '—'}</td><td className="tabular px-3 py-2 text-right">{Number(item.amount).toLocaleString('id-ID')} {item.currency}</td></tr>)}</tbody></table></div>}
    </CardBody></Card>

    <Card><CardHeader><CardTitle>Catatan atas Laporan Keuangan (CALK)</CardTitle></CardHeader><CardBody>
      {!disclosures?.length ? <EmptyState title="Tidak ada CALK pada versi ini" description="Laporan legacy dapat diterbitkan tanpa structured CALK bila kerangka akuntansi belum dideklarasikan." /> : <div className="grid gap-5">{disclosures.map((item) => <article key={item.id} className="border-border rounded-lg border p-4"><h3 className="font-semibold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.content}</p></article>)}</div>}
    </CardBody></Card>

    {version.notes ? <Card><CardHeader><CardTitle>Catatan manajemen</CardTitle></CardHeader><CardBody><p className="whitespace-pre-wrap text-sm leading-6">{version.notes}</p></CardBody></Card> : null}
  </Stack>
}
