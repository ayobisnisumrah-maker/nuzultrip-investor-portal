'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createFinanceExpense,
  createFinanceInvoice,
  createFinanceProduct,
  updateFinanceSettings,
} from '@/server/financials/operation-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody } from '@/ui/card'
import { Input, Textarea } from '@/ui/input'

type Product = {
  id: string
  code: string
  name: string
  unit_label: string
  default_unit_price: number
  tax_rate: number
}
type Settings = {
  invoice_prefix: string
  receipt_prefix: string
  refund_prefix: string
  company_legal_name: string | null
  company_address: string | null
  company_tax_id: string | null
  bank_details: string | null
  payment_instructions: string | null
  invoice_terms: string | null
  invoice_footer: string | null
  logo_asset_id: string | null
  stamp_asset_id: string | null
  signature_asset_id: string | null
}
type Result = { ok: boolean; error?: { message: string }; data?: { id?: string } }
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function FinanceOperationsWorkspace({
  products,
  settings,
}: {
  products: Product[]
  settings: Settings
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [branding, setBranding] = useState({
    logo: settings.logo_asset_id,
    stamp: settings.stamp_asset_id,
    signature: settings.signature_asset_id,
  })
  const [uploading, setUploading] = useState<string | null>(null)
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const product = products.find((item) => item.id === productId)
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(product?.default_unit_price ?? 0)
  const [discount, setDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(product?.tax_rate ?? 0)
  const subtotal = quantity * price
  const tax = (Math.max(subtotal - discount, 0) * taxRate) / 100
  const total = Math.max(subtotal - discount, 0) + tax

  function run(task: () => Promise<Result>, success: string, openInvoice = false) {
    setNotice(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok)
        return setNotice({
          ok: false,
          text: result.error?.message ?? 'Terjadi kesalahan pada sistem.',
        })
      setNotice({ ok: true, text: success })
      if (openInvoice && result.data?.id)
        router.push(`/admin/financials/operations/invoices/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6">
      {notice ? (
        <Alert
          tone={notice.ok ? 'success' : 'danger'}
          title={notice.ok ? 'Berhasil' : 'Tidak dapat diproses'}
        >
          {notice.text}
        </Alert>
      ) : null}
      <Card>
        <CardBody>
          <h2 className="text-heading-sm font-semibold">Buat invoice penjualan</h2>
          <p className="text-body-sm text-fg-muted mt-1">
            Masukkan paket dan jumlah pax. Nilai akhir dihitung ulang oleh database.
          </p>
          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              if (!product) return
              run(
                () =>
                  createFinanceInvoice({
                    customerName: String(form.get('name')),
                    customerEmail: String(form.get('email')),
                    customerPhone: String(form.get('phone')),
                    customerAddress: String(form.get('address')),
                    dueOn: String(form.get('due')) || null,
                    notes: String(form.get('notes')),
                    items: [
                      {
                        productId: product.id,
                        productCode: product.code,
                        name: product.name,
                        description: '',
                        quantity,
                        unitLabel: product.unit_label,
                        unitPrice: price,
                        discountAmount: discount,
                        taxRate,
                        position: 0,
                      },
                    ],
                  }),
                'Invoice draf berhasil dibuat.',
                true,
              )
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama pelanggan">
                <Input name="name" required />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" />
              </Field>
              <Field label="Nomor telepon">
                <Input name="phone" />
              </Field>
              <Field label="Jatuh tempo">
                <Input name="due" type="date" />
              </Field>
            </div>
            <Field label="Alamat">
              <Textarea name="address" rows={2} />
            </Field>
            <div className="grid gap-4 lg:grid-cols-5">
              <Field label="Produk / paket">
                <select
                  className="border-border-strong bg-surface h-11 rounded-md border px-3"
                  value={productId}
                  onChange={(event) => {
                    const next = products.find((item) => item.id === event.target.value)
                    setProductId(event.target.value)
                    setPrice(next?.default_unit_price ?? 0)
                    setTaxRate(next?.tax_rate ?? 0)
                  }}
                  required
                >
                  <option value="">Pilih paket</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Jumlah pax">
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </Field>
              <Field label="Harga per pax">
                <Input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(event) => setPrice(Number(event.target.value))}
                />
              </Field>
              <Field label="Diskon">
                <Input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value))}
                />
              </Field>
              <Field label="Pajak (%)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) => setTaxRate(Number(event.target.value))}
                />
              </Field>
            </div>
            <div className="bg-sunken grid gap-3 rounded-lg p-4 sm:grid-cols-3">
              <Metric label="Subtotal" value={rupiah.format(subtotal)} />
              <Metric label="Pajak" value={rupiah.format(tax)} />
              <Metric label="Total invoice" value={rupiah.format(total)} />
            </div>
            <Field label="Catatan">
              <Textarea name="notes" rows={2} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={pending} disabled={!product || quantity <= 0}>
                Simpan invoice draf
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="font-semibold">Tambah produk atau paket</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                run(
                  () =>
                    createFinanceProduct({
                      code: String(form.get('code')),
                      name: String(form.get('name')),
                      description: String(form.get('description')),
                      unitLabel: String(form.get('unit')),
                      defaultUnitPrice: Number(form.get('price')),
                      taxRate: Number(form.get('tax')),
                    }),
                  'Produk atau paket berhasil ditambahkan.',
                )
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kode">
                  <Input name="code" required />
                </Field>
                <Field label="Nama paket">
                  <Input name="name" required />
                </Field>
                <Field label="Satuan">
                  <Input name="unit" defaultValue="pax" required />
                </Field>
                <Field label="Harga default">
                  <Input name="price" type="number" min="0" required />
                </Field>
                <Field label="Pajak (%)">
                  <Input name="tax" type="number" min="0" max="100" defaultValue="0" />
                </Field>
              </div>
              <Field label="Deskripsi">
                <Textarea name="description" rows={2} />
              </Field>
              <Button type="submit" loading={pending}>
                Tambah paket
              </Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold">Catat pengeluaran</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                run(
                  () =>
                    createFinanceExpense({
                      expenseOn: String(form.get('date')),
                      category: String(form.get('category')),
                      vendorName: String(form.get('vendor')),
                      description: String(form.get('description')),
                      quantity: Number(form.get('quantity')),
                      unitPrice: Number(form.get('price')),
                      taxAmount: Number(form.get('tax')),
                      paymentMethod: String(form.get('method')),
                      notes: '',
                    }),
                  'Pengeluaran berhasil dicatat.',
                )
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tanggal">
                  <Input name="date" type="date" required />
                </Field>
                <Field label="Kategori">
                  <Input name="category" required />
                </Field>
                <Field label="Vendor">
                  <Input name="vendor" />
                </Field>
                <Field label="Metode pembayaran">
                  <Input name="method" />
                </Field>
                <Field label="Jumlah">
                  <Input
                    name="quantity"
                    type="number"
                    min="0.001"
                    step="0.001"
                    defaultValue="1"
                    required
                  />
                </Field>
                <Field label="Harga satuan">
                  <Input name="price" type="number" min="0" required />
                </Field>
                <Field label="Pajak / biaya">
                  <Input name="tax" type="number" min="0" defaultValue="0" />
                </Field>
              </div>
              <Field label="Deskripsi">
                <Input name="description" required />
              </Field>
              <Button type="submit" loading={pending}>
                Catat pengeluaran
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardBody>
          <h2 className="font-semibold">Pengaturan invoice</h2>
          <p className="text-body-sm text-fg-muted mt-1">
            Identitas dan syarat disalin saat invoice diterbitkan agar dokumen lama tidak ikut
            berubah.
          </p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              run(
                () =>
                  updateFinanceSettings({
                    invoicePrefix: String(form.get('invoicePrefix')).toUpperCase(),
                    receiptPrefix: String(form.get('receiptPrefix')).toUpperCase(),
                    refundPrefix: String(form.get('refundPrefix')).toUpperCase(),
                    companyLegalName: String(form.get('company')),
                    companyAddress: String(form.get('address')),
                    companyTaxId: String(form.get('taxId')),
                    bankDetails: String(form.get('bank')),
                    paymentInstructions: String(form.get('instructions')),
                    invoiceTerms: String(form.get('terms')),
                    invoiceFooter: String(form.get('footer')),
                    logoAssetId: branding.logo,
                    stampAssetId: branding.stamp,
                    signatureAssetId: branding.signature,
                  }),
                'Pengaturan invoice berhasil disimpan.',
              )
            }}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Prefix invoice">
                <Input name="invoicePrefix" defaultValue={settings.invoice_prefix} />
              </Field>
              <Field label="Prefix pembayaran">
                <Input name="receiptPrefix" defaultValue={settings.receipt_prefix} />
              </Field>
              <Field label="Prefix refund">
                <Input name="refundPrefix" defaultValue={settings.refund_prefix} />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nama badan usaha">
                <Input name="company" defaultValue={settings.company_legal_name ?? ''} />
              </Field>
              <Field label="Identitas pajak (opsional)">
                <Input name="taxId" defaultValue={settings.company_tax_id ?? ''} />
              </Field>
            </div>
            <Field label="Alamat perusahaan">
              <Textarea name="address" defaultValue={settings.company_address ?? ''} rows={2} />
            </Field>
            <Field label="Rekening / metode pembayaran">
              <Textarea name="bank" defaultValue={settings.bank_details ?? ''} rows={2} />
            </Field>
            <Field label="Instruksi pembayaran">
              <Textarea
                name="instructions"
                defaultValue={settings.payment_instructions ?? ''}
                rows={2}
              />
            </Field>
            <Field label="Syarat dan ketentuan">
              <Textarea name="terms" defaultValue={settings.invoice_terms ?? ''} rows={5} />
            </Field>
            <Field label="Catatan kaki">
              <Input name="footer" defaultValue={settings.invoice_footer ?? ''} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <BrandAsset
                label="Logo invoice"
                assetId={branding.logo}
                busy={uploading === 'logo'}
                onChange={(id) => setBranding((value) => ({ ...value, logo: id }))}
                onBusy={(value) => setUploading(value ? 'logo' : null)}
              />
              <BrandAsset
                label="Stempel perusahaan"
                assetId={branding.stamp}
                busy={uploading === 'stamp'}
                onChange={(id) => setBranding((value) => ({ ...value, stamp: id }))}
                onBusy={(value) => setUploading(value ? 'stamp' : null)}
              />
              <BrandAsset
                label="Tanda tangan"
                assetId={branding.signature}
                busy={uploading === 'signature'}
                onChange={(id) => setBranding((value) => ({ ...value, signature: id }))}
                onBusy={(value) => setUploading(value ? 'signature' : null)}
              />
            </div>
            <Button type="submit" loading={pending}>
              Simpan pengaturan
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
function BrandAsset({
  label,
  assetId,
  busy,
  onChange,
  onBusy,
}: {
  label: string
  assetId: string | null
  busy: boolean
  onChange: (id: string | null) => void
  onBusy: (busy: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  async function upload(file: File | null) {
    if (!file) return
    onBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('purpose', 'finance-branding')
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body })
      const payload = (await response.json()) as {
        ok?: boolean
        asset?: { id: string }
        error?: string
      }
      if (!response.ok || !payload.ok || !payload.asset)
        throw new Error(payload.error || 'Gambar gagal diunggah.')
      onChange(payload.asset.id)
    } finally {
      onBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="border-border grid gap-3 rounded-lg border p-4">
      <div>
        <p className="text-body-sm font-medium">{label}</p>
        <p className="text-caption text-fg-subtle">PNG, JPG, atau WebP; maksimal 6 MB.</p>
      </div>
      {assetId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/admin/finance/assets/${assetId}`}
          alt={label}
          className="h-20 max-w-full object-contain object-left"
        />
      ) : (
        <p className="text-caption text-fg-subtle">Belum diunggah</p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" loading={busy} onClick={() => input.current?.click()}>
          {assetId ? 'Ganti' : 'Unggah'}
        </Button>
        {assetId ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onChange(null)}>
            Hapus
          </Button>
        ) : null}
      </div>
      <input
        ref={input}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void upload(event.target.files?.[0] ?? null)}
      />
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-body-sm grid gap-1.5">
      <span>{label}</span>
      {children}
    </label>
  )
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  )
}
