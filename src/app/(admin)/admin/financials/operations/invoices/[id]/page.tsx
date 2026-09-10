import { notFound } from 'next/navigation'

import { FinanceInvoiceActions } from '@/features/admin/financials/finance-invoice-actions'
import { PaymentReceipt, type PaymentReceiptData } from '@/features/admin/financials/PaymentReceipt'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { PageHeader, Stack } from '@/ui/layout'

type Company = {
  legalName?: string
  address?: string
  footer?: string
  logoAssetId?: string
  stampAssetId?: string
  signatureAssetId?: string
  signerName?: string
  signerPosition?: string
}

function productType(name: string): string {
  const normalized = name.toLocaleLowerCase('id-ID')
  if (normalized.includes('halal tour')) return 'Halal Tour'
  if (normalized.includes('umrah') || normalized.includes('umroh')) return 'Paket Umrah'
  if (normalized.includes('haji')) return 'Paket Haji'
  if (normalized.includes('pesawat') || normalized.includes('tiket')) return 'Tiket Pesawat'
  return 'Paket Perjalanan'
}

function formatPaymentDatetime(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(parsed)
}

function formatInvoiceDate(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  }).format(parsed)
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
      .select('id,reference,amount,method,status,created_at')
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
  const company = (invoice.company_snapshot ?? {}) as Company
  const items = itemsResult.data ?? []
  const firstItem = items[0]
  const packageName = firstItem?.name || 'Pesanan'
  const documentTitle = `Bukti Pembayaran ${packageName}`
  const paidNet = Math.max(Number(invoice.paid_total) - Number(invoice.refunded_total), 0)
  const outstanding = Math.max(Number(invoice.grand_total) - paidNet, 0)
  const isPaid = paidNet > 0 && outstanding === 0
  const lastPayment = paymentsResult.data?.at(-1)
  const itemTotal = items.reduce((total, item) => total + Number(item.line_total), 0)
  const assetUrl = (assetId?: string) => (assetId ? `/api/admin/finance/assets/${assetId}` : null)

  const receipt: PaymentReceiptData = {
    orderId: invoice.reference,
    customerName: invoice.customer_name,
    customerEmail: invoice.customer_email ?? '',
    customerPhone: invoice.customer_phone ?? '',
    productType: productType(packageName),
    packageName,
    packageCode: firstItem?.product_code_snapshot,
    packageDescription: firstItem?.description,
    pax: items.reduce((total, item) => total + Number(item.quantity), 0),
    packageTotal: itemTotal,
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount_total),
    tax: Number(invoice.tax_total),
    invoiceTotal: Number(invoice.grand_total),
    amountPaid: paidNet,
    balanceDue: outstanding,
    paymentDatetime: formatPaymentDatetime(lastPayment?.created_at),
    paymentMethod: lastPayment?.method,
    dueDate: formatInvoiceDate(invoice.due_on),
    companyName: company.legalName,
    companyAddress: company.address ?? '',
    companyContact: company.footer,
    companyLogoUrl: assetUrl(company.logoAssetId),
    signerName: company.signerName,
    signerPosition: company.signerPosition,
    signatureUrl: assetUrl(company.signatureAssetId),
    stampUrl: assetUrl(company.stampAssetId),
    status: isPaid ? 'PAID' : 'DP',
  }

  return (
    <Stack gap={6} className="print:gap-0">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Bukti Pembayaran"
          title={documentTitle}
          description={`${invoice.reference} · ${invoice.customer_name}`}
        />
      </div>

      <FinanceInvoiceActions
        invoiceId={id}
        status={invoice.status}
        outstanding={outstanding}
        refundable={paidNet}
        documentTitle={documentTitle}
        customerName={invoice.customer_name}
        issuedOn={invoice.issued_on}
        currentDueOn={invoice.due_on}
      />

      <PaymentReceipt data={receipt} />
    </Stack>
  )
}
