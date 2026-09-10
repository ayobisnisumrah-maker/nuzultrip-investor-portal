import Link from 'next/link'
import { FinanceOperationsWorkspace } from '@/features/admin/financials/finance-operations-workspace'
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
export default async function FinanceOperationsPage() {
  const principal = await adminWithPermission(
    'financial_reports.view',
    '/admin/financials/operations',
  )
  if (!principal)
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin melihat transaksi keuangan.
      </Alert>
    )
  const supabase = await getServerSupabase()
  const [products, settings, invoices, expenses] = await Promise.all([
    supabase
      .from('finance_products')
      .select('id,code,name,unit_label,default_unit_price,tax_rate')
      .eq('active', true)
      .order('name'),
    supabase
      .from('finance_settings')
      .select(
        'invoice_prefix,receipt_prefix,refund_prefix,company_legal_name,company_address,company_tax_id,bank_details,payment_instructions,invoice_terms,invoice_footer,logo_asset_id,stamp_asset_id,signature_asset_id',
      )
      .eq('singleton', true)
      .single(),
    supabase
      .from('finance_invoices')
      .select('id,reference,status,customer_name,grand_total,paid_total,refunded_total,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('finance_expenses').select('total_amount,status'),
  ])
  if (products.error || settings.error || invoices.error || expenses.error)
    return (
      <Alert tone="danger" title="Modul kasir tidak dapat dimuat">
        Data transaksi belum dapat dibaca. Silakan coba lagi.
      </Alert>
    )
  const invoiceRows = invoices.data ?? []
  const expenseRows = expenses.data ?? []
  const sales = invoiceRows
    .filter((x) => x.status !== 'void')
    .reduce((sum, x) => sum + Number(x.grand_total), 0)
  const receipts = invoiceRows.reduce(
    (sum, x) => sum + Number(x.paid_total) - Number(x.refunded_total),
    0,
  )
  const spent = expenseRows
    .filter((x) => x.status === 'recorded')
    .reduce((sum, x) => sum + Number(x.total_amount), 0)
  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan Operasional"
        title="Kasir & Invoice"
        description="Kelola produk atau paket, penjualan per pax, pembayaran, refund, pengeluaran, dan dokumen invoice dari satu tempat."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Nilai invoice" value={rupiah.format(sales)} />
        <Summary label="Pembayaran bersih" value={rupiah.format(receipts)} />
        <Summary label="Pengeluaran tercatat" value={rupiah.format(spent)} />
      </div>
      {invoiceRows.length ? (
        <Card>
          <CardBody>
            <h2 className="font-semibold">Invoice terbaru</h2>
            <div className="divide-border mt-3 divide-y">
              {invoiceRows.map((x) => (
                <Link
                  key={x.id}
                  href={`/admin/financials/operations/invoices/${x.id}`}
                  className="hover:bg-sunken grid gap-1 px-2 py-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <span className="text-body-sm font-mono">{x.reference}</span>
                  <span className="text-body-sm">{x.customer_name}</span>
                  <span className="text-body-sm font-medium">
                    {rupiah.format(Number(x.grand_total))} · {x.status}
                  </span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Alert tone="info" title="Belum ada invoice">
          Tambahkan produk atau paket, lalu buat invoice pertama.
        </Alert>
      )}
      <FinanceOperationsWorkspace
        products={(products.data ?? []).map((x) => ({
          ...x,
          default_unit_price: Number(x.default_unit_price),
          tax_rate: Number(x.tax_rate),
        }))}
        settings={settings.data}
      />
    </Stack>
  )
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-caption text-fg-subtle">{label}</p>
        <p className="text-heading-sm mt-1 font-semibold">{value}</p>
      </CardBody>
    </Card>
  )
}
