'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Offering = {
  id: string
  name: string
  code: string
  status: string
  total_offered_bps: number
  unit_ownership_bps: number
  unit_price: number
  total_units: number
  distribution_cadence_months: number
  transfer_lock_months: number
  effective_from: string | null
  effective_until: string | null
  description: string | null
}

type Props = {
  offerings: Offering[]
  timezone: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Aktif',
  paused: 'Dijeda',
  closed: 'Ditutup',
  archived: 'Diarsipkan',
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatPercentageBps(value: number) {
  return `${(value / 100).toFixed(2)}%`
}

function formatDate(value: string | null, timeZone: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function statusClass(status: string) {
  switch (status) {
    case 'open':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'paused':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'closed':
      return 'border-slate-200 bg-slate-50 text-slate-700'
    case 'archived':
      return 'border-red-200 bg-red-50 text-red-700'
    default:
      return 'border-border bg-surface text-fg-muted'
  }
}

export function OwnershipOfferingManager({ offerings, timezone }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  const filteredOfferings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return offerings.filter((offering) => {
      const matchesQuery =
        !normalizedQuery ||
        offering.name.toLowerCase().includes(normalizedQuery) ||
        offering.code.toLowerCase().includes(normalizedQuery)

      const matchesStatus = !status || offering.status === status

      return matchesQuery && matchesStatus
    })
  }, [offerings, query, status])

  const totalUnits = offerings.reduce((sum, offering) => sum + Number(offering.total_units), 0)

  const totalOfferingValue = offerings.reduce(
    (sum, offering) => sum + Number(offering.total_units) * Number(offering.unit_price),
    0,
  )

  const activeCount = offerings.filter((offering) => offering.status === 'open').length

  const draftCount = offerings.filter((offering) => offering.status === 'draft').length

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-fg-muted text-sm font-medium">Investor Relations</p>

          <h1 className="font-display text-heading-xl text-fg mt-1">Penawaran Kepemilikan</h1>

          <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
            Kelola penawaran kepemilikan, unit, harga, persentase, periode lock, dan status
            penawaran investor.
          </p>
        </div>

        <Link
          href="/admin/ownership/offerings/new"
          className="bg-primary text-on-primary inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium shadow-sm hover:opacity-90"
        >
          + Buat Penawaran
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">Total Penawaran</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{formatNumber(offerings.length)}</p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">Penawaran Aktif</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{formatNumber(activeCount)}</p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">Total Unit</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{formatNumber(totalUnits)}</p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-caption text-fg-subtle">Nilai Penawaran</p>
          <p className="text-fg mt-2 text-xl font-semibold">{formatRupiah(totalOfferingValue)}</p>
        </div>
      </div>

      <div className="border-border bg-surface rounded-xl border">
        <div className="border-border border-b p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau kode penawaran..."
              className="border-border bg-canvas text-body-sm h-10 min-w-0 flex-1 rounded-lg border px-3 outline-none focus:ring-2"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="border-border bg-canvas text-body-sm h-10 rounded-lg border px-3 outline-none focus:ring-2"
            >
              <option value="">Semua status</option>
              <option value="draft">Draft</option>
              <option value="open">Aktif</option>
              <option value="paused">Dijeda</option>
              <option value="closed">Ditutup</option>
              <option value="archived">Diarsipkan</option>
            </select>
          </div>
        </div>

        {filteredOfferings.length === 0 ? (
          <div className="p-10 text-center">
            <h2 className="text-fg text-sm font-semibold">Tidak ada penawaran</h2>

            <p className="text-fg-muted mt-1 text-sm">
              {offerings.length === 0
                ? 'Belum ada penawaran kepemilikan yang tersedia.'
                : 'Tidak ada penawaran yang sesuai dengan filter saat ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="border-border bg-canvas border-b">
                <tr className="text-fg-subtle text-xs font-medium tracking-wide uppercase">
                  <th className="px-5 py-3">Penawaran</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Unit</th>
                  <th className="px-5 py-3 text-right">Harga / Unit</th>
                  <th className="px-5 py-3 text-right">Kepemilikan</th>
                  <th className="px-5 py-3">Periode</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-border divide-y">
                {filteredOfferings.map((offering) => (
                  <tr key={offering.id} className="align-middle">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-fg font-medium">{offering.name}</p>

                        <p className="text-fg-subtle mt-1 text-xs">{offering.code}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                          offering.status,
                        )}`}
                      >
                        {STATUS_LABELS[offering.status] ?? offering.status}
                      </span>
                    </td>

                    <td className="text-fg px-5 py-4 text-right text-sm" suppressHydrationWarning>
                      {formatNumber(Number(offering.total_units))}
                    </td>

                    <td className="text-fg px-5 py-4 text-right text-sm" suppressHydrationWarning>
                      {formatRupiah(Number(offering.unit_price))}
                    </td>

                    <td className="text-fg px-5 py-4 text-right text-sm" suppressHydrationWarning>
                      {formatPercentageBps(Number(offering.total_offered_bps))}
                    </td>

                    <td className="text-fg-muted px-5 py-4 text-sm" suppressHydrationWarning>
                      <div>{formatDate(offering.effective_from, timezone)}</div>

                      <div className="mt-1 text-xs">
                        s/d {formatDate(offering.effective_until, timezone)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/ownership/offerings/${offering.id}`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border-border bg-surface rounded-xl border p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-fg text-sm font-medium">Ringkasan Status</p>
            <p className="text-fg-muted mt-1 text-xs">
              Data berasal langsung dari penawaran kepemilikan yang tersimpan di database.
            </p>
          </div>

          <div className="flex gap-5 text-sm">
            <span className="text-fg-muted">
              Draft: <strong className="text-fg">{formatNumber(draftCount)}</strong>
            </span>

            <span className="text-fg-muted">
              Aktif: <strong className="text-fg">{formatNumber(activeCount)}</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
