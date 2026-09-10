/* eslint-disable @next/next/no-img-element */

import { notFound } from 'next/navigation'

import { InvoicePrintControls } from '@/features/admin/financials/invoice-print-controls'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

type CompanySnapshot = {
  legalName?: string | null
  address?: string | null
  taxId?: string | null
  bankDetails?: string | null
  paymentInstructions?: string | null
  footer?: string | null
  logoAssetId?: string | null
  stampAssetId?: string | null
  signatureAssetId?: string | null
}

function asCompanySnapshot(value: unknown): CompanySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as CompanySnapshot
}

function formatMoney(currency: string, value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function statusLabel(status: string) {
  if (status === 'draft') return 'Draf'
  if (status === 'issued') return 'Terbit'
  if (status === 'partially_paid') return 'Dibayar sebagian'
  if (status === 'paid') return 'Lunas'
  if (status === 'void') return 'Dibatalkan'
  return status
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('financial_reports.view', `/print/invoices/${id}`)

  if (!principal) {
    return (
      <main className="mx-auto max-w-xl p-8 text-slate-950">
        <h1 className="text-xl font-semibold">Akses terbatas</h1>
        <p className="mt-2 text-sm text-slate-600">Anda tidak memiliki izin untuk melihat invoice ini.</p>
      </main>
    )
  }

  const supabase = await getServerSupabase()
  const [invoiceResult, itemsResult] = await Promise.all([
    supabase.from('finance_invoices').select('*').eq('id', id).maybeSingle(),
    supabase.from('finance_invoice_items').select('*').eq('invoice_id', id).order('position'),
  ])

  if (invoiceResult.error || itemsResult.error || !invoiceResult.data) notFound()

  const invoice = invoiceResult.data
  const items = itemsResult.data ?? []
  const company = asCompanySnapshot(invoice.company_snapshot)
  const currency = invoice.currency || 'IDR'
  const paidNet = Math.max(Number(invoice.paid_total) - Number(invoice.refunded_total), 0)
  const outstanding = Math.max(Number(invoice.grand_total) - paidNet, 0)
  const generatedAt = new Date().toISOString()

  return (
    <main className="min-h-screen bg-slate-100 py-8 font-sans text-slate-950 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          .invoice-sheet {
            width: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <article className="invoice-sheet relative mx-auto min-h-[297mm] w-[210mm] overflow-hidden border border-slate-200 bg-white px-[16mm] py-[14mm] shadow-xl print:min-h-0 print:w-auto">
        {invoice.status === 'draft' ? (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
            <span className="-rotate-[35deg] select-none text-[92px] font-black tracking-[0.18em] text-slate-100">
              DRAFT
            </span>
          </div>
        ) : null}

        <div className="relative z-10">
          <header className="avoid-break flex items-start justify-between gap-10 border-b-2 border-slate-950 pb-6">
            <div className="max-w-[58%]">
              {company.logoAssetId ? (
                <img
                  src={`/api/admin/finance/assets/${company.logoAssetId}`}
                  alt="Logo perusahaan"
                  className="mb-4 max-h-16 max-w-[220px] object-contain object-left"
                />
              ) : null}
              <h1 className="text-xl font-bold tracking-tight">{company.legalName || 'Nuzultrip'}</h1>
              {company.address ? (
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{company.address}</p>
              ) : null}
              {company.taxId ? <p className="mt-1 text-xs text-slate-500">Identitas pajak: {company.taxId}</p> : null}
            </div>

            <div className="min-w-[220px] text-right">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500">INVOICE</p>
              <p className="mt-1 break-all text-2xl font-black tracking-tight">{invoice.reference}</p>
              <dl className="mt-5 grid grid-cols-[auto_auto] justify-end gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-slate-500">Tanggal</dt>
                <dd className="font-medium">{formatDate(invoice.issued_on ?? invoice.created_at.slice(0, 10))}</dd>
                <dt className="text-slate-500">Jatuh tempo</dt>
                <dd className="font-medium">{formatDate(invoice.due_on)}</dd>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-semibold">{statusLabel(invoice.status)}</dd>
              </dl>
            </div>
          </header>

          <section className="avoid-break grid grid-cols-2 gap-10 py-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ditagihkan kepada</p>
              <p className="mt-2 text-base font-bold">{invoice.customer_name}</p>
              {invoice.customer_email ? <p className="mt-1 text-xs text-slate-600">{invoice.customer_email}</p> : null}
              {invoice.customer_phone ? <p className="text-xs text-slate-600">{invoice.customer_phone}</p> : null}
              {invoice.customer_address ? (
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{invoice.customer_address}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total tagihan</p>
              <p className="mt-2 text-3xl font-black tracking-tight">
                {formatMoney(currency, Number(invoice.grand_total))}
              </p>
              <p className="mt-1 text-xs text-slate-500">Sisa pembayaran: {formatMoney(currency, outstanding)}</p>
            </div>
          </section>

          <section>
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr className="border-y border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="w-[5%] py-3 pr-2">No.</th>
                  <th className="w-[35%] py-3 pr-3">Deskripsi</th>
                  <th className="w-[10%] py-3 pr-3 text-right">Qty</th>
                  <th className="w-[17%] py-3 pr-3 text-right">Harga</th>
                  <th className="w-[13%] py-3 pr-3 text-right">Diskon</th>
                  <th className="w-[20%] py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="avoid-break border-b border-slate-200 align-top">
                    <td className="py-4 pr-2 text-slate-500">{index + 1}</td>
                    <td className="py-4 pr-3">
                      <p className="font-semibold">{item.name}</p>
                      {item.description ? <p className="mt-1 leading-5 text-slate-500">{item.description}</p> : null}
                      {item.product_code_snapshot ? (
                        <p className="mt-1 text-[10px] text-slate-400">Kode: {item.product_code_snapshot}</p>
                      ) : null}
                      {Number(item.tax_rate) > 0 ? (
                        <p className="mt-1 text-[10px] text-slate-400">Pajak {Number(item.tax_rate)}%</p>
                      ) : null}
                    </td>
                    <td className="py-4 pr-3 text-right">
                      {Number(item.quantity).toLocaleString('id-ID')} {item.unit_label}
                    </td>
                    <td className="py-4 pr-3 text-right">{formatMoney(currency, Number(item.unit_price))}</td>
                    <td className="py-4 pr-3 text-right">{formatMoney(currency, Number(item.discount_amount))}</td>
                    <td className="py-4 text-right font-semibold">{formatMoney(currency, Number(item.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="avoid-break mt-6 grid grid-cols-2 gap-10">
            <div className="text-xs leading-5 text-slate-600">
              {invoice.notes ? (
                <div>
                  <p className="font-semibold text-slate-900">Catatan</p>
                  <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
                </div>
              ) : null}
              {company.paymentInstructions ? (
                <div className="mt-4">
                  <p className="font-semibold text-slate-900">Instruksi pembayaran</p>
                  <p className="mt-1 whitespace-pre-line">{company.paymentInstructions}</p>
                </div>
              ) : null}
              {company.bankDetails ? (
                <div className="mt-4">
                  <p className="font-semibold text-slate-900">Rekening pembayaran</p>
                  <p className="mt-1 whitespace-pre-line">{company.bankDetails}</p>
                </div>
              ) : null}
            </div>

            <dl className="ml-auto w-full max-w-[300px] space-y-2 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Subtotal</dt><dd>{formatMoney(currency, Number(invoice.subtotal))}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Diskon</dt><dd>-{formatMoney(currency, Number(invoice.discount_total))}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Pajak</dt><dd>{formatMoney(currency, Number(invoice.tax_total))}</dd></div>
              <div className="mt-3 flex justify-between gap-4 border-t-2 border-slate-950 pt-3 text-base font-black"><dt>Total</dt><dd>{formatMoney(currency, Number(invoice.grand_total))}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Dibayar bersih</dt><dd>{formatMoney(currency, paidNet)}</dd></div>
              <div className="flex justify-between gap-4 font-semibold"><dt>Sisa</dt><dd>{formatMoney(currency, outstanding)}</dd></div>
            </dl>
          </section>

          {invoice.terms_snapshot ? (
            <section className="avoid-break mt-7 border-t border-slate-200 pt-4 text-[10px] leading-5 text-slate-500">
              <p className="font-semibold uppercase tracking-wide text-slate-700">Syarat &amp; ketentuan</p>
              <p className="mt-1 whitespace-pre-line">{invoice.terms_snapshot}</p>
            </section>
          ) : null}

          <section className="avoid-break mt-7 grid grid-cols-2 gap-8">
            <p className="self-end text-[10px] leading-5 text-slate-500">
              Dokumen ini merupakan invoice operasional dan bukan faktur pajak.
            </p>
            {company.signatureAssetId || company.stampAssetId ? (
              <div className="ml-auto w-[250px] text-center">
                <p className="text-xs text-slate-500">Hormat kami,</p>
                <div className="relative mx-auto mt-2 flex h-24 items-center justify-center">
                  {company.stampAssetId ? (
                    <img
                      src={`/api/admin/finance/assets/${company.stampAssetId}`}
                      alt="Stempel perusahaan"
                      className="absolute left-2 h-20 w-20 object-contain opacity-90"
                    />
                  ) : null}
                  {company.signatureAssetId ? (
                    <img
                      src={`/api/admin/finance/assets/${company.signatureAssetId}`}
                      alt="Tanda tangan"
                      className="relative z-10 max-h-20 max-w-[150px] object-contain"
                    />
                  ) : null}
                </div>
                <div className="mx-auto mt-1 w-44 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
                  Tanda tangan &amp; stempel
                </div>
              </div>
            ) : null}
          </section>

          {company.footer ? (
            <p className="avoid-break mt-6 text-center text-[10px] leading-5 text-slate-500">{company.footer}</p>
          ) : null}

          <InvoicePrintControls
            generatedAt={generatedAt}
            printedBy={`${principal.fullName} · ${principal.roleName}`}
            timeZone={principal.timezone}
            reference={invoice.reference}
          />
        </div>
      </article>
    </main>
  )
}
