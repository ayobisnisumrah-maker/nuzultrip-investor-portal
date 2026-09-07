'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { createProfitDistributionPaymentProofUrl } from '@/server/ownership/payment-proof-actions'
import { markProfitDistributionAllocationPaidAction } from '@/server/ownership/profit-distribution-payment-actions'
import type {
  ProfitDistribution,
  ProfitDistributionAllocation,
} from '@/server/ownership/profit-distribution-service'

type Props = {
  distributions: ProfitDistribution[]
  allocationsByDistribution: Record<string, ProfitDistributionAllocation[]>
  proofAllocationIds: string[]
  permissions: {
    uploadProof: boolean
    replaceProof: boolean
    markPaid: boolean
  }
}

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date)
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'review':
      return 'Review'
    case 'approved':
      return 'Disetujui'
    case 'payable':
      return 'Siap Dibayar'
    case 'paid':
      return 'Dibayar'
    case 'cancelled':
      return 'Dibatalkan'
    case 'pending':
      return 'Menunggu'
    default:
      return status
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'payable':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'approved':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'review':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-700'
    default:
      return 'border-border bg-muted text-fg-muted'
  }
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload: unknown = await response.json()
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
    ) {
      return payload.error
    }
  } catch {
    // The fallback below is intentionally used for non-JSON failures.
  }
  return fallback
}

export function ProfitDistributionManager({
  distributions,
  allocationsByDistribution,
  proofAllocationIds,
  permissions,
}: Props) {
  const router = useRouter()
  const [selectedDistributionId, setSelectedDistributionId] = useState<string | null>(
    distributions[0]?.id ?? null,
  )
  const [busyAllocationId, setBusyAllocationId] = useState<string | null>(null)
  const [referenceByAllocation, setReferenceByAllocation] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const proofAllocationIdSet = useMemo(
    () => new Set(proofAllocationIds),
    [proofAllocationIds],
  )
  const selectedDistribution =
    distributions.find((distribution) => distribution.id === selectedDistributionId) ?? null
  const allocations = selectedDistribution
    ? (allocationsByDistribution[selectedDistribution.id] ?? [])
    : []
  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.allocation_amount),
    0,
  )
  const paidCount = allocations.filter((allocation) => allocation.status === 'paid').length
  const payableCount = allocations.filter((allocation) => allocation.status === 'payable').length

  function clearFeedback() {
    setMessage(null)
    setError(null)
  }

  async function submitProof(allocationId: string, file: File, replace: boolean) {
    clearFeedback()
    setBusyAllocationId(allocationId)

    try {
      const formData = new FormData()
      formData.append('allocationId', allocationId)
      formData.append('paymentReference', referenceByAllocation[allocationId] ?? '')
      formData.append('file', file)

      const response = await fetch(
        replace
          ? '/api/admin/profit-distributions/payment-proofs/replace'
          : '/api/admin/profit-distributions/payment-proofs/upload',
        { method: 'POST', body: formData },
      )

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            replace ? 'Gagal mengganti bukti pembayaran.' : 'Gagal mengunggah bukti pembayaran.',
          ),
        )
      }

      setMessage(
        replace
          ? 'Bukti pembayaran berhasil diganti.'
          : 'Bukti pembayaran berhasil diunggah.',
      )
      startTransition(() => router.refresh())
    } catch (proofError) {
      setError(
        proofError instanceof Error
          ? proofError.message
          : replace
            ? 'Gagal mengganti bukti pembayaran.'
            : 'Gagal mengunggah bukti pembayaran.',
      )
    } finally {
      setBusyAllocationId(null)
    }
  }

  async function openProof(allocationId: string) {
    clearFeedback()
    setBusyAllocationId(allocationId)

    try {
      const result = await createProfitDistributionPaymentProofUrl({ allocationId })
      if (!result.ok) throw new Error(result.error.message)
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (proofError) {
      setError(
        proofError instanceof Error ? proofError.message : 'Gagal membuka bukti pembayaran.',
      )
    } finally {
      setBusyAllocationId(null)
    }
  }

  async function markPaid(allocationId: string) {
    clearFeedback()
    const confirmed = window.confirm(
      'Tandai pembayaran ini sebagai DIBAYAR? Pastikan transfer dan bukti pembayaran sudah benar.',
    )
    if (!confirmed) return

    setBusyAllocationId(allocationId)
    try {
      const result = await markProfitDistributionAllocationPaidAction({
        allocationId,
        paymentReference: referenceByAllocation[allocationId] ?? null,
      })
      if (!result.ok) throw new Error(result.error.message)

      setMessage('Pembayaran berhasil ditandai sebagai dibayar.')
      startTransition(() => router.refresh())
    } catch (markError) {
      setError(
        markError instanceof Error ? markError.message : 'Gagal menandai pembayaran sebagai dibayar.',
      )
    } finally {
      setBusyAllocationId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
          Kepemilikan
        </p>
        <h1 className="font-display text-heading-lg text-fg mt-1">Distribusi Bagi Hasil</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
          Kelola alokasi investor, bukti transfer, dan status pembayaran dari satu tempat.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Distribusi" value={String(distributions.length)} />
        <Metric label="Alokasi Investor" value={String(allocations.length)} />
        <Metric label="Sudah Dibayar" value={String(paidCount)} />
        <Metric label="Siap Dibayar" value={String(payableCount)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <section className="border-border bg-surface overflow-hidden rounded-xl border">
          <div className="border-border border-b px-5 py-4">
            <h2 className="text-fg font-semibold">Distribusi</h2>
          </div>
          <div className="divide-border divide-y">
            {distributions.length === 0 ? (
              <div className="text-fg-muted p-6 text-sm">Belum ada distribusi bagi hasil.</div>
            ) : (
              distributions.map((distribution) => {
                const selected = distribution.id === selectedDistributionId
                return (
                  <button
                    key={distribution.id}
                    type="button"
                    onClick={() => {
                      clearFeedback()
                      setSelectedDistributionId(distribution.id)
                    }}
                    className={`block w-full px-5 py-4 text-left transition ${selected ? 'bg-muted' : 'hover:bg-muted/60'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-fg truncate text-sm font-semibold">
                          {formatDate(distribution.period_start)} — {formatDate(distribution.period_end)}
                        </p>
                        <p className="text-fg-muted mt-2 text-xs">
                          Pool investor {formatCurrency(distribution.investor_pool_amount)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClass(distribution.status)}`}
                      >
                        {statusLabel(distribution.status)}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="border-border bg-surface overflow-hidden rounded-xl border">
          <div className="border-border border-b px-5 py-4">
            {selectedDistribution ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-fg font-semibold">Alokasi Pembayaran</h2>
                    <p className="text-fg-muted mt-1 text-xs">
                      {formatDate(selectedDistribution.period_start)} — {formatDate(selectedDistribution.period_end)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(selectedDistribution.status)}`}
                  >
                    {statusLabel(selectedDistribution.status)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Summary label="Profit" value={formatCurrency(selectedDistribution.profit_amount)} />
                  <Summary
                    label="Pool Investor"
                    value={formatCurrency(selectedDistribution.investor_pool_amount)}
                  />
                  <Summary label="Total Alokasi" value={formatCurrency(totalAllocated)} />
                </div>
              </div>
            ) : (
              <h2 className="text-fg font-semibold">Pilih Distribusi</h2>
            )}
          </div>

          {selectedDistribution && allocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-border text-fg-muted border-b text-left text-xs">
                    <th className="px-5 py-3 font-medium">Investor</th>
                    <th className="px-5 py-3 font-medium">Kepemilikan</th>
                    <th className="px-5 py-3 font-medium">Alokasi</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Referensi</th>
                    <th className="px-5 py-3 font-medium">Bukti & Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {allocations.map((allocation) => {
                    const busy = busyAllocationId === allocation.id
                    const canPay = allocation.status === 'payable'
                    const hasProof =
                      allocation.status === 'paid' || proofAllocationIdSet.has(allocation.id)

                    return (
                      <tr key={allocation.id}>
                        <td className="px-5 py-4">
                          <p className="text-fg font-medium">Investor</p>
                          <p className="text-fg-subtle mt-1 font-mono text-[11px]">
                            {allocation.investor_id}
                          </p>
                        </td>
                        <td className="px-5 py-4">{(allocation.ownership_bps / 100).toFixed(2)}%</td>
                        <td className="px-5 py-4 font-medium">
                          {formatCurrency(allocation.allocation_amount)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusClass(allocation.status)}`}
                          >
                            {statusLabel(allocation.status)}
                          </span>
                          <p className="text-fg-subtle mt-1 text-[11px]">
                            {hasProof ? 'Bukti tersedia' : 'Belum ada bukti'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <input
                            value={
                              referenceByAllocation[allocation.id] ??
                              allocation.payment_reference ??
                              ''
                            }
                            onChange={(event) =>
                              setReferenceByAllocation((current) => ({
                                ...current,
                                [allocation.id]: event.target.value,
                              }))
                            }
                            disabled={!canPay}
                            maxLength={200}
                            placeholder="No. referensi"
                            className="border-border bg-background text-fg focus:border-primary-solid h-9 w-44 rounded-lg border px-3 text-xs outline-none disabled:opacity-60"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {!hasProof && permissions.uploadProof && canPay ? (
                              <ProofFileButton
                                label={busy ? 'Mengunggah...' : 'Upload Bukti'}
                                disabled={busy}
                                onFile={(file) => void submitProof(allocation.id, file, false)}
                              />
                            ) : null}

                            {hasProof ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void openProof(allocation.id)}
                                className="border-border text-fg hover:bg-muted inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium disabled:opacity-50"
                              >
                                Buka Bukti
                              </button>
                            ) : null}

                            {hasProof && permissions.replaceProof && canPay ? (
                              <ProofFileButton
                                label={busy ? 'Mengganti...' : 'Ganti Bukti'}
                                disabled={busy}
                                onFile={(file) => void submitProof(allocation.id, file, true)}
                              />
                            ) : null}

                            {permissions.markPaid && canPay && hasProof ? (
                              <button
                                type="button"
                                disabled={busy || isPending}
                                onClick={() => void markPaid(allocation.id)}
                                className="bg-primary-solid text-primary-foreground inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                              >
                                {busy ? 'Memproses...' : 'Tandai Dibayar'}
                              </button>
                            ) : null}

                            {permissions.markPaid && canPay && !hasProof ? (
                              <span className="text-fg-subtle self-center text-[11px]">
                                Upload bukti sebelum menandai dibayar.
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : selectedDistribution ? (
            <div className="text-fg-muted p-8 text-center text-sm">
              Belum ada alokasi untuk distribusi ini.
            </div>
          ) : (
            <div className="text-fg-muted p-8 text-center text-sm">
              Pilih distribusi di sebelah kiri.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-surface rounded-xl border p-5">
      <p className="text-caption text-fg-muted">{label}</p>
      <p className="text-fg mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-fg-muted text-[11px]">{label}</p>
      <p className="text-fg mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function ProofFileButton({
  label,
  disabled,
  onFile,
}: {
  label: string
  disabled: boolean
  onFile: (file: File) => void
}) {
  return (
    <label
      className={`border-border text-fg inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted cursor-pointer'
      }`}
    >
      {label}
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ''
          if (file) onFile(file)
        }}
      />
    </label>
  )
}
