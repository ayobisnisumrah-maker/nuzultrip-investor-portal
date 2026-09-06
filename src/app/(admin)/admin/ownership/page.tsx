import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { listOwnershipHoldings } from '@/server/ownership/holding-service'

const STATUS_LABEL: Record<string, string> = {
  reserved: 'Dicadangkan',
  active: 'Aktif',
  transferred: 'Dialihkan',
  cancelled: 'Dibatalkan',
}

function formatPercent(bps: number) {
  return `${(bps / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function OwnershipPage() {
  const principal = await adminWithPermission('ownership.view', '/admin/ownership')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat data kepemilikan.
        </p>
        <p className="text-caption text-fg-subtle mt-3">
          Permission: <code>ownership.view</code>
        </p>
      </div>
    )
  }

  const supabase = await getServerSupabase()
  const holdings = await listOwnershipHoldings(supabase)

  const active = holdings.filter((holding) => holding.status === 'active')
  const reserved = holdings.filter((holding) => holding.status === 'reserved')
  const activeUnits = active.reduce((total, holding) => total + holding.units, 0)
  const activeBps = active.reduce((total, holding) => total + holding.ownership_bps, 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption text-accent uppercase tracking-[0.16em]">Kepemilikan</p>
        <h1 className="font-display text-heading-xl text-fg mt-1">Kepemilikan Investor</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
          Pantau alokasi unit, persentase kepemilikan, status, serta kesiapan transfer seluruh pemegang ekuitas.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-caption text-fg-subtle">Total catatan</p>
          <p className="font-display text-heading-lg text-fg mt-1">{holdings.length}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-caption text-fg-subtle">Kepemilikan aktif</p>
          <p className="font-display text-heading-lg text-fg mt-1">{active.length}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-caption text-fg-subtle">Unit aktif</p>
          <p className="font-display text-heading-lg text-fg mt-1">{activeUnits.toLocaleString('id-ID')}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-caption text-fg-subtle">Persentase aktif</p>
          <p className="font-display text-heading-lg text-fg mt-1">{formatPercent(activeBps)}</p>
        </div>
      </div>

      <div className="border-border bg-surface overflow-hidden rounded-xl border">
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-title-md text-fg font-semibold">Daftar Kepemilikan</h2>
            <p className="text-body-sm text-fg-muted mt-1">
              {reserved.length} alokasi masih dicadangkan dan menunggu aktivasi.
            </p>
          </div>
          <Link
            href="/admin/ownership/offerings"
            className="border-border text-body-sm text-fg hover:bg-surface-raised rounded-lg border px-3 py-2"
          >
            Kelola Penawaran
          </Link>
        </div>

        {holdings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-body-md text-fg">Belum ada kepemilikan investor.</p>
            <p className="text-body-sm text-fg-muted mt-1">
              Alokasi kepemilikan akan muncul di sini setelah dibuat dari penawaran yang aktif.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-surface-raised text-caption text-fg-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">Investor</th>
                  <th className="px-5 py-3 font-medium">Unit</th>
                  <th className="px-5 py-3 font-medium">Kepemilikan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Akuisisi</th>
                  <th className="px-5 py-3 font-medium">Dapat transfer</th>
                  <th className="px-5 py-3 font-medium">Referensi</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {holdings.map((holding) => (
                  <tr key={holding.id} className="text-body-sm text-fg">
                    <td className="px-5 py-4 font-mono text-xs">{holding.investor_id.slice(0, 8)}…</td>
                    <td className="px-5 py-4">{holding.units.toLocaleString('id-ID')}</td>
                    <td className="px-5 py-4">{formatPercent(holding.ownership_bps)}</td>
                    <td className="px-5 py-4">{STATUS_LABEL[holding.status] ?? holding.status}</td>
                    <td className="px-5 py-4">{formatDate(holding.acquisition_at)}</td>
                    <td className="px-5 py-4">{formatDate(holding.transfer_eligible_at)}</td>
                    <td className="text-fg-muted px-5 py-4">{holding.acquisition_reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
