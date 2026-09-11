import { notFound } from 'next/navigation'

import { parseRefundPolicy, refundPolicyLines } from '@/core/financials/refund-policy'
import { PaymentReceipt, type PaymentReceiptData } from '@/features/admin/financials/PaymentReceipt'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'

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

type ExtendedInvoice = {
  departure_on?: string | null
  terms_body_snapshot?: string | null
  terms_letterhead_asset_id?: string | null
  refund_policy_snapshot?: unknown
}

type FinancePolicySettings = {
  invoice_terms?: string | null
  invoice_terms_body?: string | null
  terms_letterhead_asset_id?: string | null
  refund_processing_days?: number | null
  refund_day_basis?: string | null
  refund_tiers?: unknown
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

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('financial_reports.view', `/print/invoices/${id}`)

  if (!principal) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <Alert tone="info" title="Akses terbatas">
          Anda tidak memiliki izin melihat invoice ini.
        </Alert>
      </main>
    )
  }

  const supabase = await getServerSupabase()
  const [invoiceResult, itemsResult, paymentsResult, settingsResult] = await Promise.all([
    supabase.from('finance_invoices').select('*').eq('id', id).maybeSingle(),
    supabase.from('finance_invoice_items').select('*').eq('invoice_id', id).order('position'),
    supabase
      .from('finance_payments')
      .select('id,reference,amount,method,status,created_at')
      .eq('invoice_id', id)
      .order('created_at'),
    supabase
      .from('finance_settings')
      .select(
        'invoice_terms,invoice_terms_body,terms_letterhead_asset_id,refund_processing_days,refund_day_basis,refund_tiers',
      )
      .eq('singleton', true)
      .maybeSingle(),
  ])

  if (invoiceResult.error || itemsResult.error || paymentsResult.error) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <Alert tone="danger" title="Invoice tidak dapat dimuat">
          Silakan coba lagi.
        </Alert>
      </main>
    )
  }

  if (!invoiceResult.data) notFound()

  const invoice = invoiceResult.data
  const isDraft = invoice.status === 'draft'

  if (isDraft && (settingsResult.error || !settingsResult.data)) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <Alert tone="danger" title="Preview invoice tidak lengkap">
          Pengaturan Syarat &amp; Ketentuan tidak dapat dimuat. Silakan coba lagi sebelum menerbitkan
          invoice.
        </Alert>
      </main>
    )
  }

  const extended = invoice as typeof invoice & ExtendedInvoice
  const company = (invoice.company_snapshot ?? {}) as Company
  const settings = (settingsResult.data ?? null) as FinancePolicySettings | null
  const items = itemsResult.data ?? []
  const firstItem = items[0]
  const packageName = firstItem?.name || 'Pesanan'
  const paidNet = Math.max(Number(invoice.paid_total) - Number(invoice.refunded_total), 0)
  const outstanding = Math.max(Number(invoice.grand_total) - paidNet, 0)
  const isPaid = paidNet > 0 && outstanding === 0
  const lastPayment = paymentsResult.data?.at(-1)
  const itemTotal = items.reduce((total, item) => total + Number(item.line_total), 0)
  const assetUrl = (assetId?: string | null) =>
    assetId ? `/api/admin/finance/assets/${assetId}` : null

  const policySource = isDraft
    ? {
        processingDays: settings?.refund_processing_days ?? 90,
        dayBasis: settings?.refund_day_basis ?? 'business_days',
        tiers: settings?.refund_tiers ?? [],
      }
    : extended.refund_policy_snapshot
  const policy = parseRefundPolicy(policySource)
  const termsLink = isDraft ? (settings?.invoice_terms ?? null) : invoice.terms_snapshot
  const termsBody = isDraft ? (settings?.invoice_terms_body ?? null) : extended.terms_body_snapshot
  const termsLetterheadAssetId = isDraft
    ? (settings?.terms_letterhead_asset_id ?? null)
    : extended.terms_letterhead_asset_id

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
    departureDate: formatInvoiceDate(extended.departure_on),
    termsLink,
    termsBody,
    termsLetterheadUrl: assetUrl(termsLetterheadAssetId),
    refundPolicyLines: refundPolicyLines(policy),
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
    <main className="min-h-screen bg-white print:min-h-0">
      <PaymentReceipt data={receipt} />
    </main>
  )
}
