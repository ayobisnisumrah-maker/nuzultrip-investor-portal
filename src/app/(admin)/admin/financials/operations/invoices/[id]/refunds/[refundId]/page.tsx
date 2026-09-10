import { notFound } from 'next/navigation'

import {
  addProcessingDays,
  daysBeforeDeparture,
  formatPolicyDate,
  matchingRefundTier,
  parseRefundPolicy,
} from '@/core/financials/refund-policy'
import { RefundRequestActions } from '@/features/admin/financials/refund-request-actions'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { PageHeader, Stack } from '@/ui/layout'

type Company = {
  legalName?: string
  address?: string
  footer?: string
  logoAssetId?: string
}

type ExtendedInvoice = {
  departure_on?: string | null
  refund_policy_snapshot?: unknown
}

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Makassar',
  }).format(parsed)
}

function formatDatetime(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(parsed)
}

export default async function RefundRequestPage({
  params,
}: {
  params: Promise<{ id: string; refundId: string }>
}) {
  const principal = await adminWithPermission(
    'financial_reports.view',
    '/admin/financials/operations',
  )

  if (!principal)
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin melihat pengajuan refund.
      </Alert>
    )

  const { id, refundId } = await params
  const supabase = await getServerSupabase()
  const [refundResult, invoiceResult, itemsResult, paymentsResult] = await Promise.all([
    supabase
      .from('finance_refunds')
      .select(
        'id,invoice_id,reference,status,amount,reason,notes,requested_at,approved_at,processed_at',
      )
      .eq('id', refundId)
      .eq('invoice_id', id)
      .maybeSingle(),
    supabase.from('finance_invoices').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('finance_invoice_items')
      .select('id,name,product_code_snapshot,description,quantity,unit_label,line_total')
      .eq('invoice_id', id)
      .order('position'),
    supabase
      .from('finance_payments')
      .select('id,reference,amount,method,status,received_at,external_reference')
      .eq('invoice_id', id)
      .eq('status', 'confirmed')
      .order('received_at'),
  ])

  if (refundResult.error || invoiceResult.error || itemsResult.error || paymentsResult.error)
    return (
      <Alert tone="danger" title="Form refund tidak dapat dimuat">
        Data kasir untuk pengajuan refund tidak dapat dimuat. Silakan coba lagi.
      </Alert>
    )

  if (!refundResult.data || !invoiceResult.data) notFound()

  const refund = refundResult.data
  const invoice = invoiceResult.data
  const extended = invoice as typeof invoice & ExtendedInvoice
  const company = (invoice.company_snapshot ?? {}) as Company
  const items = itemsResult.data ?? []
  const payments = paymentsResult.data ?? []
  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const currentRefunded = Number(invoice.refunded_total)
  const netPaid = Math.max(paidTotal - currentRefunded, 0)
  const firstPayment = payments[0]
  const lastPayment = payments.at(-1)
  const logoUrl = company.logoAssetId
    ? `/api/admin/finance/assets/${company.logoAssetId}`
    : null
  const policy = parseRefundPolicy(extended.refund_policy_snapshot)
  const requestedAt = new Date(refund.requested_at)
  const processingDue = formatPolicyDate(addProcessingDays(requestedAt, policy))
  const distance = extended.departure_on
    ? daysBeforeDeparture(requestedAt, extended.departure_on)
    : null
  const tier = distance === null ? null : matchingRefundTier(policy, distance)
  const policyBasis = tier
    ? `${distance} hari sebelum keberangkatan · maksimal ${tier.refundPercent}%`
    : policy.tiers.length
      ? 'Tier tidak dapat ditentukan'
      : 'Tidak ada tier persentase pada snapshot invoice'

  return (
    <Stack gap={6} className="print:gap-0">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Pengajuan Refund"
          title={refund.reference}
          description={`${invoice.reference} · ${invoice.customer_name}`}
        />
      </div>

      <RefundRequestActions
        refundId={refund.id}
        invoiceId={invoice.id}
        reference={refund.reference}
        customerName={invoice.customer_name}
        status={refund.status}
      />

      <article className="bg-white text-black mx-auto w-full max-w-[210mm] min-h-[297mm] border border-black/15 p-[16mm] shadow-sm print:max-w-none print:min-h-0 print:border-0 print:p-[12mm] print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b border-black pb-6">
          <div className="min-w-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo perusahaan"
                className="mb-4 h-14 max-w-48 object-contain object-left"
              />
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight">FORM PENGAJUAN REFUND</h1>
            <p className="mt-1 text-sm">{refund.reference}</p>
          </div>
          <div className="text-right text-sm leading-6">
            <p className="font-semibold">
              {company.legalName || 'PT Swarna Dipa Wisata (Nuzultrip)'}
            </p>
            <p className="max-w-72 whitespace-pre-line">{company.address || '—'}</p>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
          <Data label="Nomor invoice" value={invoice.reference} />
          <Data label="Status pengajuan" value={refund.status.toUpperCase()} />
          <Data label="Tanggal pengajuan" value={formatDatetime(refund.requested_at)} />
          <Data label="Tanggal invoice" value={formatDate(invoice.issued_on)} />
          <Data label="Batas pelunasan" value={formatDate(invoice.due_on)} />
          <Data label="Tanggal keberangkatan" value={formatDate(extended.departure_on)} />
          <Data label="Batas maksimal proses refund" value={processingDue} />
          <Data label="Dasar kebijakan refund" value={policyBasis} />
          <Data label="Mata uang" value={invoice.currency} />
        </section>

        <section className="mt-8">
          <h2 className="border-b border-black pb-2 text-base font-bold">
            Data Jamaah / Pelanggan
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
            <Data label="Nama" value={invoice.customer_name} />
            <Data label="Telepon" value={invoice.customer_phone || '—'} />
            <Data label="Email" value={invoice.customer_email || '—'} />
            <Data label="Alamat" value={invoice.customer_address || '—'} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="border-b border-black pb-2 text-base font-bold">
            Data Paket / Transaksi
          </h2>
          <div className="mt-4 overflow-hidden border border-black">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black">
                  <th className="p-2">Paket</th>
                  <th className="p-2">Kode</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-black/20 last:border-0">
                    <td className="p-2">
                      <span className="font-medium">{item.name}</span>
                      {item.description ? (
                        <span className="block text-xs">{item.description}</span>
                      ) : null}
                    </td>
                    <td className="p-2">{item.product_code_snapshot || '—'}</td>
                    <td className="p-2">
                      {Number(item.quantity)} {item.unit_label}
                    </td>
                    <td className="p-2 text-right">{rupiah.format(Number(item.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div>
            <h2 className="border-b border-black pb-2 text-base font-bold">
              Ringkasan Pembayaran Kasir
            </h2>
            <div className="mt-4 grid gap-3">
              <Data label="Total invoice" value={rupiah.format(Number(invoice.grand_total))} />
              <Data label="Total pembayaran terkonfirmasi" value={rupiah.format(paidTotal)} />
              <Data label="Refund yang sudah diproses" value={rupiah.format(currentRefunded)} />
              <Data label="Pembayaran neto" value={rupiah.format(netPaid)} />
              <Data label="Metode pembayaran terakhir" value={lastPayment?.method || '—'} />
              <Data
                label="Referensi pembayaran"
                value={lastPayment?.external_reference || lastPayment?.reference || '—'}
              />
              <Data label="Pembayaran pertama" value={formatDatetime(firstPayment?.received_at)} />
              <Data label="Pembayaran terakhir" value={formatDatetime(lastPayment?.received_at)} />
            </div>
          </div>
          <div>
            <h2 className="border-b border-black pb-2 text-base font-bold">Pengajuan Refund</h2>
            <div className="mt-4 grid gap-3">
              <Data label="Nominal diajukan" value={rupiah.format(Number(refund.amount))} />
              <Data label="Alasan" value={refund.reason} />
              <Data label="Catatan" value={refund.notes || '—'} />
              <Data label="Disetujui" value={formatDatetime(refund.approved_at)} />
              <Data label="Diproses" value={formatDatetime(refund.processed_at)} />
            </div>
          </div>
        </section>

        <section className="mt-12 grid grid-cols-2 gap-16 text-center text-sm">
          <div>
            <p>Pemohon / Jamaah</p>
            <div className="h-20" />
            <div className="border-t border-black pt-2">{invoice.customer_name}</div>
          </div>
          <div>
            <p>Petugas / Kasir</p>
            <div className="h-20" />
            <div className="border-t border-black pt-2">Nama & tanda tangan</div>
          </div>
        </section>

        <footer className="mt-12 border-t border-black pt-4 text-xs leading-5">
          <p>
            Form ini dibuat dari data transaksi kasir dan kebijakan yang menjadi snapshot pada
            invoice. Pengajuan requested/approved belum mengurangi laporan keuangan; nilai refund
            masuk ke laporan setelah status processed.
          </p>
          {company.footer ? <p className="mt-2 whitespace-pre-line">{company.footer}</p> : null}
        </footer>
      </article>
    </Stack>
  )
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-black/60">{label}</p>
      <p className="mt-0.5 whitespace-pre-line font-medium">{value}</p>
    </div>
  )
}
