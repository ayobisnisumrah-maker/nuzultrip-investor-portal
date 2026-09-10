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
              <div className="text-body-sm text-right invoice-meta">
                <p>Tanggal: {invoice.issued_on ?? 'Draf'}</p>
                <p>Jatuh tempo: {invoice.due_on ?? '—'}</p>
              </div>
            </div>
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
