'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createOwnershipSaleRequestAction } from '@/server/ownership/transfer-actions'

type Props = {
  holdingId: string
  offeringName: string
  availableUnits: number
  referenceUnitPrice: number
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function SellSharesForm({
  holdingId,
  offeringName,
  availableUnits,
  referenceUnitPrice,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState(1)
  const [unitPrice, setUnitPrice] = useState(referenceUnitPrice)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (availableUnits <= 0) {
    return (
      <div className="text-body-sm text-fg-subtle">
        Seluruh unit tersedia sedang berada dalam proses penjualan.
      </div>
    )
  }

  const total = units * unitPrice

  function submit() {
    setError(null)

    startTransition(async () => {
      const result = await createOwnershipSaleRequestAction({
        holdingId,
        units,
        requestedUnitPrice: unitPrice,
        notes: notes.trim() || undefined,
      })

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      setOpen(false)
      setUnits(1)
      setUnitPrice(referenceUnitPrice)
      setNotes('')
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 py-2 text-body-sm font-semibold transition hover:bg-surface-subtle"
      >
        Jual Saham
      </button>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-subtle p-4">
      <div className="font-semibold">Ajukan Penjualan Saham</div>
      <div className="text-body-sm mt-1 text-fg-subtle">
        {offeringName} · Maksimal {availableUnits.toLocaleString('id-ID')} unit
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-body-sm font-medium">Jumlah unit</span>
          <input
            type="number"
            min={1}
            max={availableUnits}
            value={units}
            onChange={(event) =>
              setUnits(
                Math.max(
                  1,
                  Math.min(
                    availableUnits,
                    Number(event.target.value) || 1,
                  ),
                ),
              )
            }
            className="min-h-10 rounded-lg border border-border bg-surface px-3"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-body-sm font-medium">
            Harga penawaran per unit
          </span>
          <input
            type="number"
            min={1}
            value={unitPrice}
            onChange={(event) =>
              setUnitPrice(Math.max(1, Number(event.target.value) || 1))
            }
            className="min-h-10 rounded-lg border border-border bg-surface px-3"
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-body-sm font-medium">Catatan opsional</span>
        <textarea
          value={notes}
          maxLength={5000}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </label>

      <div className="text-body-sm mt-4 flex flex-wrap justify-between gap-3">
        <span className="text-fg-subtle">Nilai pengajuan</span>
        <strong>{formatRupiah(total)}</strong>
      </div>

      {error ? (
        <div className="text-body-sm mt-3 text-danger">{error}</div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-fg px-4 py-2 text-body-sm font-semibold text-bg disabled:opacity-50"
        >
          {isPending ? 'Mengirim…' : 'Ajukan Penjualan'}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => setOpen(false)}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 py-2 text-body-sm font-semibold"
        >
          Batal
        </button>
      </div>
    </div>
  )
}
