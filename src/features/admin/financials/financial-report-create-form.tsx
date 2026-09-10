'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createFinancialReport } from '@/server/financials/report-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input, Textarea } from '@/ui/input'

type PeriodOption = {
  id: string
  label: string
  status: string
}

export function FinancialReportCreateForm({ periods }: { periods: readonly PeriodOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [visibility, setVisibility] = useState<'investors' | 'internal'>('investors')
  const [source, setSource] = useState<'internal' | 'reviewed' | 'audited'>('internal')
  const [preparedBy, setPreparedBy] = useState('')
  const [notes, setNotes] = useState('')

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
    <div className="grid gap-5">
      <Alert tone="info" title="Laporan akan diisi dari transaksi">
        Saat laporan dibuat, sistem akan mencoba mengisi pos keuangan dan KPI dari invoice, pembayaran, refund, pengeluaran, dan pax pada periode yang dipilih. Admin tetap dapat meninjau dan merevisi draft sebelum diterbitkan.
      </Alert>
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Periode keuangan</span>
        <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="border-border bg-canvas h-10 rounded-lg border px-3">
          {periods.map((period) => <option key={period.id} value={period.id}>{period.label} · {period.status}</option>)}
        </select>
      </label>
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Judul laporan</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Contoh: Laporan Keuangan Kuartal III 2026" />
      </label>
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Ringkasan</span>
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={1000} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Visibilitas</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'investors' | 'internal')} className="border-border bg-canvas h-10 rounded-lg border px-3">
            <option value="investors">Investor</option>
            <option value="internal">Internal Admin</option>
          </select>
        </label>
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Sumber</span>
          <select value={source} onChange={(e) => setSource(e.target.value as 'internal' | 'reviewed' | 'audited')} className="border-border bg-canvas h-10 rounded-lg border px-3">
            <option value="internal">Internal</option>
            <option value="reviewed">Reviewed</option>
            <option value="audited">Audited</option>
          </select>
        </label>
      </div>
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Disiapkan oleh</span>
        <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} maxLength={200} />
      </label>
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Catatan versi</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
      </label>
      {error ? <Alert tone="danger" title="Laporan tidak dapat dibuat">{error}</Alert> : null}
      <div className="flex justify-end">
        <Button loading={pending} disabled={!periodId || !title.trim()} onClick={submit}>Buat laporan dari transaksi</Button>
      </div>
    </div>
  )
}
