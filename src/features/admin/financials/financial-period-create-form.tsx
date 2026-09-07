'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createFinancialPeriod } from '@/server/financials/period-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'

export function FinancialPeriodCreateForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const [periodIndex, setPeriodIndex] = useState(1)
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [currency, setCurrency] = useState('IDR')

  const maxIndex = periodType === 'monthly' ? 12 : periodType === 'quarterly' ? 4 : 1

  function submit() {
    if (pending || !startsOn || !endsOn) return
    setError(null)
    startTransition(async () => {
      const result = await createFinancialPeriod({
        periodType,
        fiscalYear,
        periodIndex,
        startsOn,
        endsOn,
        currency: currency.toUpperCase(),
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push('/admin/financials/periods')
      router.refresh()
    })
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Jenis periode</span>
          <select value={periodType} onChange={(e) => { const next = e.target.value as typeof periodType; setPeriodType(next); setPeriodIndex(1) }} className="border-border bg-canvas h-10 rounded-lg border px-3">
            <option value="monthly">Bulanan</option>
            <option value="quarterly">Kuartalan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </label>
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Tahun fiskal</span>
          <Input type="number" min={2000} max={2100} value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} />
        </label>
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Indeks periode</span>
          <Input type="number" min={1} max={maxIndex} value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-body-sm text-fg grid gap-1.5"><span>Mulai</span><Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></label>
        <label className="text-body-sm text-fg grid gap-1.5"><span>Selesai</span><Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></label>
      </div>
      <label className="text-body-sm text-fg grid gap-1.5 sm:max-w-xs"><span>Mata uang</span><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></label>
      {error ? <Alert tone="danger" title="Periode tidak dapat dibuat">{error}</Alert> : null}
      <div className="flex justify-end"><Button loading={pending} disabled={!startsOn || !endsOn || periodIndex < 1 || periodIndex > maxIndex} onClick={submit}>Buat periode</Button></div>
    </div>
  )
}
