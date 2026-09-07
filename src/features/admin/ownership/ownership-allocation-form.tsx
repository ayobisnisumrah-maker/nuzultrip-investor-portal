'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createOwnershipHoldingAction } from '@/server/ownership/holding-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input, Textarea } from '@/ui/input'
import { useToast } from '@/ui/toast'

type InvestorOption = {
  id: string
  label: string
  referenceCode: string
}

export function OwnershipAllocationForm({
  offeringId,
  remainingUnits,
  unitOwnershipBps,
  investors,
}: {
  offeringId: string
  remainingUnits: number
  unitOwnershipBps: number
  investors: InvestorOption[]
}) {
  const router = useRouter()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [investorId, setInvestorId] = useState(investors[0]?.id ?? '')
  const [units, setUnits] = useState('1')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const numericUnits = Number(units)
  const ownershipPercent =
    Number.isInteger(numericUnits) && numericUnits > 0
      ? (numericUnits * unitOwnershipBps) / 100
      : 0

  function submit() {
    if (pending) return
    setError(null)

    if (!investorId) {
      setError('Pilih investor yang akan menerima alokasi.')
      return
    }

    if (!Number.isInteger(numericUnits) || numericUnits <= 0) {
      setError('Jumlah unit harus berupa bilangan bulat lebih dari 0.')
      return
    }

    if (numericUnits > remainingUnits) {
      setError(`Jumlah unit melebihi sisa penawaran (${remainingUnits} unit).`)
      return
    }

    startTransition(async () => {
      const result = await createOwnershipHoldingAction({
        offering_id: offeringId,
        investor_id: investorId,
        units: numericUnits,
        acquisition_reference: reference || undefined,
        notes: notes || undefined,
      })

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      setUnits('1')
      setReference('')
      setNotes('')
      push({
        tone: 'success',
        title: 'Kepemilikan dialokasikan',
        description: 'Unit investor telah dicatat sebagai kepemilikan aktif.',
      })
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <Alert tone="danger" title="Alokasi tidak dapat disimpan">
          {error}
        </Alert>
      ) : null}

      <label className="grid gap-1.5 text-body-sm">
        <span className="font-medium text-fg">Investor</span>
        <select
          value={investorId}
          onChange={(event) => setInvestorId(event.target.value)}
          disabled={pending || investors.length === 0}
          className="border-border-strong bg-surface text-fg h-11 rounded-md border px-3 text-sm outline-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring"
        >
          {investors.length === 0 ? <option value="">Tidak ada investor aktif</option> : null}
          {investors.map((investor) => (
            <option key={investor.id} value={investor.id}>
              {investor.label} · {investor.referenceCode}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-body-sm">
          <span className="font-medium text-fg">Jumlah unit</span>
          <Input
            type="number"
            min={1}
            max={remainingUnits}
            step={1}
            value={units}
            onChange={(event) => setUnits(event.target.value)}
            disabled={pending || remainingUnits <= 0}
          />
          <span className="text-caption text-fg-subtle">
            Sisa {remainingUnits.toLocaleString('id-ID')} unit.
          </span>
        </label>

        <div className="border-border bg-sunken rounded-lg border p-3">
          <div className="text-caption text-fg-subtle">Porsi hasil alokasi</div>
          <div className="text-heading-md mt-1 font-semibold tabular text-fg">
            {ownershipPercent.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%
          </div>
          <div className="text-caption mt-1 text-fg-subtle">
            {unitOwnershipBps / 100}% per unit
          </div>
        </div>
      </div>

      <label className="grid gap-1.5 text-body-sm">
        <span className="font-medium text-fg">Referensi akuisisi</span>
        <Input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          maxLength={255}
          placeholder="Contoh: INV-2026-001"
          disabled={pending}
        />
      </label>

      <label className="grid gap-1.5 text-body-sm">
        <span className="font-medium text-fg">Catatan</span>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={5000}
          placeholder="Catatan internal terkait alokasi ini."
          disabled={pending}
        />
      </label>

      <div>
        <Button
          variant="primary"
          loading={pending}
          disabled={investors.length === 0 || remainingUnits <= 0}
          onClick={submit}
        >
          Alokasikan Kepemilikan
        </Button>
      </div>
    </div>
  )
}
