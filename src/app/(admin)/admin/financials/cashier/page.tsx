import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

const money = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export default async function CashierPage() {
  const principal = await adminWithPermission('financial_periods.view', '/admin/financials/cashier')

  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat modul kasir dan keuangan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const [
    invoicesResult,
    paymentsResult,
    refundsResult,
    expensesResult,
    productsResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from('finance_invoices')
      .select('id, reference, status, customer_name, grand_total, paid_total, refunded_total, issued_on, due_on, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('finance_payments').select('amount, status, received_at'),
    supabase.from('finance_refunds').select('amount, status, requested_at'),
    supabase.from('finance_expenses').select('total_amount, status, expense_on'),
    supabase.from('finance_products').select('id, active', { count: 'exact' }),
    supabase.from('finance_settings').select('id, invoice_prefix, default_currency, invoice_terms').limit(1),
  ])

  const criticalError =
    invoicesResult.error ||
    paymentsResult.error ||
    refundsResult.error ||
    expensesResult.error ||
    productsResult.error ||
    settingsResult.error

  if (criticalError) {
    return (
      <Stack gap={6}>
        <PageHeader
          eyebrow="Keuangan / Kasir"
          title="Kasir & Transaksi"
          description="Pusat pencatatan penjualan, pembayaran, refund, produk, dan pengeluaran yang menjadi sumber data laporan keuangan."
        />
        <Alert tone="danger" title="Kasir tidak dapat dimuat">
          Sistem gagal mengambil sebagian data transaksi keuangan. Silakan coba lagi.
        </Alert>
      </Stack>
    )
  }

  const invoices = invoicesResult.data ?? []
  const payments = paymentsResult.data ?? []
  const refunds = refundsResult.data ?? []
  const expenses = expensesResult.data ?? []
  const products = productsResult.data ?? []
  const settings = settingsResult.data?.[0]

  const issuedSales = invoices
    .filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'cancelled')
    .reduce((sum, invoice) => sum + Number(invoice.grand_total ?? 0), 0)
  const received = payments
    .filter((payment) => payment.status === 'posted' || payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const refunded = refunds
    .filter((refund) => refund.status !== 'rejected' && refund.status !== 'cancelled')
    .reduce((sum, refund) => sum + Number(refund.amount ?? 0), 0)
  const expenseTotal = expenses
    .filter((expense) => expense.status !== 'void' && expense.status !== 'cancelled')
    .reduce((sum, expense) => sum + Number(expense.total_amount ?? 0), 0)
  const outstanding = invoices.reduce(
    (sum, invoice) =>
      sum +
      Math.max(
        0,
        Number(invoice.grand_total ?? 0) -
          Number(invoice.paid_total ?? 0) +
          Number(invoice.refunded_total ?? 0),
      ),
    0,
  )

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan / Kasir"
        title="Kasir & Transaksi"
        description="Semua transaksi operasional dicatat di satu tempat agar invoice, penerimaan kas, refund, pengeluaran, KPI, dan laporan keuangan menggunakan sumber data yang sama."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardBody><div className="text-caption text-fg-subtle">Nilai Penjualan</div><div className="text-heading-md mt-1 font-semibold">{money.format(issuedSales)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Pembayaran Diterima</div><div className="text-heading-md mt-1 font-semibold">{money.format(received)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Piutang Berjalan</div><div className="text-heading-md mt-1 font-semibold">{money.format(outstanding)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Refund</div><div className="text-heading-md mt-1 font-semibold">{money.format(refunded)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Pengeluaran</div><div className="text-heading-md mt-1 font-semibold">{money.format(expenseTotal)}</div></CardBody></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card><CardBody><h2 className="text-body font-semibold">Penjualan & Invoice</h2><p className="text-body-sm text-fg-muted mt-2">Buat transaksi dari paket/produk, jumlah pax, harga, diskon, pajak, data pelanggan, jatuh tempo, serta syarat invoice.</p><p className="text-caption text-fg-subtle mt-4">{invoices.length} transaksi terakhir dimuat</p></CardBody></Card>
        <Card><CardBody><h2 className="text-body font-semibold">Pembayaran</h2><p className="text-body-sm text-fg-muted mt-2">Catat DP, pelunasan, cicilan, metode pembayaran, referensi eksternal, bukti bayar, dan waktu penerimaan.</p><p className="text-caption text-fg-subtle mt-4">Terintegrasi ke saldo invoice</p></CardBody></Card>
        <Card><CardBody><h2 className="text-body font-semibold">Refund</h2><p className="text-body-sm text-fg-muted mt-2">Proses refund terhadap invoice dan pembayaran sumbernya agar nilai refund otomatis tercermin pada laporan.</p><p className="text-caption text-fg-subtle mt-4">Audit trail tetap dipertahankan</p></CardBody></Card>
        <Card><CardBody><h2 className="text-body font-semibold">Produk & Paket</h2><p className="text-body-sm text-fg-muted mt-2">Master paket Umrah/travel dan produk lain berikut kode, satuan, harga default, pajak, dan status aktif.</p><p className="text-caption text-fg-subtle mt-4">{products.filter((product) => product.active).length} produk aktif</p></CardBody></Card>
        <Card><CardBody><h2 className="text-body font-semibold">Pengeluaran</h2><p className="text-body-sm text-fg-muted mt-2">Input vendor, kategori biaya, kuantitas, harga satuan, pajak, metode pembayaran, bukti, dan catatan.</p><p className="text-caption text-fg-subtle mt-4">Masuk ke basis laporan laba rugi</p></CardBody></Card>
        <Card><CardBody><h2 className="text-body font-semibold">Pengaturan Kasir</h2><p className="text-body-sm text-fg-muted mt-2">Nomor invoice/kwitansi/refund, identitas perusahaan, rekening, instruksi pembayaran, syarat & ketentuan, footer, logo, stempel, dan tanda tangan.</p><p className="text-caption text-fg-subtle mt-4">Prefix invoice: {settings?.invoice_prefix ?? 'belum diatur'}</p></CardBody></Card>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-body font-semibold">Transaksi Terbaru</h2>
              <p className="text-body-sm text-fg-muted mt-1">Snapshot invoice terakhir dari sumber transaksi kasir.</p>
            </div>
            <Link href="/admin/financials/reports" className="text-body-sm text-primary-solid font-medium hover:underline">
              Buka laporan keuangan
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-fg-subtle border-border border-b">
                <tr>
                  <th className="py-3 pr-4 font-medium">Invoice</th>
                  <th className="py-3 pr-4 font-medium">Pelanggan</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Total</th>
                  <th className="py-3 pr-4 font-medium">Dibayar</th>
                  <th className="py-3 font-medium">Jatuh Tempo</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="text-fg-muted py-6 text-center">Belum ada transaksi kasir.</td></tr>
                ) : invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-border border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{invoice.reference}</td>
                    <td className="py-3 pr-4">{invoice.customer_name}</td>
                    <td className="py-3 pr-4">{invoice.status}</td>
                    <td className="py-3 pr-4">{money.format(Number(invoice.grand_total ?? 0))}</td>
                    <td className="py-3 pr-4">{money.format(Number(invoice.paid_total ?? 0))}</td>
                    <td className="py-3">{invoice.due_on ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Alert tone="info" title="Satu sumber data keuangan">
        Modul Kasir menggunakan tabel transaksi keuangan yang sama dengan invoice, pembayaran, refund, pengeluaran, dan laporan. Tidak diperlukan input ulang ketika data laporan keuangan dan KPI disusun dari transaksi operasional.
      </Alert>
    </Stack>
  )
}
