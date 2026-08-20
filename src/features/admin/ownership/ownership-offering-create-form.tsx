'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createOwnershipOffering } from '@/server/ownership/offering-actions'

function toIsoDate(value: string) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function OwnershipOfferingCreateForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [totalOfferedPercent, setTotalOfferedPercent] = useState('')
  const [unitOwnershipPercent, setUnitOwnershipPercent] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [totalUnits, setTotalUnits] = useState('')
  const [distributionCadenceMonths, setDistributionCadenceMonths] =
    useState('6')
  const [transferLockMonths, setTransferLockMonths] = useState('36')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveUntil, setEffectiveUntil] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  function normalizeCode(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function submit() {
    if (pending) return

    setError(null)

    const parsedTotalOfferedPercent =
      Number(totalOfferedPercent)

    const parsedUnitOwnershipPercent =
      Number(unitOwnershipPercent)

    const parsedUnitPrice =
      Number(unitPrice)

    const parsedTotalUnits =
      Number(totalUnits)

    const parsedCadence =
      Number(distributionCadenceMonths)

    const parsedTransferLock =
      Number(transferLockMonths)

    if (!name.trim()) {
      setError('Nama penawaran wajib diisi.')
      return
    }

    if (!code.trim()) {
      setError('Kode penawaran wajib diisi.')
      return
    }

    if (
      !Number.isFinite(parsedTotalOfferedPercent) ||
      parsedTotalOfferedPercent <= 0 ||
      parsedTotalOfferedPercent > 100
    ) {
      setError('Total kepemilikan yang ditawarkan harus antara 0% dan 100%.')
      return
    }

    if (
      !Number.isFinite(parsedUnitOwnershipPercent) ||
      parsedUnitOwnershipPercent <= 0 ||
      parsedUnitOwnershipPercent > 100
    ) {
      setError('Kepemilikan per unit harus antara 0% dan 100%.')
      return
    }

    if (
      !Number.isFinite(parsedUnitPrice) ||
      parsedUnitPrice <= 0
    ) {
      setError('Harga per unit harus lebih besar dari 0.')
      return
    }

    if (
      !Number.isInteger(parsedTotalUnits) ||
      parsedTotalUnits <= 0
    ) {
      setError('Total unit harus berupa bilangan bulat lebih besar dari 0.')
      return
    }

    if (
      !Number.isInteger(parsedCadence) ||
      parsedCadence < 1 ||
      parsedCadence > 24
    ) {
      setError('Periode distribusi harus antara 1 sampai 24 bulan.')
      return
    }

    if (
      !Number.isInteger(parsedTransferLock) ||
      parsedTransferLock < 36 ||
      parsedTransferLock > 120
    ) {
      setError('Periode lock harus antara 36 sampai 120 bulan.')
      return
    }

    if (
      effectiveFrom &&
      effectiveUntil &&
      new Date(`${effectiveUntil}T00:00:00`) <=
        new Date(`${effectiveFrom}T00:00:00`)
    ) {
      setError('Tanggal berakhir harus setelah tanggal mulai.')
      return
    }

    startTransition(async () => {
      try {
        const result = await createOwnershipOffering({
          name: name.trim(),
          code: normalizeCode(code),
          total_offered_bps: Math.round(
            parsedTotalOfferedPercent * 100,
          ),
          unit_ownership_bps: Math.round(
            parsedUnitOwnershipPercent * 100,
          ),
          unit_price: parsedUnitPrice,
          total_units: parsedTotalUnits,
          distribution_cadence_months: parsedCadence,
          transfer_lock_months: parsedTransferLock,
          effective_from: toIsoDate(effectiveFrom),
          effective_until: toIsoDate(effectiveUntil),
          description: description.trim() || null,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        router.push('/admin/ownership/offerings')
        router.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Gagal membuat penawaran kepemilikan.',
        )
      }
    })
  }

  return (
    <section className="max-w-5xl space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="grid gap-5 md:grid-cols-2">

          <div className="md:col-span-2">
            <label
              htmlFor="ownership-offering-name"
              className="text-sm font-medium text-fg"
            >
              Nama Penawaran
            </label>

            <input
              id="ownership-offering-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
              placeholder="Contoh: Penawaran Saham Seri A"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="ownership-offering-code"
              className="text-sm font-medium text-fg"
            >
              Kode Penawaran
            </label>

            <input
              id="ownership-offering-code"
              value={code}
              onChange={(event) =>
                setCode(normalizeCode(event.target.value))
              }
              disabled={pending}
              placeholder="seri-a-2026"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />

            <p className="mt-1 text-xs text-fg-muted">
              Gunakan lowercase kebab-case.
            </p>
          </div>

          <div>
            <label
              htmlFor="ownership-offering-total"
              className="text-sm font-medium text-fg"
            >
              Total Kepemilikan Ditawarkan (%)
            </label>

            <input
              id="ownership-offering-total"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={totalOfferedPercent}
              onChange={(event) =>
                setTotalOfferedPercent(event.target.value)
              }
              disabled={pending}
              placeholder="40"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="ownership-offering-unit-percent"
              className="text-sm font-medium text-fg"
            >
              Kepemilikan per Unit (%)
            </label>

            <input
              id="ownership-offering-unit-percent"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={unitOwnershipPercent}
              onChange={(event) =>
                setUnitOwnershipPercent(event.target.value)
              }
              disabled={pending}
              placeholder="0.8"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="ownership-offering-unit-price"
              className="text-sm font-medium text-fg"
            >
              Harga per Unit (Rp)
            </label>

            <input
              id="ownership-offering-unit-price"
              type="number"
              min="1"
              step="1000"
              value={unitPrice}
              onChange={(event) =>
                setUnitPrice(event.target.value)
              }
              disabled={pending}
              placeholder="10000000"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="ownership-offering-total-units"
              className="text-sm font-medium text-fg"
            >
              Total Unit
            </label>

            <input
              id="ownership-offering-total-units"
              type="number"
              min="1"
              step="1"
              value={totalUnits}
              onChange={(event) =>
                setTotalUnits(event.target.value)
              }
              disabled={pending}
              placeholder="500"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="ownership-offering-cadence"
              className="text-sm font-medium text-fg"
            >
              Periode Distribusi
            </label>

            <select
              id="ownership-offering-cadence"
              value={distributionCadenceMonths}
              onChange={(event) =>
                setDistributionCadenceMonths(event.target.value)
              }
              disabled={pending}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            >
              <option value="1">Setiap 1 bulan</option>
              <option value="3">Setiap 3 bulan</option>
              <option value="6">Setiap 6 bulan</option>
              <option value="12">Setiap 12 bulan</option>
              <option value="24">Setiap 24 bulan</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="ownership-offering-lock"
              className="text-sm font-medium text-fg"
            >
              Transfer Lock
            </label>

            <select
              id="ownership-offering-lock"
              value={transferLockMonths}
              onChange={(event) =>
                setTransferLockMonths(event.target.value)
              }
              disabled={pending}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            >
              <option value="36">36 bulan</option>
              <option value="48">48 bulan</option>
              <option value="60">60 bulan</option>
              <option value="72">72 bulan</option>
              <option value="84">84 bulan</option>
              <option value="120">120 bulan</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="ownership-offering-effective-from"
              className="text-sm font-medium text-fg"
            >
              Berlaku Mulai
            </label>

            <input
              id="ownership-offering-effective-from"
              type="date"
              value={effectiveFrom}
              onChange={(event) =>
                setEffectiveFrom(event.target.value)
              }
              disabled={pending}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="ownership-offering-effective-until"
              className="text-sm font-medium text-fg"
            >
              Berlaku Sampai
            </label>

            <input
              id="ownership-offering-effective-until"
              type="date"
              value={effectiveUntil}
              onChange={(event) =>
                setEffectiveUntil(event.target.value)
              }
              disabled={pending}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="ownership-offering-description"
              className="text-sm font-medium text-fg"
            >
              Deskripsi
            </label>

            <textarea
              id="ownership-offering-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={pending}
              rows={5}
              placeholder="Deskripsi internal atau informasi penawaran untuk investor."
              className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-3 text-sm text-fg outline-none focus:ring-2"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="text-sm font-semibold">
            Gagal membuat penawaran
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            router.push('/admin/ownership/offerings')
          }
          disabled={pending}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-fg hover:bg-muted disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={
            pending ||
            !name.trim() ||
            !code.trim() ||
            !totalOfferedPercent ||
            !unitOwnershipPercent ||
            !unitPrice ||
            !totalUnits
          }
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Menyimpan...' : 'Simpan Penawaran'}
        </button>
      </div>
    </section>
  )
}
