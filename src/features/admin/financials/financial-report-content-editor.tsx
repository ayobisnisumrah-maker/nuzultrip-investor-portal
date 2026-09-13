'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Plus, Trash2, Upload } from 'lucide-react'

import { saveFinancialReportingFoundation } from '@/server/financials/reporting-foundation-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input, Textarea } from '@/ui/input'

type LineItem = {
  statement: 'income' | 'balance' | 'cash_flow' | 'changes_in_equity'
  category:
    | 'revenue'
    | 'expense'
    | 'asset'
    | 'liability'
    | 'equity'
    | 'operating'
    | 'investing'
    | 'financing'
  lineKey: string
  label: string
  amount: string
  currency: string
  note: string
}

type Kpi = {
  kpiKey: string
  label: string
  value: string
  unit: 'ratio' | 'percent' | 'currency' | 'count' | 'days'
  basis: 'reported' | 'derived'
}

type Disclosure = { disclosureKey: string; title: string; content: string }
type AccountingFramework = 'sak_ep' | 'sak_indonesia' | 'other' | null
type Asset = { id: string; original_filename: string; mime_type: string; byte_size: number }

const lineCategories: Record<LineItem['statement'], LineItem['category'][]> = {
  income: ['revenue', 'expense'],
  balance: ['asset', 'liability', 'equity'],
  cash_flow: ['operating', 'investing', 'financing'],
  changes_in_equity: ['equity'],
}

const statementLabels: Record<LineItem['statement'], string> = {
  income: 'Laba Rugi',
  balance: 'Posisi Keuangan',
  cash_flow: 'Arus Kas',
  changes_in_equity: 'Perubahan Ekuitas',
}

const categoryLabels: Record<LineItem['category'], string> = {
  revenue: 'Pendapatan', expense: 'Beban', asset: 'Aset', liability: 'Liabilitas',
  equity: 'Ekuitas', operating: 'Operasi', investing: 'Investasi', financing: 'Pendanaan',
}

const balanceSheetTemplate: LineItem[] = [
  ['asset', 'cash_and_bank', 'Kas & Bank', 'Rekonsiliasi dengan saldo kas dan rekening bank.'],
  ['asset', 'accounts_receivable', 'Piutang Usaha', 'Rekonsiliasi dengan invoice yang belum tertagih.'],
  ['asset', 'prepaid_expenses', 'Uang Muka & Biaya Dibayar Dimuka', 'Rekonsiliasi dengan uang muka vendor dan biaya dibayar dimuka.'],
  ['liability', 'accounts_payable', 'Utang Vendor', 'Rekonsiliasi dengan kewajiban vendor yang belum dibayar.'],
  ['liability', 'customer_advances', 'Uang Muka / Titipan Pelanggan', 'Pembayaran pelanggan yang belum memenuhi pengakuan pendapatan.'],
  ['liability', 'other_liabilities', 'Kewajiban Lainnya', 'Isi hanya kewajiban yang memiliki dasar dan bukti rekonsiliasi.'],
  ['equity', 'paid_in_capital', 'Modal Disetor', 'Rekonsiliasi dengan dokumen setoran modal.'],
  ['equity', 'retained_earnings', 'Saldo Laba', 'Rekonsiliasi saldo awal, laba/rugi periode, dan distribusi/penyesuaian.'],
].map(([category, lineKey, label, note]) => ({
  statement: 'balance' as const,
  category: category as LineItem['category'], lineKey, label, amount: '0', currency: 'IDR', note,
}))

const equityTemplate: LineItem[] = [
  { statement: 'changes_in_equity', category: 'equity', lineKey: 'opening_equity', label: 'Ekuitas awal periode', amount: '0', currency: 'IDR', note: 'Saldo ekuitas pada awal periode yang direkonsiliasi dengan laporan sebelumnya.' },
  { statement: 'changes_in_equity', category: 'equity', lineKey: 'profit_loss_period', label: 'Laba / rugi periode berjalan', amount: '0', currency: 'IDR', note: 'Perubahan ekuitas yang berasal dari hasil periode berjalan.' },
  { statement: 'changes_in_equity', category: 'equity', lineKey: 'owner_transactions', label: 'Transaksi dengan pemilik', amount: '0', currency: 'IDR', note: 'Setoran modal, distribusi, atau transaksi pemilik lain yang didukung dokumen.' },
  { statement: 'changes_in_equity', category: 'equity', lineKey: 'closing_equity', label: 'Ekuitas akhir periode', amount: '0', currency: 'IDR', note: 'Saldo ekuitas akhir setelah seluruh perubahan periode direkonsiliasi.' },
]

function keyFromLabel(value: string, fallback: string) {
  const key = value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return /^[a-z]/.test(key) ? key.slice(0, 80) : fallback
}

function bytes(value: number) {
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatIDR(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export function FinancialReportContentEditor({ reportId, initialLines, initialKpis, initialAsset, initialAccountingFramework = null, initialBasisOfPreparation = '', initialDisclosures = [] }: {
  reportId: string
  initialLines: LineItem[]
  initialKpis: Kpi[]
  initialAsset: Asset | null
  initialAccountingFramework?: AccountingFramework
  initialBasisOfPreparation?: string
  initialDisclosures?: Disclosure[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [lines, setLines] = useState(initialLines)
  const [kpis, setKpis] = useState(initialKpis)
  const [asset, setAsset] = useState(initialAsset)
  const [framework, setFramework] = useState<AccountingFramework>(initialAccountingFramework)
  const [basis, setBasis] = useState(initialBasisOfPreparation)
  const [disclosures, setDisclosures] = useState(initialDisclosures)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const busy = pending || uploading

  function addMissingTemplate(template: LineItem[], successLabel: string) {
    setLines((current) => {
      const keys = new Set(current.map((item) => item.lineKey))
      const missing = template.filter((item) => !keys.has(item.lineKey))
      setMessage({ tone: 'success', text: missing.length ? `${missing.length} pos ${successLabel} ditambahkan dengan nilai awal Rp0. Rekonsiliasi semua angka sebelum review.` : `Semua pos template ${successLabel} sudah tersedia.` })
      return [...current, ...missing.map((item) => ({ ...item }))]
    })
  }

  async function uploadFile(file: File | null) {
    if (!file) return
    setMessage(null); setUploading(true)
    try {
      const data = new FormData(); data.append('file', file); data.append('purpose', 'financial-report')
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body: data })
      const payload = (await response.json()) as { ok?: boolean; asset?: Asset; error?: string }
      if (!response.ok || !payload.ok || !payload.asset) throw new Error(payload.error || 'Lampiran gagal diunggah.')
      setAsset(payload.asset)
      setMessage({ tone: 'success', text: 'Lampiran berhasil diunggah. Simpan isi laporan untuk mengaitkannya ke versi draft.' })
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Lampiran gagal diunggah.' })
    } finally { setUploading(false) }
  }

  function save() {
    setMessage(null)
    const normalizedLines = lines.map((item, index) => ({ ...item, lineKey: keyFromLabel(item.lineKey || item.label, `pos_${index + 1}`), amount: Number(item.amount) }))
    const normalizedKpis = kpis.map((item, index) => ({ ...item, kpiKey: keyFromLabel(item.kpiKey || item.label, `kpi_${index + 1}`), value: Number(item.value) }))
    const normalizedDisclosures = disclosures.map((item, index) => ({ ...item, disclosureKey: keyFromLabel(item.disclosureKey || item.title, `catatan_${index + 1}`) }))

    if (lines.some((item) => !item.label.trim() || !item.amount.trim()) || normalizedLines.some((item) => !Number.isFinite(item.amount)) || kpis.some((item) => !item.label.trim() || !item.value.trim()) || normalizedKpis.some((item) => !Number.isFinite(item.value)) || disclosures.some((item) => !item.title.trim() || !item.content.trim())) {
      setMessage({ tone: 'danger', text: 'Lengkapi nama, nilai, dan penjelasan pada seluruh pos, KPI, dan CALK.' }); return
    }
    if (framework && (!basis.trim() || !lines.some((item) => item.statement === 'changes_in_equity') || disclosures.length === 0)) {
      setMessage({ tone: 'danger', text: 'Jika kerangka akuntansi dipilih, Dasar Penyusunan, Laporan Perubahan Ekuitas, dan CALK wajib dilengkapi.' }); return
    }

    startTransition(async () => {
      const result = await saveFinancialReportingFoundation({ reportId, documentAssetId: asset?.id ?? null, lineItems: normalizedLines, kpis: normalizedKpis, accountingFramework: framework, basisOfPreparation: basis, disclosures: normalizedDisclosures })
      setMessage(result.ok ? { tone: 'success', text: 'Snapshot laporan, Perubahan Ekuitas, KPI, dan CALK berhasil disimpan.' } : { tone: 'danger', text: result.error.message })
    })
  }

  const balanceLines = lines.filter((item) => item.statement === 'balance')
  const hasIncompleteBalance = balanceLines.some((item) => !item.amount.trim() || !Number.isFinite(Number(item.amount)))
  const totalAssets = balanceLines.filter((item) => item.category === 'asset').reduce((total, item) => total + (Number(item.amount) || 0), 0)
  const totalLiabilitiesAndEquity = balanceLines.filter((item) => item.category === 'liability' || item.category === 'equity').reduce((total, item) => total + (Number(item.amount) || 0), 0)
  const balanceDifference = totalAssets - totalLiabilitiesAndEquity
  const isBalanced = !hasIncompleteBalance && Math.abs(balanceDifference) < 0.5

  return <div className="grid gap-8">
    <section className="grid gap-4">
      <div><h3 className="font-semibold">Basis pelaporan</h3><p className="text-caption text-fg-subtle">Deklarasikan hanya kerangka yang memang telah ditetapkan dan direview. Pilihan ini sendiri bukan pernyataan kepatuhan.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Kerangka akuntansi" hint="Pilih kerangka penyusunan yang benar-benar digunakan. Jangan memilih SAK EP hanya untuk mengubah tampilan laporan.">
          <select value={framework ?? ''} onChange={(e) => setFramework((e.target.value || null) as AccountingFramework)} className="border-border bg-canvas h-10 rounded-lg border px-3">
            <option value="">Belum ditetapkan</option><option value="sak_ep">SAK Entitas Privat (SAK EP)</option><option value="sak_indonesia">SAK Indonesia</option><option value="other">Kerangka lain</option>
          </select>
        </Field>
        <Field label="Dasar penyusunan" hint="Jelaskan basis pengukuran, basis akrual/kas bila relevan, kelangsungan usaha, mata uang penyajian, dan dasar penting lain yang benar-benar digunakan.">
          <Textarea value={basis} onChange={(e) => setBasis(e.target.value)} placeholder="Tuliskan dasar penyusunan yang telah direview…" />
        </Field>
      </div>
      {framework ? <Alert tone="info" title="Deklarasi kerangka membutuhkan kelengkapan">Sistem akan menolak pengiriman ke review bila Dasar Penyusunan, Laporan Perubahan Ekuitas, atau CALK belum tersedia. Sistem tidak menyatakan laporan patuh SAK secara otomatis.</Alert> : null}
    </section>

    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Lampiran laporan</h3><p className="text-caption text-fg-subtle">Dokumen pendukung versi laporan. PDF, XLSX, atau CSV; maksimal 100 MB.</p></div><Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Unggah lampiran</Button><input ref={fileRef} className="hidden" type="file" accept=".pdf,.xlsx,.csv" onChange={(event) => void uploadFile(event.target.files?.[0] ?? null)} /></div>
      {asset ? <div className="border-border bg-canvas flex items-center gap-3 rounded-lg border p-3"><FileText className="text-brand size-5" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{asset.original_filename}</p><p className="text-caption text-fg-subtle">{asset.mime_type} · {bytes(asset.byte_size)}</p></div><Button variant="ghost" disabled={busy} onClick={() => setAsset(null)}>Lepas</Button></div> : <p className="border-border text-fg-subtle rounded-lg border border-dashed p-4 text-sm">Belum ada lampiran. Lampiran wajib sebelum laporan masuk review.</p>}
    </section>

    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Rincian laporan keuangan</h3><p className="text-caption text-fg-subtle">Laba Rugi, Posisi Keuangan, Arus Kas, dan Perubahan Ekuitas berada dalam satu snapshot versi.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => addMissingTemplate(balanceSheetTemplate, 'Posisi Keuangan')}>Template posisi keuangan</Button><Button variant="secondary" disabled={busy} onClick={() => addMissingTemplate(equityTemplate, 'Perubahan Ekuitas')}>Template perubahan ekuitas</Button><Button variant="secondary" disabled={busy} onClick={() => setLines((current) => [...current, { statement: 'income', category: 'revenue', lineKey: `pos_${current.length + 1}`, label: '', amount: '', currency: 'IDR', note: '' }])}><Plus className="size-4" /> Tambah pos</Button></div></div>
      <p className="border-border bg-surface-subtle text-fg-subtle rounded-lg border p-3 text-sm">Nilai Rp0 dari template adalah nilai awal, bukan angka terverifikasi. Setiap pos wajib direkonsiliasi dengan data perusahaan sebelum review.</p>
      {lines.map((line, index) => <div key={`${line.lineKey}-${index}`} className="border-border grid gap-4 rounded-xl border p-4 lg:grid-cols-12">
        <Field className="lg:col-span-2" label="Jenis laporan" hint="Menentukan laporan utama tempat pos disajikan."><select value={line.statement} onChange={(e) => { const statement = e.target.value as LineItem['statement']; const category = lineCategories[statement][0]; setLines((all) => all.map((item, i) => i === index ? { ...item, statement, category } : item)) }} className="border-border bg-canvas h-10 rounded-lg border px-2">{Object.entries(statementLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field className="lg:col-span-2" label="Kategori" hint="Mengelompokkan pos untuk penyajian dan rekonsiliasi."><select value={line.category} onChange={(e) => setLines((all) => all.map((item,i) => i === index ? { ...item, category: e.target.value as LineItem['category'] } : item))} className="border-border bg-canvas h-10 rounded-lg border px-2">{lineCategories[line.statement].map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></Field>
        <Field className="lg:col-span-3" label="Nama pos" hint="Nama akun/pos yang akan dibaca Admin dan Investor."><Input value={line.label} onChange={(e) => setLines((all) => all.map((item,i) => i === index ? { ...item, label: e.target.value, lineKey: keyFromLabel(e.target.value,item.lineKey) } : item))} /></Field>
        <Field className="lg:col-span-2" label="Nilai" hint="Saldo/nilai periode berdasarkan data yang telah direkonsiliasi."><Input inputMode="decimal" value={line.amount} onChange={(e) => setLines((all) => all.map((item,i) => i === index ? { ...item, amount: e.target.value } : item))} /></Field>
        <Field className="lg:col-span-1" label="Mata uang" hint="Mata uang penyajian."><Input maxLength={3} value={line.currency} onChange={(e) => setLines((all) => all.map((item,i) => i === index ? { ...item, currency: e.target.value.toUpperCase() } : item))} /></Field>
        <Field className="lg:col-span-2" label="Keterangan" hint="Sumber, sifat pos, atau dasar rekonsiliasi."><Input value={line.note} onChange={(e) => setLines((all) => all.map((item,i) => i === index ? { ...item, note: e.target.value } : item))} /></Field>
        <div className="lg:col-span-12 flex justify-end"><Button aria-label={`Hapus pos ${index + 1}`} variant="ghost" onClick={() => setLines((all) => all.filter((_,i) => i !== index))}><Trash2 className="size-4" /> Hapus pos</Button></div>
      </div>)}
      {balanceLines.length ? <Alert tone={isBalanced ? 'success' : 'info'} title={isBalanced ? 'Posisi keuangan seimbang' : 'Posisi keuangan perlu rekonsiliasi'}>{hasIncompleteBalance ? 'Lengkapi nilai seluruh pos sebelum memeriksa persamaan akuntansi.' : <>Aset {formatIDR(totalAssets)} · Liabilitas + Ekuitas {formatIDR(totalLiabilitiesAndEquity)} · Selisih {formatIDR(balanceDifference)}. {isBalanced ? 'Persamaan Aset = Liabilitas + Ekuitas terpenuhi.' : 'Sistem tidak akan memaksa angka agar seimbang.'}</>}</Alert> : null}
    </section>

    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">KPI keuangan</h3><p className="text-caption text-fg-subtle">Indikator yang merangkum kinerja; nilai tidak menggantikan laporan utama.</p></div><Button variant="secondary" disabled={busy} onClick={() => setKpis((current) => [...current, { kpiKey: `kpi_${current.length + 1}`, label: '', value: '', unit: 'percent', basis: 'reported' }])}><Plus className="size-4" /> Tambah KPI</Button></div>
      {kpis.map((kpi,index) => <div key={`${kpi.kpiKey}-${index}`} className="border-border grid gap-4 rounded-xl border p-4 lg:grid-cols-12">
        <Field className="lg:col-span-4" label="Nama KPI" hint="Nama indikator yang mudah dipahami dan konsisten antarperiode."><Input value={kpi.label} onChange={(e) => setKpis((all) => all.map((item,i) => i === index ? { ...item, label: e.target.value, kpiKey: keyFromLabel(e.target.value,item.kpiKey) } : item))} /></Field>
        <Field className="lg:col-span-2" label="Nilai KPI" hint="Nilai indikator untuk periode laporan."><Input inputMode="decimal" value={kpi.value} onChange={(e) => setKpis((all) => all.map((item,i) => i === index ? { ...item, value: e.target.value } : item))} /></Field>
        <Field className="lg:col-span-2" label="Unit" hint="Satuan yang menentukan cara nilai ditampilkan."><select value={kpi.unit} onChange={(e) => setKpis((all) => all.map((item,i) => i === index ? { ...item, unit: e.target.value as Kpi['unit'] } : item))} className="border-border bg-canvas h-10 rounded-lg border px-2"><option value="percent">Persen</option><option value="currency">Mata uang</option><option value="count">Jumlah</option><option value="ratio">Rasio</option><option value="days">Hari</option></select></Field>
        <Field className="lg:col-span-3" label="Dasar KPI" hint="Dilaporkan = angka sumber; Dihitung = hasil formula dari data laporan."><select value={kpi.basis} onChange={(e) => setKpis((all) => all.map((item,i) => i === index ? { ...item, basis: e.target.value as Kpi['basis'] } : item))} className="border-border bg-canvas h-10 rounded-lg border px-2"><option value="reported">Dilaporkan</option><option value="derived">Dihitung sistem</option></select></Field>
        <div className="flex items-end"><Button aria-label={`Hapus KPI ${index + 1}`} variant="ghost" onClick={() => setKpis((all) => all.filter((_,i) => i !== index))}><Trash2 className="size-4" /></Button></div>
      </div>)}
    </section>

    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Catatan atas Laporan Keuangan (CALK)</h3><p className="text-caption text-fg-subtle">Pengungkapan faktual yang menjelaskan kebijakan, rincian pos, estimasi, pihak berelasi, kejadian setelah periode, atau informasi material lain.</p></div><Button variant="secondary" disabled={busy} onClick={() => setDisclosures((current) => [...current, { disclosureKey: `catatan_${current.length + 1}`, title: '', content: '' }])}><Plus className="size-4" /> Tambah catatan</Button></div>
      <Alert tone="info" title="CALK bukan konten otomatis">Isi CALK harus berasal dari fakta dan kebijakan perusahaan yang telah direview. Sistem tidak membuat klaim akuntansi atau disclosure secara otomatis.</Alert>
      {disclosures.map((item,index) => <div key={`${item.disclosureKey}-${index}`} className="border-border grid gap-4 rounded-xl border p-4">
        <Field label="Judul catatan" hint="Contoh: Kebijakan pengakuan pendapatan, Piutang usaha, Pihak berelasi, atau Peristiwa setelah periode pelaporan."><Input value={item.title} onChange={(e) => setDisclosures((all) => all.map((entry,i) => i === index ? { ...entry, title: e.target.value, disclosureKey: keyFromLabel(e.target.value,entry.disclosureKey) } : entry))} /></Field>
        <Field label="Isi catatan" hint="Tuliskan informasi faktual, basis pengukuran, rekonsiliasi, ketidakpastian, dan pengungkapan relevan secara cukup untuk pembaca laporan."><Textarea rows={6} value={item.content} onChange={(e) => setDisclosures((all) => all.map((entry,i) => i === index ? { ...entry, content: e.target.value } : entry))} /></Field>
        <div className="flex justify-end"><Button variant="ghost" onClick={() => setDisclosures((all) => all.filter((_,i) => i !== index))}><Trash2 className="size-4" /> Hapus catatan</Button></div>
      </div>)}
    </section>

    {message ? <Alert tone={message.tone} title={message.tone === 'success' ? 'Tersimpan' : 'Belum tersimpan'}>{message.text}</Alert> : null}
    <div className="flex justify-end"><Button loading={busy} onClick={save}>Simpan snapshot laporan</Button></div>
  </div>
}
