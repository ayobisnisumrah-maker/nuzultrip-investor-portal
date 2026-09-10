import Link from 'next/link'

import { CashierWorkspace } from '@/features/admin/financials/cashier-workspace'
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
    reportsResult,
    periodsResult,
  ] = await Promise.all([
    supabase
      .from('finance_invoices')
      .select('id, reference, status, customer_name, grand_total, paid_total, refunded_total, issued_on, due_on, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('finance_payments').select('amount, status, received_at'),
    supabase.from('finance_refunds').select('amount, status, requested_at'),
    supabase.from('finance_expenses').select('total_amount, status, expense_on'),
    supabase
      .from('finance_products')
      .select('id, code, name, description, unit_label, default_unit_price, currency, tax_rate, active')
      .order('name'),
    supabase
      .from('finance_settings')
      .select('id, invoice_prefix, receipt_prefix, refund_prefix, default_currency, company_legal_name, company_address, company_tax_id, bank_details, payment_instructions, invoice_terms, invoice_footer, tax_invoice_enabled')
      .eq('singleton', true)
      .limit(1),
    supabase
      .from('financial_reports')
      .select('id, title, status, financial_period_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('financial_periods')
      .select('id, starts_on, ends_on, period_type, fiscal_year, period_index')
      .order('starts_on', { ascending: false }),
  ])

  const criticalError =
    invoicesResult.error ||
    paymentsResult.error ||
    refundsResult.error ||
    expensesResult.error ||
    productsResult.error ||
    settingsResult.error ||
    reportsResult.error ||
    periodsResult.error

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
  const settings = settingsResult.data?.[0] ?? null
  const periods = periodsResult.data ?? []
  const periodById = new Map(periods.map((period) => [period.id, period]))
  const reports = (reportsResult.data ?? []).map((report) => {
    const period = periodById.get(report.financial_period_id)
    return {
      id: report.id,
      title: report.title,
      status: report.status,
      periodLabel: period
        ? `${period.period_type} ${period.fiscal_year}/${period.period_index} · ${period.starts_on}—${period.ends_on}`
        : 'Periode tidak tersedia',
    }
  })

  const issuedSales = invoices
    .filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'void')
    .reduce((sum, invoice) => sum + Number(invoice.grand_total ?? 0), 0)
  const received = payments
    .filter((payment) => payment.status === 'confirmed')
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const refunded = refunds
    .filter((refund) => refund.status === 'processed')
    .reduce((sum, refund) => sum + Number(refund.amount ?? 0), 0)
  const expenseTotal = expenses
    .filter((expense) => expense.status === 'recorded')
    .reduce((sum, expense) => sum + Number(expense.total_amount ?? 0), 0)
  const outstanding = invoices
    .filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'void')
    .reduce(
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
        actions={
          <Link href="/admin/financials" className="text-body-sm text-link hover:underline">
            Kembali ke Keuangan
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardBody><div className="text-caption text-fg-subtle">Nilai Penjualan</div><div className="text-heading-md mt-1 font-semibold">{money.format(issuedSales)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Pembayaran Diterima</div><div className="text-heading-md mt-1 font-semibold">{money.format(received)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Piutang Berjalan</div><div className="text-heading-md mt-1 font-semibold">{money.format(outstanding)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Refund Diproses</div><div className="text-heading-md mt-1 font-semibold">{money.format(refunded)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Pengeluaran Tercatat</div><div className="text-heading-md mt-1 font-semibold">{money.format(expenseTotal)}</div></CardBody></Card>
      </div>

      <CashierWorkspace
        products={products}
        invoices={invoices}
        reports={reports}
        settings={settings}
      />

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-body font-semibold">Transaksi Terbaru</h2>
              <p className="text-body-sm text-fg-muted mt-1">Invoice kasir menjadi sumber penjualan, piutang, pembayaran, refund, KPI, dan draft laporan.</p>
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
                ) : invoices.slice(0, 12).map((invoice) => (
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
        Tombol Sinkronkan di modul Kasir membentuk ulang pos laporan dan KPI dari transaksi pada periode laporan. Publikasi kepada investor tetap melewati alur draft, review, persetujuan, dan publikasi laporan yang sudah ada.
      </Alert>
    </Stack>
  )
}
