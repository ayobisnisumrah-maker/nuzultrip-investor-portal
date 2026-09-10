import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FINANCIAL_SOURCE_LABELS, FINANCIAL_STATEMENT_LABELS, formatFinancialKpi } from '@/core/financials/format'
import { FinancialReportPrintButton } from '@/features/admin/financials/financial-report-print-button'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

function money(value: number | string, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function periodLabel(period: { period_type: string; fiscal_year: number; period_index: number }) {
  const type = period.period_type.trim().toLowerCase()
  if (type === 'monthly') return `Bulanan ${period.fiscal_year}/${period.period_index}`
  if (type === 'quarterly') return `Kuartal ${period.period_index} ${period.fiscal_year}`
  if (type === 'annual') return `Tahunan ${period.fiscal_year}`
  return `${period.period_type} ${period.fiscal_year}/${period.period_index}`
}

export default async function PrintableFinancialReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('financial_reports.view', `/print/financial-reports/${id}`)
  if (!principal) return <main className="p-8">Akses laporan tidak tersedia.</main>

  const supabase = await getServerSupabase()
  const { data: report, error } = await supabase
    .from('financial_reports')
    .select('id,title,summary,status,visibility,financial_period_id,current_version_id,published_version_id')
    .eq('id', id)
    .maybeSingle()
  if (error || !report) notFound()

  const versionId = report.status === 'published' && report.published_version_id
    ? report.published_version_id
    : report.current_version_id
  if (!versionId) notFound()

  const [{ data: period }, { data: version }, { data: lines }, { data: kpis }] = await Promise.all([
    supabase
      .from('financial_periods')
      .select('period_type,fiscal_year,period_index,starts_on,ends_on,currency')
      .eq('id', report.financial_period_id)
      .maybeSingle(),
    supabase
      .from('financial_report_versions')
      .select('version_number,status,source,prepared_by,notes,approved_at,published_at,created_at')
      .eq('id', versionId)
      .maybeSingle(),
    supabase
      .from('financial_line_items')
      .select('id,statement,category,line_key,label,amount,currency,position,note')
      .eq('financial_report_version_id', versionId)
      .order('position'),
    supabase
      .from('financial_kpis')
      .select('id,kpi_key,label,value,unit,basis,position')
      .eq('financial_report_version_id', versionId)
      .order('position'),
  ])

  if (!period || !version) notFound()
  const currency = period.currency.trim().toUpperCase()
  const statementGroups = ['income', 'cash_flow', 'balance'] as const
  const kpiMap = new Map((kpis ?? []).map((kpi) => [kpi.kpi_key, kpi]))
  const headlineKpis = ['gross_revenue', 'operating_result', 'cash_in', 'cash_out', 'net_cashflow', 'pax_sold']
    .map((key) => kpiMap.get(key))
    .filter(Boolean)

  return (
    <main className="mx-auto min-h-screen max-w-[210mm] bg-white px-8 py-8 text-slate-900 print:max-w-none print:px-0 print:py-0">
      <style>{`
        @page { size: A4; margin: 14mm 14mm 16mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-section { break-inside: avoid; }
          .page-break { break-before: page; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <Link href={`/admin/financials/reports/${report.id}`} className="text-sm font-medium text-slate-700 hover:underline">← Kembali ke laporan</Link>
        <FinancialReportPrintButton />
      </div>

      <header className="border-b-2 border-slate-900 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Nuzultrip Equity · Investor Report</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{report.title}</h1>
            <p className="mt-2 text-sm text-slate-600">Periode {period.starts_on} s.d. {period.ends_on} · {periodLabel(period)}</p>
          </div>
          <div className="text-right text-xs leading-5 text-slate-500">
            <p>Versi {version.version_number}</p>
            <p>Status: {report.status}</p>
            <p>Mata uang: {currency}</p>
          </div>
        </div>
      </header>

      <section className="report-section mt-7">
        <h2 className="text-lg font-bold">Ringkasan Eksekutif</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {report.summary || 'Ringkasan manajemen belum diisi.'}
        </p>
      </section>

      <section className="report-section mt-7">
        <h2 className="text-lg font-bold">Ikhtisar Kinerja</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {headlineKpis.map((kpi) => kpi ? (
            <div key={kpi.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-base font-bold tabular-nums">{formatFinancialKpi(kpi.value, kpi.unit, currency)}</p>
            </div>
          ) : null)}
        </div>
      </section>

      {statementGroups.map((statement, index) => {
        const items = (lines ?? []).filter((line) => line.statement === statement)
        if (!items.length) return null
        return (
          <section key={statement} className={`report-section mt-8 ${index === 1 ? 'page-break' : ''}`}>
            <h2 className="text-lg font-bold">{FINANCIAL_STATEMENT_LABELS[statement] ?? statement}</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Pos</th>
                  <th className="px-2 py-2">Keterangan</th>
                  <th className="px-2 py-2 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {items.map((line) => (
                  <tr key={line.id} className="border-b border-slate-200 align-top">
                    <td className="px-2 py-2.5 font-medium">{line.label}</td>
                    <td className="px-2 py-2.5 text-xs leading-5 text-slate-600">{line.note || '—'}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(line.amount, line.currency.trim())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}

      <section className="report-section mt-8">
        <h2 className="text-lg font-bold">KPI Operasional & Keuangan</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <tbody>
            {(kpis ?? []).map((kpi) => (
              <tr key={kpi.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-4 text-slate-700">{kpi.label}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{formatFinancialKpi(kpi.value, kpi.unit, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section mt-8 rounded-xl border border-slate-200 p-4">
        <h2 className="text-lg font-bold">Catatan Manajemen & Basis Penyusunan</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
          <p>Sumber laporan: <strong>{FINANCIAL_SOURCE_LABELS[version.source] ?? version.source}</strong>.</p>
          <p>Disiapkan oleh: <strong>{version.prepared_by || 'Belum ditentukan'}</strong>.</p>
          <p className="whitespace-pre-wrap">{version.notes || 'Tidak ada catatan versi tambahan.'}</p>
          <p className="text-xs text-slate-500">Angka transaksi berasal dari data yang tersimpan dalam sistem sesuai periode laporan. Penyesuaian manual harus ditinjau sebelum publikasi.</p>
        </div>
      </section>

      <footer className="mt-10 border-t border-slate-300 pt-4 text-[10px] leading-4 text-slate-500">
        <p>Dokumen ini merupakan laporan keuangan untuk investor Nuzultrip Equity. Distribusi dibatasi sesuai hak akses dan status publikasi laporan.</p>
        <p className="mt-1">Versi {version.version_number} · Dibuat {version.created_at}{version.approved_at ? ` · Disetujui ${version.approved_at}` : ''}{version.published_at ? ` · Diterbitkan ${version.published_at}` : ''}</p>
      </footer>
    </main>
  )
}
