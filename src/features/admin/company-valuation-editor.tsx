'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { returnPortalPageToDraft, savePortalSection } from '@/server/portal/admin-actions'

type StatContent = {
  kind?: 'stat_grid'
  metrics?: unknown
  company_valuation_amount?: unknown
  company_valuation_currency?: unknown
  [key: string]: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

function initialValuation(content: StatContent) {
  const raw = Number(content.company_valuation_amount)
  if (Number.isFinite(raw) && raw > 0) return raw

  const metrics = Array.isArray(content.metrics) ? content.metrics.filter(isRecord) : []
  const metric = metrics.find((item) =>
    String(item.label ?? '').trim().toLocaleLowerCase('id-ID').includes('valuasi perusahaan'),
  )
  const numeric = Number(metric?.raw_value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

export function CompanyValuationEditor({
  pageId,
  pageStatus,
  sectionId,
  initialContent,
  totalOfferedBps,
  unitOwnershipBps,
  totalUnits,
  canUpdate,
}: {
  pageId: string
  pageStatus: string
  sectionId: string
  initialContent: StatContent
  totalOfferedBps: number | null
  unitOwnershipBps: number | null
  totalUnits: number | null
  canUpdate: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(() => {
    const initial = initialValuation(initialContent)
    return initial ? String(Math.round(initial)) : ''
  })
  const [message, setMessage] = useState<string | null>(null)

  const valuation = Number(value)
  const validValuation = Number.isFinite(valuation) && valuation > 0 ? valuation : 0
  const editable = canUpdate && pageStatus === 'draft'

  const derived = useMemo(() => {
    if (!validValuation) return null

    const onePercent = validValuation / 100
    const offeredValue =
      totalOfferedBps === null ? null : validValuation * (totalOfferedBps / 10_000)
    const remainingValue = offeredValue === null ? null : validValuation - offeredValue
    const unitValue =
      unitOwnershipBps === null ? null : validValuation * (unitOwnershipBps / 10_000)

    return { onePercent, offeredValue, remainingValue, unitValue }
  }, [validValuation, totalOfferedBps, unitOwnershipBps])

  function startRevision() {
    setMessage(null)
    startTransition(async () => {
      const result = await returnPortalPageToDraft({ pageId })
      if (!result.ok) {
        setMessage(result.error?.message ?? 'Gagal memulai revisi portal.')
        return
      }
      router.refresh()
    })
  }

  function save() {
    if (!validValuation) {
      setMessage('Masukkan valuasi perusahaan yang valid dan lebih besar dari 0.')
      return
    }

    const currentMetrics = Array.isArray(initialContent.metrics)
      ? initialContent.metrics.filter(isRecord)
      : []

    const metricsWithoutValuation = currentMetrics.filter(
      (item) =>
        !String(item.label ?? '')
          .trim()
          .toLocaleLowerCase('id-ID')
          .includes('valuasi perusahaan'),
    )

    const valuationMetric = {
      value: formatCompactRupiah(validValuation),
      label: 'Valuasi Perusahaan',
      description: formatRupiah(validValuation),
      raw_value: validValuation,
      source: 'admin_valuation',
    }

    const metrics = [
      ...metricsWithoutValuation.slice(0, 4),
      valuationMetric,
      ...metricsWithoutValuation.slice(4),
    ]

    const content: StatContent & { kind: 'stat_grid' } = {
      ...initialContent,
      kind: 'stat_grid',
      company_valuation_amount: validValuation,
      company_valuation_currency: 'IDR',
      metrics,
    }

    setMessage(null)
    startTransition(async () => {
      const result = await savePortalSection({
        sectionId,
        content,
        changeNote: 'Pembaruan valuasi perusahaan dan nilai turunan.',
      })

      if (!result.ok) {
        setMessage(result.error?.message ?? 'Valuasi perusahaan gagal disimpan.')
        return
      }

      setMessage('Valuasi tersimpan pada draf portal. Terbitkan revisi agar tampil realtime di portal publik.')
      router.refresh()
    })
  }

  return (
    <div className="border-border bg-surface rounded-xl border p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-fg text-sm font-semibold">Valuasi Perusahaan</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">
            Nilai ini disimpan ke snapshot Statistik Utama portal. Empat statistik pertama tetap dipertahankan dan Valuasi Perusahaan menjadi kartu kelima.
          </p>
        </div>
        {validValuation ? (
          <div className="text-right">
            <p className="text-fg-muted text-xs">Tampilan portal</p>
            <p className="text-fg mt-1 text-xl font-semibold">{formatCompactRupiah(validValuation)}</p>
          </div>
        ) : null}
      </div>

      {pageStatus !== 'draft' ? (
        <div className="border-primary/20 bg-primary/5 mt-5 rounded-lg border p-4">
          <p className="text-fg text-sm font-medium">Halaman saat ini berstatus {pageStatus}.</p>
          <p className="text-fg-muted mt-1 text-xs">Mulai revisi agar valuasi dapat diubah tanpa mengubah versi publik aktif.</p>
          {canUpdate && pageStatus === 'published' ? (
            <button
              type="button"
              disabled={pending}
              onClick={startRevision}
              className="border-primary text-primary mt-3 inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold disabled:opacity-50"
            >
              {pending ? 'Menyiapkan…' : 'Mulai Revisi'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="text-fg text-sm font-medium">Nilai valuasi (IDR)</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={value}
            disabled={!editable || pending}
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
          disabled={!editable || pending || !validValuation}
          onClick={save}
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? 'Menyimpan…' : 'Simpan Valuasi'}
        </button>
      </div>

      {derived ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Nilai 1%</p>
            <p className="text-fg mt-1 text-sm font-semibold">{formatRupiah(derived.onePercent)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Nilai Kepemilikan Ditawarkan</p>
            <p className="text-fg mt-1 text-sm font-semibold">
              {derived.offeredValue === null ? '-' : formatRupiah(derived.offeredValue)}
            </p>
            {totalOfferedBps !== null ? <p className="text-fg-subtle mt-1 text-[11px]">{totalOfferedBps / 100}%</p> : null}
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Nilai Teoritis per Unit</p>
            <p className="text-fg mt-1 text-sm font-semibold">
              {derived.unitValue === null ? '-' : formatRupiah(derived.unitValue)}
            </p>
            {unitOwnershipBps !== null ? <p className="text-fg-subtle mt-1 text-[11px]">{unitOwnershipBps / 100}% per unit · {totalUnits ?? '-'} unit</p> : null}
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-fg-muted text-xs">Sisa Nilai Kepemilikan</p>
            <p className="text-fg mt-1 text-sm font-semibold">
              {derived.remainingValue === null ? '-' : formatRupiah(derived.remainingValue)}
            </p>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-fg-muted mt-4 text-sm">{message}</p> : null}
      {!canUpdate ? <p className="text-fg-subtle mt-4 text-xs">Anda tidak memiliki permission portal.update.</p> : null}
    </div>
  )
}
