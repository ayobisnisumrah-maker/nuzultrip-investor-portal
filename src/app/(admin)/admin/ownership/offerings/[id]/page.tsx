import Link from 'next/link'
import { notFound } from 'next/navigation'

import { adminWithPermission } from '@/server/auth/page-guards'
import { OwnershipOfferingActions } from '@/features/admin/ownership-offering-actions'
import { getServerSupabase } from '@/server/supabase/server'
import { getOwnershipOffering } from '@/server/ownership/offering-service'

type Props = {
  params: Promise<{
    id: string
  }>
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

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
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

export default async function OwnershipOfferingDetailPage({ params }: Props) {
  const { id } = await params
  const path = `/admin/ownership/offerings/${id}`

  const viewPrincipal = await adminWithPermission('ownership_offerings.view', path)

  if (!viewPrincipal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat penawaran kepemilikan ini.
        </p>

        <p className="text-caption text-fg-subtle mt-3">
          Permission: <code>ownership_offerings.view</code>
        </p>

        <Link
          href="/admin/ownership/offerings"
          className="border-border text-fg hover:bg-muted mt-5 inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium"
        >
          Kembali ke Penawaran
        </Link>
      </div>
    )
  }

  const supabase = await getServerSupabase()

  const offering = await getOwnershipOffering(supabase, id)

  if (!offering) {
    notFound()
  }

  const totalOfferingValue = Number(offering.unit_price) * Number(offering.total_units)

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Kepemilikan
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-heading-lg text-fg">{offering.name}</h1>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                offering.status,
              )}`}
            >
              {STATUS_LABELS[offering.status] ?? offering.status}
            </span>
          </div>

          <p className="text-body-sm text-fg-muted mt-2">
            Detail konfigurasi penawaran kepemilikan investor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/ownership/offerings"
            className="border-border text-fg hover:bg-muted inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Kembali
          </Link>
          <OwnershipOfferingActions
            offeringId={offering.id}
            name={offering.name}
            status={offering.status}
            permissions={viewPrincipal.permissions}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Total Unit</p>
          <p className="text-fg mt-2 text-2xl font-semibold">
            {formatNumber(Number(offering.total_units))}
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Harga per Unit</p>
          <p className="text-fg mt-2 text-2xl font-semibold">
            {formatRupiah(Number(offering.unit_price))}
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Kepemilikan Ditawarkan</p>
          <p className="text-fg mt-2 text-2xl font-semibold">
            {formatPercentageBps(Number(offering.total_offered_bps))}
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-5">
          <p className="text-fg-muted text-xs">Nilai Penawaran</p>
          <p className="text-fg mt-2 text-2xl font-semibold">{formatRupiah(totalOfferingValue)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-border bg-surface rounded-xl border p-6">
          <div className="mb-5">
            <p className="text-fg text-sm font-semibold">Konfigurasi Kepemilikan</p>
            <p className="text-fg-muted mt-1 text-xs">
              Parameter utama unit dan struktur kepemilikan.
            </p>
          </div>

          <dl className="divide-border divide-y">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Nama Penawaran</dt>
              <dd className="text-fg text-right text-sm font-medium">{offering.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Kode Penawaran</dt>
              <dd className="text-fg text-right font-mono text-sm">{offering.code}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Kepemilikan Total</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {formatPercentageBps(Number(offering.total_offered_bps))}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Kepemilikan per Unit</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {formatPercentageBps(Number(offering.unit_ownership_bps))}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Total Unit</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {formatNumber(Number(offering.total_units))}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Harga per Unit</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {formatRupiah(Number(offering.unit_price))}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Nilai Penawaran</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {formatRupiah(totalOfferingValue)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-border bg-surface rounded-xl border p-6">
          <div className="mb-5">
            <p className="text-fg text-sm font-semibold">Periode & Distribusi</p>
            <p className="text-fg-muted mt-1 text-xs">
              Aturan periode berlaku, distribusi, dan transfer lock.
            </p>
          </div>

          <dl className="divide-border divide-y">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Periode Distribusi</dt>
              <dd className="text-fg text-right text-sm font-medium">
                Setiap {Number(offering.distribution_cadence_months)} bulan
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Transfer Lock</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {Number(offering.transfer_lock_months)} bulan
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Berlaku Mulai</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {formatDate(offering.effective_from)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-fg-muted text-sm">Berlaku Sampai</dt>
              <dd className="text-fg text-right text-sm font-medium">
                {formatDate(offering.effective_until)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-border bg-surface rounded-xl border p-6">
        <div>
          <p className="text-fg text-sm font-semibold">Deskripsi</p>
          <p className="text-fg-muted mt-1 text-xs">
            Informasi internal yang tersimpan pada penawaran.
          </p>
        </div>
        <div className="border-border bg-canvas mt-4 rounded-lg border p-4">
          <p className="text-fg-muted text-sm leading-6 whitespace-pre-wrap">
            {offering.description || 'Tidak ada deskripsi.'}
          </p>
        </div>
      </div>

      <div className="border-border bg-surface rounded-xl border p-6">
        <div className="mb-5">
          <p className="text-fg text-sm font-semibold">Metadata</p>
          <p className="text-fg-muted mt-1 text-xs">Informasi audit dan waktu perubahan data.</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted text-xs">Dibuat</dt>
            <dd className="text-fg mt-1 text-sm">{formatDateTime(offering.created_at)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted text-xs">Diperbarui</dt>
            <dd className="text-fg mt-1 text-sm">{formatDateTime(offering.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted text-xs">Created By</dt>
            <dd className="text-fg-muted mt-1 font-mono text-xs break-all">
              {offering.created_by || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted text-xs">Updated By</dt>
            <dd className="text-fg-muted mt-1 font-mono text-xs break-all">
              {offering.updated_by || '-'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
