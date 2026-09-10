'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  createCashierExpense,
  createCashierInvoice,
  createCashierProduct,
  issueCashierInvoice,
  processCashierRefund,
  recordCashierPayment,
  syncCashierToFinancialReport,
  updateCashierSettings,
} from '@/server/financials/cashier-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'

type Product = {
  id: string
  code: string
  name: string
  description: string | null
  unit_label: string
  default_unit_price: number | string
  currency: string
  tax_rate: number | string
  active: boolean
}

type Invoice = {
  id: string
  reference: string
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void'
  customer_name: string
  grand_total: number | string
  paid_total: number | string
  refunded_total: number | string
}

type Report = { id: string; title: string; status: string; periodLabel: string }

type Settings = {
  invoice_prefix?: string | null
  receipt_prefix?: string | null
  refund_prefix?: string | null
  default_currency?: string | null
  company_legal_name?: string | null
  company_address?: string | null
  company_tax_id?: string | null
  bank_details?: string | null
  payment_instructions?: string | null
  invoice_terms?: string | null
  invoice_footer?: string | null
  tax_invoice_enabled?: boolean | null
}

type ItemDraft = {
  productId: string
  name: string
  description: string
  quantity: number
  unitLabel: string
  unitPrice: number
  discountAmount: number
  taxRate: number
}

const emptyItem = (): ItemDraft => ({
  productId: '', name: '', description: '', quantity: 1, unitLabel: 'pax', unitPrice: 0, discountAmount: 0, taxRate: 0,
})

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-body-sm text-fg grid gap-1.5"><span>{label}</span>{children}</label>
}

function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`border-border bg-canvas h-10 rounded-lg border px-3 text-sm ${className}`} />
}

function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`border-border bg-canvas min-h-24 rounded-lg border px-3 py-2 text-sm ${className}`} />
}

export function CashierWorkspace({ products, invoices, reports, settings }: {
  products: Product[]
  invoices: Invoice[]
  reports: Report[]
  settings: Settings | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [invoiceNotes, setInvoiceNotes] = useState('')

  const openInvoices = useMemo(() => invoices.filter((i) => ['issued', 'partially_paid'].includes(i.status)), [invoices])
  const refundableInvoices = useMemo(() => invoices.filter((i) => ['partially_paid', 'paid'].includes(i.status)), [invoices])
  const draftInvoices = useMemo(() => invoices.filter((i) => i.status === 'draft'), [invoices])

  function execute(action: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string, after?: () => void) {
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.error?.message ?? 'Operasi tidak dapat diselesaikan.' })
        return
      }
      setMessage({ tone: 'success', text: success })
      after?.()
      router.refresh()
    })
  }

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  function chooseProduct(index: number, productId: string) {
    const product = products.find((row) => row.id === productId)
    if (!product) return updateItem(index, { productId: '' })
    updateItem(index, {
      productId,
      name: product.name,
      description: product.description ?? '',
      unitLabel: product.unit_label,
      unitPrice: Number(product.default_unit_price ?? 0),
      taxRate: Number(product.tax_rate ?? 0),
    })
  }

  const invoiceSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const invoiceDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0)
  const invoiceTax = items.reduce((sum, item) => sum + Math.max(0, item.quantity * item.unitPrice - item.discountAmount) * (item.taxRate / 100), 0)
  const invoiceGrandTotal = invoiceSubtotal - invoiceDiscount + invoiceTax

  return (
    <div className="grid gap-6">
      {message ? <Alert tone={message.tone} title={message.tone === 'success' ? 'Berhasil' : 'Operasi gagal'}>{message.text}</Alert> : null}

      <Card>
        <CardHeader><CardTitle>Transaksi Baru / Invoice</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Nama pelanggan"><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></Field>
              <Field label="No. telepon / WhatsApp"><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></Field>
              <Field label="Jatuh tempo"><Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></Field>
            </div>
            <Field label="Alamat pelanggan"><Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></Field>

            <div className="grid gap-4">
              {items.map((item, index) => (
                <div key={index} className="border-border rounded-xl border p-4">
                  <div className="grid gap-4 lg:grid-cols-6">
                    <Field label="Paket / produk">
                      <Select value={item.productId} onChange={(e) => chooseProduct(index, e.target.value)}>
                        <option value="">Input manual</option>
                        {products.filter((p) => p.active).map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="Nama item"><Input value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} /></Field>
                    <Field label="Jumlah / pax"><Input type="number" min={0.01} step="0.01" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} /></Field>
                    <Field label="Harga satuan"><Input type="number" min={0} value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} /></Field>
                    <Field label="Diskon nominal"><Input type="number" min={0} value={item.discountAmount} onChange={(e) => updateItem(index, { discountAmount: Number(e.target.value) })} /></Field>
                    <Field label="Pajak %"><Input type="number" min={0} max={100} step="0.01" value={item.taxRate} onChange={(e) => updateItem(index, { taxRate: Number(e.target.value) })} /></Field>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>Hapus item</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button variant="secondary" onClick={() => setItems((current) => [...current, emptyItem()])}>+ Tambah item</Button>
              <div className="text-right text-sm">
                <div>Subtotal: <strong>Rp{invoiceSubtotal.toLocaleString('id-ID')}</strong></div>
                <div>Diskon: <strong>Rp{invoiceDiscount.toLocaleString('id-ID')}</strong></div>
                <div>Pajak: <strong>Rp{Math.round(invoiceTax).toLocaleString('id-ID')}</strong></div>
                <div className="text-base">Grand total: <strong>Rp{Math.round(invoiceGrandTotal).toLocaleString('id-ID')}</strong></div>
              </div>
            </div>
            <Field label="Catatan invoice"><Textarea value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} /></Field>
            <div className="flex justify-end">
              <Button loading={pending} disabled={!customerName || items.some((item) => !item.name || item.quantity <= 0)} onClick={() => execute(
                () => createCashierInvoice({
                  customerName, customerEmail, customerPhone, customerAddress, dueOn: dueOn || null, notes: invoiceNotes,
                  items: items.map((item) => ({
                    productId: item.productId || null,
                    productCode: products.find((p) => p.id === item.productId)?.code ?? '',
                    name: item.name, description: item.description, quantity: item.quantity, unitLabel: item.unitLabel,
                    unitPrice: item.unitPrice, discountAmount: item.discountAmount, taxRate: item.taxRate,
                  })),
                }),
                'Draft invoice berhasil dibuat.',
                () => { setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setCustomerAddress(''); setDueOn(''); setInvoiceNotes(''); setItems([emptyItem()]) },
              )}>Simpan draft invoice</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Terbitkan Invoice</CardTitle></CardHeader><CardBody>
          <div className="grid gap-4">
            <IssueInvoiceForm invoices={draftInvoices} pending={pending} run={execute} />
          </div>
        </CardBody></Card>
        <Card><CardHeader><CardTitle>Catat DP / Cicilan / Pelunasan</CardTitle></CardHeader><CardBody>
          <PaymentForm invoices={openInvoices} pending={pending} run={execute} />
        </CardBody></Card>
        <Card><CardHeader><CardTitle>Refund</CardTitle></CardHeader><CardBody>
          <RefundForm invoices={refundableInvoices} pending={pending} run={execute} />
        </CardBody></Card>
        <Card><CardHeader><CardTitle>Pengeluaran Operasional</CardTitle></CardHeader><CardBody>
          <ExpenseForm pending={pending} run={execute} defaultCurrency={settings?.default_currency ?? 'IDR'} />
        </CardBody></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Master Produk & Paket</CardTitle></CardHeader><CardBody>
          <ProductForm pending={pending} run={execute} defaultCurrency={settings?.default_currency ?? 'IDR'} />
        </CardBody></Card>
        <Card><CardHeader><CardTitle>Sinkronkan ke Laporan Keuangan</CardTitle></CardHeader><CardBody>
          <ReportSyncForm reports={reports} pending={pending} run={execute} />
        </CardBody></Card>
      </div>

      <Card><CardHeader><CardTitle>Pengaturan Invoice & Kasir</CardTitle></CardHeader><CardBody>
        <SettingsForm settings={settings} pending={pending} run={execute} />
      </CardBody></Card>
    </div>
  )
}

function IssueInvoiceForm({ invoices, pending, run }: { invoices: Invoice[]; pending: boolean; run: Parameters<typeof CashierWorkspace>[0] extends never ? never : any }) {
  const [invoiceId, setInvoiceId] = useState('')
  return <><Field label="Draft invoice"><Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}><option value="">Pilih invoice</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.reference} · {i.customer_name} · Rp{Number(i.grand_total).toLocaleString('id-ID')}</option>)}</Select></Field><div className="flex justify-end"><Button loading={pending} disabled={!invoiceId} onClick={() => run(() => issueCashierInvoice({ invoiceId }), 'Invoice berhasil diterbitkan.', () => setInvoiceId(''))}>Terbitkan</Button></div></>
}

function PaymentForm({ invoices, pending, run }: { invoices: Invoice[]; pending: boolean; run: any }) {
  const [invoiceId, setInvoiceId] = useState(''); const [amount, setAmount] = useState(0); const [method, setMethod] = useState('Transfer Bank'); const [reference, setReference] = useState(''); const [notes, setNotes] = useState('')
  return <div className="grid gap-4"><Field label="Invoice"><Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}><option value="">Pilih invoice</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.reference} · Sisa Rp{Math.max(0, Number(i.grand_total)-Number(i.paid_total)+Number(i.refunded_total)).toLocaleString('id-ID')}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Nominal"><Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field><Field label="Metode"><Input value={method} onChange={(e) => setMethod(e.target.value)} /></Field></div><Field label="Referensi bank/gateway"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field><Field label="Catatan"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field><div className="flex justify-end"><Button loading={pending} disabled={!invoiceId || amount <= 0 || !method} onClick={() => run(() => recordCashierPayment({ invoiceId, amount, method, receivedAt: new Date().toISOString(), externalReference: reference, notes }), 'Pembayaran berhasil dicatat.', () => { setAmount(0); setReference(''); setNotes('') })}>Catat pembayaran</Button></div></div>
}

function RefundForm({ invoices, pending, run }: { invoices: Invoice[]; pending: boolean; run: any }) {
  const [invoiceId, setInvoiceId] = useState(''); const [amount, setAmount] = useState(0); const [reason, setReason] = useState(''); const [notes, setNotes] = useState('')
  return <div className="grid gap-4"><Field label="Invoice"><Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}><option value="">Pilih invoice</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.reference} · Refundable maks. Rp{Math.max(0, Number(i.paid_total)-Number(i.refunded_total)).toLocaleString('id-ID')}</option>)}</Select></Field><Field label="Nominal refund"><Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field><Field label="Alasan"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field><Field label="Catatan internal"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field><div className="flex justify-end"><Button loading={pending} disabled={!invoiceId || amount <= 0 || !reason} onClick={() => run(() => processCashierRefund({ invoiceId, paymentId: null, amount, reason, notes }), 'Refund berhasil diproses.', () => { setAmount(0); setReason(''); setNotes('') })}>Proses refund</Button></div></div>
}

function ExpenseForm({ pending, run, defaultCurrency }: { pending: boolean; run: any; defaultCurrency: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10)); const [category, setCategory] = useState('Operasional'); const [vendor, setVendor] = useState(''); const [description, setDescription] = useState(''); const [qty, setQty] = useState(1); const [price, setPrice] = useState(0); const [tax, setTax] = useState(0); const [method, setMethod] = useState('Transfer Bank')
  return <div className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Tanggal"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Kategori"><Input value={category} onChange={(e) => setCategory(e.target.value)} /></Field></div><Field label="Vendor"><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></Field><Field label="Keterangan"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Qty"><Input type="number" min={0.01} step="0.01" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field><Field label="Harga satuan"><Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field><Field label="Pajak nominal"><Input type="number" min={0} value={tax} onChange={(e) => setTax(Number(e.target.value))} /></Field></div><Field label="Metode pembayaran"><Input value={method} onChange={(e) => setMethod(e.target.value)} /></Field><div className="flex justify-end"><Button loading={pending} disabled={!date || !category || !description || qty <= 0} onClick={() => run(() => createCashierExpense({ expenseOn: date, category, vendorName: vendor, description, quantity: qty, unitPrice: price, taxAmount: tax, currency: defaultCurrency, paymentMethod: method, notes: '' }), 'Pengeluaran berhasil dicatat.', () => { setVendor(''); setDescription(''); setPrice(0); setTax(0) })}>Simpan pengeluaran</Button></div></div>
}

function ProductForm({ pending, run, defaultCurrency }: { pending: boolean; run: any; defaultCurrency: string }) {
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [unit, setUnit] = useState('pax'); const [price, setPrice] = useState(0); const [tax, setTax] = useState(0)
  return <div className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Kode"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></Field><Field label="Nama paket/produk"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field></div><Field label="Deskripsi"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Satuan"><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></Field><Field label="Harga default"><Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field><Field label="Pajak %"><Input type="number" min={0} max={100} value={tax} onChange={(e) => setTax(Number(e.target.value))} /></Field></div><div className="flex justify-end"><Button loading={pending} disabled={!code || !name} onClick={() => run(() => createCashierProduct({ code, name, description, unitLabel: unit, defaultUnitPrice: price, currency: defaultCurrency, taxRate: tax }), 'Produk/paket berhasil ditambahkan.', () => { setCode(''); setName(''); setDescription(''); setPrice(0); setTax(0) })}>Tambah produk</Button></div></div>
}

function ReportSyncForm({ reports, pending, run }: { reports: Report[]; pending: boolean; run: any }) {
  const [reportId, setReportId] = useState('')
  return <div className="grid gap-4"><Alert tone="info" title="Generator laporan otomatis">Sinkronisasi menghitung penjualan, pembayaran, refund, pengeluaran, pax, piutang, hasil operasional, dan arus kas dari transaksi kasir pada periode laporan. Isi draft terstruktur/KPI akan diganti dengan hasil terbaru; lampiran laporan tetap dipertahankan.</Alert><Field label="Laporan draft"><Select value={reportId} onChange={(e) => setReportId(e.target.value)}><option value="">Pilih laporan</option>{reports.filter((r) => r.status === 'draft').map((r) => <option key={r.id} value={r.id}>{r.title} · {r.periodLabel}</option>)}</Select></Field><div className="flex justify-end"><Button loading={pending} disabled={!reportId} onClick={() => run(() => syncCashierToFinancialReport({ reportId }), 'Data kasir berhasil disinkronkan ke draft laporan keuangan.')}>Sinkronkan sekarang</Button></div></div>
}

function SettingsForm({ settings, pending, run }: { settings: Settings | null; pending: boolean; run: any }) {
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoice_prefix ?? 'INV'); const [receiptPrefix, setReceiptPrefix] = useState(settings?.receipt_prefix ?? 'PAY'); const [refundPrefix, setRefundPrefix] = useState(settings?.refund_prefix ?? 'RFD'); const [currency, setCurrency] = useState(settings?.default_currency ?? 'IDR'); const [legalName, setLegalName] = useState(settings?.company_legal_name ?? ''); const [address, setAddress] = useState(settings?.company_address ?? ''); const [taxId, setTaxId] = useState(settings?.company_tax_id ?? ''); const [bank, setBank] = useState(settings?.bank_details ?? ''); const [instructions, setInstructions] = useState(settings?.payment_instructions ?? ''); const [terms, setTerms] = useState(settings?.invoice_terms ?? ''); const [footer, setFooter] = useState(settings?.invoice_footer ?? ''); const [taxInvoice, setTaxInvoice] = useState(Boolean(settings?.tax_invoice_enabled))
  return <div className="grid gap-4"><div className="grid gap-4 md:grid-cols-4"><Field label="Prefix invoice"><Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())} /></Field><Field label="Prefix kwitansi"><Input value={receiptPrefix} onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())} /></Field><Field label="Prefix refund"><Input value={refundPrefix} onChange={(e) => setRefundPrefix(e.target.value.toUpperCase())} /></Field><Field label="Mata uang"><Input maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></Field></div><div className="grid gap-4 md:grid-cols-2"><Field label="Nama legal perusahaan"><Input value={legalName} onChange={(e) => setLegalName(e.target.value)} /></Field><Field label="NPWP/ID Pajak"><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></Field></div><Field label="Alamat perusahaan"><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Rekening / detail bank"><Textarea value={bank} onChange={(e) => setBank(e.target.value)} /></Field><Field label="Instruksi pembayaran"><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field></div><Field label="Syarat & ketentuan invoice"><Textarea className="min-h-40" value={terms} onChange={(e) => setTerms(e.target.value)} /></Field><Field label="Footer invoice"><Textarea value={footer} onChange={(e) => setFooter(e.target.value)} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={taxInvoice} onChange={(e) => setTaxInvoice(e.target.checked)} /> Aktifkan informasi invoice pajak</label><div className="flex justify-end"><Button loading={pending} onClick={() => run(() => updateCashierSettings({ invoicePrefix, receiptPrefix, refundPrefix, defaultCurrency: currency, companyLegalName: legalName, companyAddress: address, companyTaxId: taxId, bankDetails: bank, paymentInstructions: instructions, invoiceTerms: terms, invoiceFooter: footer, taxInvoiceEnabled: taxInvoice }), 'Pengaturan kasir dan invoice berhasil disimpan.')}>Simpan pengaturan</Button></div></div>
}
