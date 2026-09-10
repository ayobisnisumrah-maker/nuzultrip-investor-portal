/* eslint-disable @next/next/no-img-element */

import { notFound } from 'next/navigation'

import { InvoicePrintControls } from '@/features/admin/financials/invoice-print-controls'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

const money = (currency: string) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })

function dateLabel(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function snapshotObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function snapshotText(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function snapshotBoolean(snapshot: Record<string, unknown>, key: string, fallback: boolean) {
  return typeof snapshot[key] === 'boolean' ? (snapshot[key] as boolean) : fallback
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft': return 'Draf'
    case 'issued': return 'Terbit'
    case 'partially_paid': return 'Dibayar sebagian'
    case 'paid': return 'Lunas'
    case 'void': return 'Dibatalkan'
    default: return status
  }
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pathname = `/print/invoices/${id}`
  const principal = await adminWithPermission('financial_reports.view', pathname)

  if (!principal) {
    return (
      <main className="mx-auto max-w-xl p-8 font-sans text-slate-950">
        <h1 className="text-xl font-semibold">Akses terbatas</h1>
        <p className="mt-2 text-sm text-slate-600">Anda tidak memiliki izin untuk melihat invoice ini.</p>
      </main>
    )
  }

  const supabase = await getServerSupabase()
  const [{ data: invoice, error: invoiceError }, { data: items, error: itemsError }, { data: settingsRows, error: settingsError }] = await Promise.all([
    supabase
      .from('finance_invoices')
      .select('id, reference, status, customer_name, customer_email, customer_phone, customer_address, issued_on, due_on, currency, subtotal, discount_total, tax_total, grand_total, paid_total, refunded_total, notes, terms_snapshot, company_snapshot, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('finance_invoice_items')
      .select('id, invoice_id, product_code_snapshot, name, description, quantity, unit_label, unit_price, discount_amount, tax_rate, line_subtotal, line_tax, line_total, position')
      .eq('invoice_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('finance_settings')
      .select('default_currency, company_legal_name, company_address, company_tax_id, company_email, company_phone, company_website, bank_details, payment_instructions, invoice_terms, invoice_footer, tax_invoice_enabled, logo_asset_id, stamp_asset_id, signature_asset_id, signer_name, signer_title, show_stamp, show_signature, show_print_metadata, show_draft_watermark')
      .eq('singleton', true)
      .limit(1),
  ])

  if (invoiceError || itemsError || settingsError || !invoice) notFound()

  const settings = settingsRows?.[0] ?? null
  const snapshot = snapshotObject(invoice.company_snapshot)
  const currency = invoice.currency ?? settings?.default_currency ?? 'IDR'
  const formatMoney = money(currency)

  const companyName = snapshotText(snapshot, 'legalName') ?? settings?.company_legal_name ?? 'Nuzultrip'
  const companyAddress = snapshotText(snapshot, 'address') ?? settings?.company_address ?? null
  const companyTaxId = snapshotText(snapshot, 'taxId') ?? settings?.company_tax_id ?? null
  const companyEmail = snapshotText(snapshot, 'email') ?? settings?.company_email ?? null
  const companyPhone = snapshotText(snapshot, 'phone') ?? settings?.company_phone ?? null
  const companyWebsite = snapshotText(snapshot, 'website') ?? settings?.company_website ?? null
  const bankDetails = snapshotText(snapshot, 'bankDetails') ?? settings?.bank_details ?? null
  const paymentInstructions = snapshotText(snapshot, 'paymentInstructions') ?? settings?.payment_instructions ?? null
  const invoiceFooter = snapshotText(snapshot, 'footer') ?? settings?.invoice_footer ?? null
  const signerName = snapshotText(snapshot, 'signerName') ?? settings?.signer_name ?? null
  const signerTitle = snapshotText(snapshot, 'signerTitle') ?? settings?.signer_title ?? null
  const taxInvoiceEnabled = snapshotBoolean(snapshot, 'taxInvoiceEnabled', Boolean(settings?.tax_invoice_enabled))
  const showStamp = snapshotBoolean(snapshot, 'showStamp', settings?.show_stamp ?? true)
  const showSignature = snapshotBoolean(snapshot, 'showSignature', settings?.show_signature ?? true)
  const showPrintMetadata = snapshotBoolean(snapshot, 'showPrintMetadata', settings?.show_print_metadata ?? true)
  const showDraftWatermark = snapshotBoolean(snapshot, 'showDraftWatermark', settings?.show_draft_watermark ?? true)

  const logoAssetId = snapshotText(snapshot, 'logoAssetId') ?? settings?.logo_asset_id ?? null
  const stampAssetId = snapshotText(snapshot, 'stampAssetId') ?? settings?.stamp_asset_id ?? null
  const signatureAssetId = snapshotText(snapshot, 'signatureAssetId') ?? settings?.signature_asset_id ?? null

  async function signedAssetUrl(assetId: string | null) {
    if (!assetId) return null
    const { data: asset } = await supabase
      .from('media_assets')
      .select('bucket, path')
      .eq('id', assetId)
      .maybeSingle()
    if (!asset) return null
    const { data } = await supabase.storage.from(asset.bucket).createSignedUrl(asset.path, 60 * 60)
    return data?.signedUrl ?? null
  }

  const [logoUrl, stampUrl, signatureUrl] = await Promise.all([
    signedAssetUrl(logoAssetId),
    signedAssetUrl(stampAssetId),
    signedAssetUrl(signatureAssetId),
  ])

  const netPaid = Math.max(0, Number(invoice.paid_total ?? 0) - Number(invoice.refunded_total ?? 0))
  const balance = Math.max(0, Number(invoice.grand_total ?? 0) - netPaid)
  const terms = invoice.terms_snapshot ?? settings?.invoice_terms ?? null
  const generatedAt = new Date().toISOString()

  return (
    <main className="min-h-screen bg-slate-100 py-10 font-sans text-slate-950 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          .invoice-sheet { width: auto !important; min-height: auto !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <article className="invoice-sheet relative mx-auto w-[210mm] min-h-[297mm] overflow-hidden border border-slate-200 bg-white px-[16mm] py-[14mm] shadow-xl print:w-auto print:min-h-0">
        {invoice.status === 'draft' && showDraftWatermark ? (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
            <span className="-rotate-[35deg] select-none text-[96px] font-black tracking-[0.18em] text-slate-100">DRAFT</span>
          </div>
        ) : null}

        <div className="relative z-10">
          <header className="avoid-break flex items-start justify-between gap-10 border-b-2 border-slate-950 pb-7">
            <div className="max-w-[58%]">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo invoice" className="mb-4 max-h-16 max-w-[220px] object-contain object-left" />
              ) : null}
              <h1 className="text-xl font-bold tracking-tight">{companyName}</h1>
              {companyAddress ? <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{companyAddress}</p> : null}
              <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                {companyEmail ? <p>{companyEmail}</p> : null}
                {companyPhone ? <p>{companyPhone}</p> : null}
                {companyWebsite ? <p>{companyWebsite}</p> : null}
                {companyTaxId ? <p>ID Pajak: {companyTaxId}</p> : null}
              </div>
            </div>

            <div className="min-w-[210px] text-right">
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-500">INVOICE</p>
              <p className="mt-1 text-2xl font-black tracking-tight">{invoice.reference}</p>
              <dl className="mt-5 grid grid-cols-[auto_auto] justify-end gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-slate-500">Tanggal</dt>
                <dd className="font-medium">{dateLabel(invoice.issued_on ?? invoice.created_at.slice(0, 10))}</dd>
                <dt className="text-slate-500">Jatuh tempo</dt>
                <dd className="font-medium">{dateLabel(invoice.due_on)}</dd>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-semibold">{statusLabel(invoice.status)}</dd>
              </dl>
            </div>
          </header>

          <section className="avoid-break grid grid-cols-2 gap-10 py-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ditagihkan kepada</p>
              <p className="mt-2 text-base font-bold">{invoice.customer_name}</p>
              {invoice.customer_email ? <p className="mt-1 text-xs text-slate-600">{invoice.customer_email}</p> : null}
              {invoice.customer_phone ? <p className="text-xs text-slate-600">{invoice.customer_phone}</p> : null}
              {invoice.customer_address ? <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{invoice.customer_address}</p> : null}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ringkasan tagihan</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{formatMoney.format(Number(invoice.grand_total ?? 0))}</p>
              <p className="mt-1 text-xs text-slate-500">Sisa pembayaran: {formatMoney.format(balance)}</p>
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
                {(items ?? []).map((item, index) => {
                  const qty = Number(item.quantity ?? 0)
                  const unitPrice = Number(item.unit_price ?? 0)
                  const discount = Number(item.discount_amount ?? 0)
                  const base = qty * unitPrice
                  const tax = Math.max(0, base - discount) * (Number(item.tax_rate ?? 0) / 100)
                  const lineTotal = item.line_total == null ? base - discount + tax : Number(item.line_total)
                  return (
                    <tr key={item.id} className="avoid-break border-b border-slate-200 align-top">
                      <td className="py-4 pr-2 text-slate-500">{index + 1}</td>
                      <td className="py-4 pr-3">
                        <p className="font-semibold">{item.name}</p>
                        {item.description ? <p className="mt-1 leading-5 text-slate-500">{item.description}</p> : null}
                        {item.product_code_snapshot ? <p className="mt-1 text-[10px] text-slate-400">Kode: {item.product_code_snapshot}</p> : null}
                        {Number(item.tax_rate ?? 0) > 0 ? <p className="mt-1 text-[10px] text-slate-400">Pajak {Number(item.tax_rate)}%</p> : null}
                      </td>
                      <td className="py-4 pr-3 text-right">{qty.toLocaleString('id-ID')} {item.unit_label}</td>
                      <td className="py-4 pr-3 text-right">{formatMoney.format(unitPrice)}</td>
                      <td className="py-4 pr-3 text-right">{formatMoney.format(discount)}</td>
                      <td className="py-4 text-right font-semibold">{formatMoney.format(lineTotal)}</td>
                    </tr>
                  )
                })}
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
              {paymentInstructions ? (
                <div className="mt-4">
                  <p className="font-semibold text-slate-900">Instruksi pembayaran</p>
                  <p className="mt-1 whitespace-pre-line">{paymentInstructions}</p>
                </div>
              ) : null}
              {bankDetails ? (
                <div className="mt-4">
                  <p className="font-semibold text-slate-900">Rekening pembayaran</p>
                  <p className="mt-1 whitespace-pre-line">{bankDetails}</p>
                </div>
              ) : null}
            </div>

            <div>
              <dl className="ml-auto w-full max-w-[300px] space-y-2 text-xs">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Subtotal</dt><dd>{formatMoney.format(Number(invoice.subtotal ?? 0))}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Diskon</dt><dd>-{formatMoney.format(Number(invoice.discount_total ?? 0))}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Pajak</dt><dd>{formatMoney.format(Number(invoice.tax_total ?? 0))}</dd></div>
                <div className="mt-3 flex justify-between gap-4 border-t-2 border-slate-950 pt-3 text-base font-black"><dt>Total</dt><dd>{formatMoney.format(Number(invoice.grand_total ?? 0))}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Dibayar bersih</dt><dd>{formatMoney.format(netPaid)}</dd></div>
                <div className="flex justify-between gap-4 font-semibold"><dt>Sisa</dt><dd>{formatMoney.format(balance)}</dd></div>
              </dl>
            </div>
          </section>

          {(terms || !taxInvoiceEnabled) ? (
            <section className="avoid-break mt-8 border-t border-slate-200 pt-5 text-[10px] leading-5 text-slate-500">
              {terms ? (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-slate-700">Syarat & ketentuan</p>
                  <p className="mt-1 whitespace-pre-line">{terms}</p>
                </div>
              ) : null}
              {!taxInvoiceEnabled ? (
                <p className={terms ? 'mt-3' : ''}>Dokumen ini merupakan invoice operasional dan bukan faktur pajak.</p>
              ) : null}
            </section>
          ) : null}

          {(showSignature && signatureUrl) || (showStamp && stampUrl) || signerName ? (
            <section className="avoid-break mt-8 flex justify-end">
              <div className="w-[260px] text-center text-xs">
                <p className="text-slate-500">Hormat kami,</p>
                <div className="relative mx-auto mt-2 flex h-24 items-center justify-center">
                  {showStamp && stampUrl ? <img src={stampUrl} alt="Stempel perusahaan" className="absolute left-2 h-20 w-20 object-contain opacity-90" /> : null}
                  {showSignature && signatureUrl ? <img src={signatureUrl} alt="Tanda tangan" className="relative z-10 max-h-20 max-w-[150px] object-contain" /> : null}
                </div>
                {signerName ? <p className="font-bold text-slate-900">{signerName}</p> : null}
                {signerTitle ? <p className="mt-0.5 text-slate-500">{signerTitle}</p> : null}
              </div>
            </section>
          ) : null}

          {invoiceFooter ? <p className="avoid-break mt-7 text-center text-[10px] leading-5 text-slate-500">{invoiceFooter}</p> : null}

          <InvoicePrintControls
            generatedAt={generatedAt}
            printedBy={`${principal.fullName} · ${principal.roleName}`}
            timeZone={principal.timezone}
            reference={invoice.reference}
            showMetadata={showPrintMetadata}
          />
        </div>
      </article>
    </main>
  )
}
