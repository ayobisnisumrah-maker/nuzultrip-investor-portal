'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createFinancialReport } from '@/server/financials/report-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input, Textarea } from '@/ui/input'

type PeriodOption = {
  id: string
  periodType: string
  fiscalYear: number
  periodIndex: number
  startsOn: string
  endsOn: string
  currency: string
  label: string
  status: string
}

function reportTitle(period: PeriodOption) {
  const type = period.periodType.trim().toLowerCase()
  if (type === 'monthly') return `Laporan Keuangan Bulanan ${period.fiscalYear}/${period.periodIndex}`
  if (type === 'quarterly') return `Laporan Keuangan Kuartal ${period.periodIndex} ${period.fiscalYear}`
  if (type === 'annual') return `Laporan Keuangan Tahunan ${period.fiscalYear}`
  return `Laporan Keuangan ${period.fiscalYear}/${period.periodIndex}`
}

function reportSummary(period: PeriodOption) {
  return `Ringkasan kinerja keuangan dan operasional periode ${period.startsOn} sampai ${period.endsOn}. Angka awal disusun otomatis dari invoice, pembayaran, refund, pengeluaran, piutang, serta jumlah pax yang tercatat pada Kasir & Invoice, kemudian ditinjau sebelum diterbitkan kepada investor.`
}

export function FinancialReportCreateForm({ periods }: { periods: readonly PeriodOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? '')
  const initialPeriod = periods[0]
  const [title, setTitle] = useState(initialPeriod ? reportTitle(initialPeriod) : '')
  const [summary, setSummary] = useState(initialPeriod ? reportSummary(initialPeriod) : '')
  const [visibility, setVisibility] = useState<'investors' | 'internal'>('investors')
  const [source, setSource] = useState<'internal' | 'reviewed' | 'audited'>('internal')
  const [preparedBy, setPreparedBy] = useState('Tim Keuangan Nuzultrip')
  const [notes, setNotes] = useState('Draft awal disusun otomatis dari transaksi operasional dan wajib ditinjau sebelum dikirim kepada investor.')

  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === periodId) ?? periods[0],
    [periodId, periods],
  )

  function changePeriod(nextId: string) {
    setPeriodId(nextId)
    const next = periods.find((period) => period.id === nextId)
    if (!next) return
    setTitle(reportTitle(next))
    setSummary(reportSummary(next))
  }

  function submit() {
    if (pending || !periodId || !title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createFinancialReport({
        financialPeriodId: periodId,
        title: title.trim(),
        ...(summary.trim() ? { summary: summary.trim() } : {}),
        visibility,
        source,
        ...(preparedBy.trim() ? { preparedBy: preparedBy.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push(`/admin/financials/reports/${result.data.reportId}`)
      router.refresh()
    })
  }

  if (!periods.length) {
    return (
      <Alert tone="info" title="Buat periode keuangan terlebih dahulu">
        Laporan keuangan harus terhubung ke satu periode. Buat periode dari menu Periode Keuangan sebelum membuat laporan.
      </Alert>
    )
  }

  return (
    <div className="grid gap-6">
      <Alert tone="info" title="Sebagian besar laporan dibuat otomatis">
        Sistem mengambil transaksi Kasir & Invoice untuk membentuk pendapatan, refund, pengeluaran, arus kas, piutang, jumlah invoice, jumlah pax, dan KPI. Setelah draft terbentuk, Admin cukup memeriksa angka, menambah penyesuaian yang belum berasal dari transaksi, melampirkan dokumen pendukung, lalu mengirimkannya ke tahap review.
      </Alert>

      <div className="grid gap-4 rounded-xl border border-border bg-canvas-subtle p-4 sm:grid-cols-4">
        <div><p className="text-caption text-fg-subtle">1. Pilih periode</p><p className="mt-1 text-body-sm font-semibold">Bulan/kuartal/tahun</p></div>
        <div><p className="text-caption text-fg-subtle">2. Sistem hitung</p><p className="mt-1 text-body-sm font-semibold">Transaksi & KPI</p></div>
        <div><p className="text-caption text-fg-subtle">3. Admin review</p><p className="mt-1 text-body-sm font-semibold">Revisi seperlunya</p></div>
        <div><p className="text-caption text-fg-subtle">4. Kirim investor</p><p className="mt-1 text-body-sm font-semibold">Setelah disetujui</p></div>
      </div>

      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Periode keuangan</span>
        <select value={periodId} onChange={(e) => changePeriod(e.target.value)} className="border-border bg-canvas h-10 rounded-lg border px-3">
          {periods.map((period) => <option key={period.id} value={period.id}>{period.label} · {period.status}</option>)}
        </select>
        {selectedPeriod ? <span className="text-caption text-fg-subtle">Mata uang: {selectedPeriod.currency} · {selectedPeriod.startsOn} s.d. {selectedPeriod.endsOn}</span> : null}
      </label>

      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Judul laporan</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </label>

      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Ringkasan untuk investor</span>
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={1000} />
        <span className="text-caption text-fg-subtle">Ringkasan ini tampil sebagai konteks utama laporan. Admin dapat menyempurnakannya setelah angka otomatis terbentuk.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Disiapkan oleh</span>
          <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} maxLength={200} />
        </label>
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Visibilitas</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'investors' | 'internal')} className="border-border bg-canvas h-10 rounded-lg border px-3">
            <option value="investors">Investor</option>
            <option value="internal">Internal Admin</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Status sumber</span>
          <select value={source} onChange={(e) => setSource(e.target.value as 'internal' | 'reviewed' | 'audited')} className="border-border bg-canvas h-10 rounded-lg border px-3">
            <option value="internal">Internal — belum direview</option>
            <option value="reviewed">Reviewed — sudah ditinjau</option>
            <option value="audited">Audited — telah diaudit</option>
          </select>
        </label>
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Catatan versi</span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
        </label>
      </div>

      {error ? <Alert tone="danger" title="Laporan tidak dapat dibuat">{error}</Alert> : null}
      <div className="flex justify-end">
        <Button loading={pending} disabled={!periodId || !title.trim()} onClick={submit}>Buat & isi laporan otomatis</Button>
      </div>
    </div>
  )
}
