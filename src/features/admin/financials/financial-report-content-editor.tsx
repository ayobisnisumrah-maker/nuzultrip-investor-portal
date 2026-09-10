'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Plus, Trash2, Upload } from 'lucide-react'

import { saveFinancialReportContent } from '@/server/financials/report-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'

type LineItem = {
  statement: 'income' | 'balance' | 'cash_flow'
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

type Asset = { id: string; original_filename: string; mime_type: string; byte_size: number }

const lineCategories: Record<LineItem['statement'], LineItem['category'][]> = {
  income: ['revenue', 'expense'],
  balance: ['asset', 'liability', 'equity'],
  cash_flow: ['operating', 'investing', 'financing'],
}

function keyFromLabel(value: string, fallback: string) {
  const key = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return /^[a-z]/.test(key) ? key.slice(0, 80) : fallback
}

function bytes(value: number) {
  return value < 1024 * 1024
    ? `${Math.ceil(value / 1024)} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function FinancialReportContentEditor({
  reportId,
  initialLines,
  initialKpis,
  initialAsset,
}: {
  reportId: string
  initialLines: LineItem[]
  initialKpis: Kpi[]
  initialAsset: Asset | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [lines, setLines] = useState(initialLines)
  const [kpis, setKpis] = useState(initialKpis)
  const [asset, setAsset] = useState(initialAsset)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  function addLine() {
    setLines((current) => [
      ...current,
      {
        statement: 'income',
        category: 'revenue',
        lineKey: `pos_${current.length + 1}`,
        label: '',
        amount: '',
        currency: 'IDR',
        note: '',
      },
    ])
  }

  function addKpi() {
    setKpis((current) => [
      ...current,
      {
        kpiKey: `kpi_${current.length + 1}`,
        label: '',
        value: '',
        unit: 'percent',
        basis: 'reported',
      },
    ])
  }

  async function uploadFile(file: File | null) {
    if (!file) return
    setMessage(null)
    setUploading(true)
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('purpose', 'financial-report')
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body: data })
      const payload = (await response.json()) as { ok?: boolean; asset?: Asset; error?: string }
      if (!response.ok || !payload.ok || !payload.asset)
        throw new Error(payload.error || 'Lampiran gagal diunggah.')
      setAsset(payload.asset)
      setMessage({
        tone: 'success',
        text: 'Lampiran berhasil diunggah. Klik Simpan isi laporan untuk mengaitkannya.',
      })
    } catch (error) {
      setMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Lampiran gagal diunggah.',
      })
    } finally {
      setUploading(false)
    }
  }

  function save() {
    setMessage(null)
    const normalizedLines = lines.map((item, index) => ({
      ...item,
      lineKey: keyFromLabel(item.lineKey || item.label, `pos_${index + 1}`),
      amount: Number(item.amount),
    }))
    const normalizedKpis = kpis.map((item, index) => ({
      ...item,
      kpiKey: keyFromLabel(item.kpiKey || item.label, `kpi_${index + 1}`),
      value: Number(item.value),
    }))
    if (
      lines.some((item) => !item.label.trim() || !item.amount.trim()) ||
      kpis.some((item) => !item.label.trim() || !item.value.trim()) ||
      normalizedLines.some((item) => !Number.isFinite(item.amount)) ||
      normalizedKpis.some((item) => !Number.isFinite(item.value))
    ) {
      setMessage({
        tone: 'danger',
        text: 'Lengkapi label dan nilai angka pada semua pos serta KPI.',
      })
      return
    }
    startTransition(async () => {
      const result = await saveFinancialReportContent({
        reportId,
        documentAssetId: asset?.id ?? null,
        lineItems: normalizedLines,
        kpis: normalizedKpis,
      })
      setMessage(
        result.ok
          ? { tone: 'success', text: 'Isi laporan, KPI, dan lampiran berhasil disimpan.' }
          : { tone: 'danger', text: result.error.message },
      )
    })
  }

  const busy = pending || uploading

  return (
    <div className="grid gap-7">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Lampiran laporan</h3>
            <p className="text-caption text-fg-subtle">PDF, XLSX, atau CSV; maksimal 100 MB.</p>
          </div>
          <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Unggah lampiran
          </Button>
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept=".pdf,.xlsx,.csv"
            onChange={(event) => void uploadFile(event.target.files?.[0] ?? null)}
          />
        </div>
        {asset ? (
          <div className="border-border bg-canvas flex items-center gap-3 rounded-lg border p-3">
            <FileText className="text-brand size-5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{asset.original_filename}</p>
              <p className="text-caption text-fg-subtle">
                {asset.mime_type} · {bytes(asset.byte_size)}
              </p>
            </div>
            <Button variant="ghost" disabled={busy} onClick={() => setAsset(null)}>
              Lepas
            </Button>
          </div>
        ) : (
          <p className="border-border text-fg-subtle rounded-lg border border-dashed p-4 text-sm">
            Belum ada lampiran. Lampiran wajib sebelum dikirim untuk ditinjau.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Rincian pos keuangan</h3>
            <p className="text-caption text-fg-subtle">Laba rugi, neraca, dan arus kas.</p>
          </div>
          <Button variant="secondary" onClick={addLine}>
            <Plus className="size-4" /> Tambah pos
          </Button>
        </div>
        {lines.map((line, index) => (
          <div
            key={index}
            className="border-border grid gap-3 rounded-xl border p-4 lg:grid-cols-12"
          >
            <select
              aria-label={`Jenis laporan pos ${index + 1}`}
              value={line.statement}
              onChange={(e) => {
                const statement = e.target.value as LineItem['statement']
                const category = lineCategories[statement][0] as LineItem['category']
                setLines((all) =>
                  all.map((item, i) => (i === index ? { ...item, statement, category } : item)),
                )
              }}
              className="border-border bg-canvas h-10 rounded-lg border px-2 lg:col-span-2"
            >
              <option value="income">Laba rugi</option>
              <option value="balance">Neraca</option>
              <option value="cash_flow">Arus kas</option>
            </select>
            <select
              aria-label={`Kategori pos ${index + 1}`}
              value={line.category}
              onChange={(e) =>
                setLines((all) =>
                  all.map((item, i) =>
                    i === index
                      ? { ...item, category: e.target.value as LineItem['category'] }
                      : item,
                  ),
                )
              }
              className="border-border bg-canvas h-10 rounded-lg border px-2 lg:col-span-2"
            >
              {lineCategories[line.statement].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <Input
              aria-label={`Nama pos ${index + 1}`}
              placeholder="Nama pos"
              value={line.label}
              onChange={(e) =>
                setLines((all) =>
                  all.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          label: e.target.value,
                          lineKey: keyFromLabel(e.target.value, item.lineKey),
                        }
                      : item,
                  ),
                )
              }
              className="lg:col-span-3"
            />
            <Input
              aria-label={`Nilai pos ${index + 1}`}
              inputMode="decimal"
              placeholder="Nilai"
              value={line.amount}
              onChange={(e) =>
                setLines((all) =>
                  all.map((item, i) => (i === index ? { ...item, amount: e.target.value } : item)),
                )
              }
              className="lg:col-span-2"
            />
            <Input
              aria-label={`Mata uang pos ${index + 1}`}
              maxLength={3}
              value={line.currency}
              onChange={(e) =>
                setLines((all) =>
                  all.map((item, i) =>
                    i === index ? { ...item, currency: e.target.value.toUpperCase() } : item,
                  ),
                )
              }
              className="lg:col-span-1"
            />
            <Input
              aria-label={`Catatan pos ${index + 1}`}
              placeholder="Catatan"
              value={line.note}
              onChange={(e) =>
                setLines((all) =>
                  all.map((item, i) => (i === index ? { ...item, note: e.target.value } : item)),
                )
              }
              className="lg:col-span-1"
            />
            <Button
              aria-label={`Hapus pos ${index + 1}`}
              variant="ghost"
              onClick={() => setLines((all) => all.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">KPI keuangan</h3>
            <p className="text-caption text-fg-subtle">
              Indikator utama yang akan terlihat jelas oleh investor.
            </p>
          </div>
          <Button variant="secondary" onClick={addKpi}>
            <Plus className="size-4" /> Tambah KPI
          </Button>
        </div>
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="border-border grid gap-3 rounded-xl border p-4 lg:grid-cols-12"
          >
            <Input
              aria-label={`Nama KPI ${index + 1}`}
              placeholder="Contoh: Margin laba bersih"
              value={kpi.label}
              onChange={(e) =>
                setKpis((all) =>
                  all.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          label: e.target.value,
                          kpiKey: keyFromLabel(e.target.value, item.kpiKey),
                        }
                      : item,
                  ),
                )
              }
              className="lg:col-span-4"
            />
            <Input
              aria-label={`Nilai KPI ${index + 1}`}
              inputMode="decimal"
              placeholder="Nilai"
              value={kpi.value}
              onChange={(e) =>
                setKpis((all) =>
                  all.map((item, i) => (i === index ? { ...item, value: e.target.value } : item)),
                )
              }
              className="lg:col-span-2"
            />
            <select
              aria-label={`Unit KPI ${index + 1}`}
              value={kpi.unit}
              onChange={(e) =>
                setKpis((all) =>
                  all.map((item, i) =>
                    i === index ? { ...item, unit: e.target.value as Kpi['unit'] } : item,
                  ),
                )
              }
              className="border-border bg-canvas h-10 rounded-lg border px-2 lg:col-span-2"
            >
              <option value="percent">Persen</option>
              <option value="currency">Mata uang</option>
              <option value="count">Jumlah</option>
              <option value="ratio">Rasio</option>
              <option value="days">Hari</option>
            </select>
            <select
              aria-label={`Dasar KPI ${index + 1}`}
              value={kpi.basis}
              onChange={(e) =>
                setKpis((all) =>
                  all.map((item, i) =>
                    i === index ? { ...item, basis: e.target.value as Kpi['basis'] } : item,
                  ),
                )
              }
              className="border-border bg-canvas h-10 rounded-lg border px-2 lg:col-span-3"
            >
              <option value="reported">Dilaporkan</option>
              <option value="derived">Dihitung sistem</option>
            </select>
            <Button
              aria-label={`Hapus KPI ${index + 1}`}
              variant="ghost"
              onClick={() => setKpis((all) => all.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </section>

      {message ? (
        <Alert
          tone={message.tone}
          title={message.tone === 'success' ? 'Tersimpan' : 'Belum tersimpan'}
        >
          {message.text}
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button loading={busy} onClick={save}>
          Simpan isi laporan
        </Button>
      </div>
    </div>
  )
}
