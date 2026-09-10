import { notFound } from 'next/navigation'
import { FinanceInvoiceActions } from '@/features/admin/financials/finance-invoice-actions'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})
type Company = {
  legalName?: string
  address?: string
  taxId?: string
  bankDetails?: string
  paymentInstructions?: string
  footer?: string
  logoAssetId?: string
  stampAssetId?: string
  signatureAssetId?: string
}
const paidStatusIcon = 'data:image/webp;base64,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'
const dpStatusIcon = 'data:image/webp;base64,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'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const principal = await adminWithPermission(
    'financial_reports.view',
    '/admin/financials/operations',
  )
  if (!principal)
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin melihat invoice.
      </Alert>
    )
  const { id } = await params
  const supabase = await getServerSupabase()
  const [invoiceResult, itemsResult, paymentsResult, refundsResult] = await Promise.all([
    supabase.from('finance_invoices').select('*').eq('id', id).maybeSingle(),
    supabase.from('finance_invoice_items').select('*').eq('invoice_id', id).order('position'),
    supabase
      .from('finance_payments')
      .select('id,reference,amount,method,status')
      .eq('invoice_id', id)
      .order('created_at'),
    supabase
      .from('finance_refunds')
      .select('id,reference,amount,reason,status')
      .eq('invoice_id', id)
      .order('created_at'),
  ])
  if (invoiceResult.error || itemsResult.error || paymentsResult.error || refundsResult.error)
    return (
      <Alert tone="danger" title="Invoice tidak dapat dimuat">
        Silakan coba lagi.
      </Alert>
    )
  if (!invoiceResult.data) notFound()
  const invoice = invoiceResult.data
  const company = invoice.company_snapshot as Company
  const firstItem = itemsResult.data?.[0]
  const documentTitle = `Bukti Pembayaran ${firstItem?.name || 'Pesanan'}`
  const paidNet = Number(invoice.paid_total) - Number(invoice.refunded_total)
  const outstanding = Math.max(Number(invoice.grand_total) - paidNet, 0)
  const isPaid = paidNet > 0 && outstanding === 0
  const paymentStatusText = isPaid
    ? 'Status pembayaran: LUNAS. Seluruh kewajiban pembayaran pada tagihan ini telah dibayar.'
    : 'Status pembayaran: DP. Dokumen ini bukan bukti pelunasan.'
  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow="Bukti Pembayaran"
        title={documentTitle}
        description={`${invoice.reference} · ${invoice.customer_name}`}
      />
      <FinanceInvoiceActions
        invoiceId={id}
        status={invoice.status}
        outstanding={outstanding}
        refundable={Math.max(paidNet, 0)}
        documentTitle={documentTitle}
        customerName={invoice.customer_name}
        issuedOn={invoice.issued_on}
      />
      <Card className="invoice-document">
        <CardBody>
          <div className="grid gap-8">
            <div className="flex flex-wrap items-start justify-between gap-6 invoice-header">
              <div>
                {company.logoAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/admin/finance/assets/${company.logoAssetId}`}
                    alt="Logo perusahaan"
                    className="mb-4 h-16 max-w-56 object-contain object-left"
                  />
                ) : null}
                <p className="text-heading-md font-semibold">{company.legalName || 'Nuzultrip'}</p>
                <p className="invoice-title text-heading-md text-fg mt-1 font-semibold">{documentTitle}</p>
                <p className="text-body-sm text-fg-muted mt-1">Nomor: {invoice.reference}</p>
                <p className="text-body-sm text-fg-muted whitespace-pre-line">{company.address}</p>
                {company.taxId ? (
                  <p className="text-caption text-fg-subtle">Identitas pajak: {company.taxId}</p>
                ) : null}
              </div>
              <div className="invoice-meta flex items-start gap-4 text-right text-body-sm">
                <div>
                  <p>Tanggal: {invoice.issued_on ?? 'Draf'}</p>
                  <p>Jatuh tempo: {invoice.due_on ?? '—'}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isPaid ? paidStatusIcon : dpStatusIcon}
                  alt={isPaid ? 'Pembayaran lunas' : 'Pembayaran uang muka'}
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>
            <p className="invoice-payment-status rounded-lg border border-border bg-sunken px-4 py-3 text-body-sm font-medium">
              {paymentStatusText}
            </p>
            <div className="invoice-customer border-border rounded-lg border p-4">
              <p className="text-body-sm font-semibold mb-3">Informasi pemesan</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-caption text-fg-subtle">Nama pemesan</p><p className="text-body-sm">{invoice.customer_name}</p></div>
                <div><p className="text-caption text-fg-subtle">Alamat email</p><p className="text-body-sm">{invoice.customer_email || '—'}</p></div>
                <div><p className="text-caption text-fg-subtle">Nomor ponsel</p><p className="text-body-sm">{invoice.customer_phone || '—'}</p></div>
              </div>
            </div>
            <h2 className="invoice-section-title font-semibold">Detail pembayaran</h2>
            <div className="overflow-x-auto">
              <table className="text-body-sm w-full text-left">
                <thead>
                  <tr className="border-border border-b">
                    <th className="py-3">Produk</th>
                    <th>Deskripsi</th>
                    <th>Jumlah</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(itemsResult.data ?? []).map((item) => (
                    <tr key={item.id} className="border-border border-b">
                      <td className="py-3">{item.name}<span className="text-caption text-fg-subtle block">{item.product_code_snapshot}</span></td>
                      <td>{item.description || '—'}</td>
                      <td>
                        {Number(item.quantity)} {item.unit_label}
                      </td>
                      <td className="text-right font-medium">
                        {rupiah.format(Number(item.line_total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-body-sm ml-auto grid w-full max-w-sm gap-2">
              <Total label="Subtotal" value={Number(invoice.subtotal)} />
              <Total label="Diskon" value={-Number(invoice.discount_total)} />
              {Number(invoice.tax_total) > 0 ? (
                <Total label="Pajak" value={Number(invoice.tax_total)} />
              ) : null}
              <Total label="Total" value={Number(invoice.grand_total)} strong />
              <Total label="Dibayar bersih" value={paidNet} />
              <Total label="Sisa" value={outstanding} />
            </div>
            {paymentsResult.data?.length ? (
              <section>
                <h2 className="font-semibold">Waktu dan metode pembayaran</h2>
                {paymentsResult.data.map((x) => (
                  <p key={x.id} className="text-body-sm mt-2">
                    {x.reference} · {x.method} · {rupiah.format(Number(x.amount))} · {x.status}
                  </p>
                ))}
              </section>
            ) : null}
            {refundsResult.data?.length ? (
              <section>
                <h2 className="font-semibold">Riwayat refund</h2>
                {refundsResult.data.map((x) => (
                  <p key={x.id} className="text-body-sm mt-2">
                    {x.reference} · {rupiah.format(Number(x.amount))} · {x.reason}
                  </p>
                ))}
              </section>
            ) : null}
            {company.bankDetails || company.paymentInstructions ? (
              <section className="bg-sunken text-body-sm rounded-lg p-4 whitespace-pre-line">
                <h2 className="font-semibold">Pembayaran</h2>
                {company.bankDetails}
                <br />
                {company.paymentInstructions}
              </section>
            ) : null}
            {invoice.terms_snapshot ? (
              <section className="text-body-sm whitespace-pre-line">
                <h2 className="font-semibold">Syarat dan ketentuan</h2>
                <p className="mt-2">{invoice.terms_snapshot}</p>
              </section>
            ) : null}
            {company.stampAssetId || company.signatureAssetId ? (
              <section className="ml-auto grid w-full max-w-sm grid-cols-2 gap-6 text-center">
                {company.signatureAssetId ? (
                  <InvoiceMark assetId={company.signatureAssetId} label="Tanda tangan" />
                ) : <span />}
                {company.stampAssetId ? (
                  <InvoiceMark assetId={company.stampAssetId} label="Stempel perusahaan" />
                ) : null}
              </section>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </Stack>
  )
}
function InvoiceMark({ assetId, label }: { assetId: string; label: string }) {
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/admin/finance/assets/${assetId}`}
        alt={label}
        className="mx-auto h-24 max-w-40 object-contain"
      />
      <p className="text-caption text-fg-subtle mt-2">{label}</p>
    </div>
  )
}
function Total({
  label,
  value,
  strong = false,
}: {
  label: string
  value: number
  strong?: boolean
}) {
  return (
    <div
      className={`flex justify-between ${strong ? 'border-border border-t pt-2 font-semibold' : ''}`}
    >
      <span>{label}</span>
      <span>{rupiah.format(value)}</span>
    </div>
  )
}
