'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { updateCompanyValuation } from '@/server/ownership/valuation-actions'

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCompactRupiah(value: number) {
  if (value >= 1_000_000_000_000) {
    return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value / 1_000_000_000_000)} Triliun`
  }
  if (value >= 1_000_000_000) {
    return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value / 1_000_000_000)} Miliar`
  }
  if (value >= 1_000_000) {
    return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value / 1_000_000)} Juta`
  }
  return formatRupiah(value)
}

export function CompanyValuationEditor({
  offeringId,
  initialValue,
  totalOfferedBps,
  unitOwnershipBps,
  totalUnits,
  canUpdate,
}: {
  offeringId: string
  initialValue: number | null
  totalOfferedBps: number
  unitOwnershipBps: number
  totalUnits: number
  canUpdate: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(initialValue ? String(Math.round(initialValue)) : '')
  const [message, setMessage] = useState<string | null>(null)

  const valuation = Number(value)
  const validValuation = Number.isFinite(valuation) && valuation > 0 ? valuation : 0

  const derived = useMemo(() => {
    const onePercent = validValuation / 100
    const offeredValue = validValuation * (totalOfferedBps / 10_000)
    const remainingValue = validValuation - offeredValue
    const unitValue = validValuation * (unitOwnershipBps / 10_000)

    return { onePercent, offeredValue, remainingValue, unitValue }
  }, [validValuation, totalOfferedBps, unitOwnershipBps])

  function save() {
    if (!validValuation) {
      setMessage('Masukkan valuasi perusahaan yang valid dan lebih besar dari 0.')
      return
    }

    setMessage(null)
    startTransition(async () => {
      const result = await updateCompanyValuation({
        offeringId,
        companyValuation: validValuation,
      })

      if (!result.ok) {
        setMessage(result.error?.message ?? 'Valuasi perusahaan gagal disimpan.')
        return
      }

      setMessage('Valuasi perusahaan berhasil disimpan dan siap digunakan pada portal publik.')
      router.refresh()
    })
  }

  return (
    <div className="border-border bg-surface rounded-xl border p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-fg text-sm font-semibold">Valuasi Perusahaan</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">
            Masukkan valuasi perusahaan dalam rupiah. Sistem menghitung otomatis nilai 1%, nilai kepemilikan yang ditawarkan, nilai teoritis per unit, dan sisa kepemilikan.
          </p>
        </div>
        {validValuation ? (
          <div className="text-right">
            <p className="text-fg-muted text-xs">Tampilan portal</p>
            <p className="text-fg mt-1 text-xl font-semibold">{formatCompactRupiah(validValuation)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="text-fg text-sm font-medium">Nilai valuasi (IDR)</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={value}
            disabled={!canUpdate || pending}
            onChange={(event) => setValue(event.target.value)}
            placeholder="12500000000"
            className="border-border bg-background text-fg focus:border-primary mt-1.5 h-11 w-full rounded-lg border px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-55"
          />
          {validValuation ? (
            <span className="text-fg-muted mt-1.5 block text-xs">{formatRupiah(validValuation)}</span>
          ) : null}
        </label>

        <button
          type="button"
          disabled={!canUpdate || pending || !validValuation}
          onClick={save}
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? 'Menyimpan…' : 'Simpan Valuasi'}
        </button>
      </div>

      {validValuation ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Nilai 1%</p>
            <p className="text-fg mt-1 text-sm font-semibold">{formatRupiah(derived.onePercent)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Nilai {totalOfferedBps / 100}% Ditawarkan</p>
            <p className="text-fg mt-1 text-sm font-semibold">{formatRupiah(derived.offeredValue)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Nilai Teoritis per Unit ({unitOwnershipBps / 100}%)</p>
            <p className="text-fg mt-1 text-sm font-semibold">{formatRupiah(derived.unitValue)}</p>
            <p className="text-fg-subtle mt-1 text-[11px]">{totalUnits} unit pada penawaran aktif</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Sisa Nilai Kepemilikan</p>
            <p className="text-fg mt-1 text-sm font-semibold">{formatRupiah(derived.remainingValue)}</p>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-fg-muted mt-4 text-sm">{message}</p> : null}
      {!canUpdate ? (
        <p className="text-fg-subtle mt-4 text-xs">Anda tidak memiliki permission ownership_offerings.update.</p>
      ) : null}
    </div>
  )
}
