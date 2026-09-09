'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { FinancialPeriodType } from '@/core/financials/periods'
import { updateFinancialPeriod } from '@/server/financials/period-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'

type Props = {
  period: {
    id: string
    period_type: FinancialPeriodType
    fiscal_year: number
    period_index: number
    starts_on: string
    ends_on: string
    currency: string
  }
}

export function FinancialPeriodEditForm({ period }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [periodType, setPeriodType] = useState<FinancialPeriodType>(period.period_type)
  const [fiscalYear, setFiscalYear] = useState(period.fiscal_year)
  const [periodIndex, setPeriodIndex] = useState(period.period_index)
  const [startsOn, setStartsOn] = useState(period.starts_on)
  const [endsOn, setEndsOn] = useState(period.ends_on)
  const [currency, setCurrency] = useState(period.currency)

  const maxIndex = periodType === 'monthly' ? 12 : periodType === 'quarterly' ? 4 : 1

  function submit() {
    if (pending || !startsOn || !endsOn) return
    setError(null)

    startTransition(async () => {
      const result = await updateFinancialPeriod({
        periodId: period.id,
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

      router.push(`/admin/financials/periods/${period.id}`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Jenis periode</span>
          <select
            value={periodType}
            onChange={(event) => {
              const next = event.target.value as FinancialPeriodType
              setPeriodType(next)
              setPeriodIndex(1)
            }}
            className="border-border bg-canvas h-10 rounded-lg border px-3"
          >
            <option value="monthly">Bulanan</option>
            <option value="quarterly">Kuartalan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </label>

        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Tahun fiskal</span>
          <Input
            type="number"
            min={2000}
            max={2100}
            value={fiscalYear}
            onChange={(event) => setFiscalYear(Number(event.target.value))}
          />
        </label>

        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Indeks periode</span>
          <Input
            type="number"
            min={1}
            max={maxIndex}
            value={periodIndex}
            onChange={(event) => setPeriodIndex(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Mulai</span>
          <Input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} />
        </label>
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Selesai</span>
          <Input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
        </label>
      </div>

      <label className="text-body-sm text-fg grid gap-1.5 sm:max-w-xs">
        <span>Mata uang</span>
        <Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} />
      </label>

      {error ? <Alert tone="danger" title="Periode tidak dapat diperbarui">{error}</Alert> : null}

      <div className="flex justify-end">
        <Button
          loading={pending}
          disabled={!startsOn || !endsOn || periodIndex < 1 || periodIndex > maxIndex}
          onClick={submit}
        >
          Simpan perubahan
        </Button>
      </div>
    </div>
  )
}
