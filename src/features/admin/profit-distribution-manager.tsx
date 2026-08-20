'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type {
  ProfitDistribution,
  ProfitDistributionAllocation,
} from '@/server/ownership/profit-distribution-service'

import {
  createProfitDistributionPaymentProofUrl,
  getProfitDistributionPaymentProof,
} from '@/server/ownership/payment-proof-actions'

import { markProfitDistributionAllocationPaidAction } from '@/server/ownership/profit-distribution-payment-actions'

type Props = {
  distributions: ProfitDistribution[]
  allocationsByDistribution: Record<
    string,
    ProfitDistributionAllocation[]
  >
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

  if (Number.isNaN(date.getTime())) return '-'

  return dateFormatter.format(date)
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'review':
      return 'Review'
    case 'approved':
      return 'Approved'
    case 'payable':
      return 'Payable'
    case 'paid':
      return 'Paid'
    case 'cancelled':
      return 'Cancelled'
    case 'pending':
      return 'Pending'
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

export function ProfitDistributionManager({
  distributions,
  allocationsByDistribution,
  permissions,
}: Props) {
  const router = useRouter()
  const [selectedDistributionId, setSelectedDistributionId] =
    useState<string | null>(
      distributions[0]?.id ?? null,
    )

  const [busyAllocationId, setBusyAllocationId] =
    useState<string | null>(null)

  const [referenceByAllocation, setReferenceByAllocation] =
    useState<Record<string, string>>({})

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  const selectedDistribution =
    distributions.find(
      (distribution) =>
        distribution.id === selectedDistributionId,
    ) ?? null

  const allocations = selectedDistribution
    ? allocationsByDistribution[selectedDistribution.id] ?? []
    : []

  const totalAllocated = allocations.reduce(
    (sum, allocation) =>
      sum + Number(allocation.allocation_amount),
    0,
  )

  const paidCount = allocations.filter(
    (allocation) => allocation.status === 'paid',
  ).length

  const payableCount = allocations.filter(
    (allocation) => allocation.status === 'payable',
  ).length

  function clearFeedback() {
    setMessage(null)
    setError(null)
  }

  async function uploadProof(
    allocationId: string,
    file: File,
  ) {
    clearFeedback()
    setBusyAllocationId(allocationId)

    try {
      const formData = new FormData()

      formData.append('allocationId', allocationId)
      formData.append(
        'paymentReference',
        referenceByAllocation[allocationId] ?? '',
      )
      formData.append('file', file)

      const response = await fetch(
        '/api/admin/profit-distributions/payment-proofs/upload',
        {
          method: 'POST',
          body: formData,
        },
      )

      const payload: unknown = await response.json()

      if (!response.ok) {
        const errorMessage =
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : 'Gagal mengunggah bukti pembayaran.'

        throw new Error(errorMessage)
      }

      setMessage(
        'Bukti pembayaran berhasil diunggah.',
      )

      startTransition(() => {
        router.refresh()
      })
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
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
      const result =
        await createProfitDistributionPaymentProofUrl({
          allocationId,
        })

      if (!result.ok) {
        throw new Error(result.error.message)
      }

      window.open(
        result.data.signedUrl,
        '_blank',
        'noopener,noreferrer',
      )
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : 'Gagal membuka bukti pembayaran.',
      )
    } finally {
      setBusyAllocationId(null)
    }
  }

  async function markPaid(allocationId: string) {
    clearFeedback()

    const confirmed = window.confirm(
      'Tandai pembayaran ini sebagai PAID? Pastikan transfer benar-benar sudah dilakukan.',
    )

    if (!confirmed) return

    setBusyAllocationId(allocationId)

    try {
      const result =
        await markProfitDistributionAllocationPaidAction({
          allocationId,
          paymentReference:
            referenceByAllocation[allocationId] ?? null,
        })

      if (!result.ok) {
        throw new Error(result.error.message)
      }

      setMessage(
        'Pembayaran berhasil ditandai sebagai PAID.',
      )

      startTransition(() => {
        router.refresh()
      })
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : 'Gagal menandai pembayaran sebagai PAID.',
      )
    } finally {
      setBusyAllocationId(null)
    }
  }

  async function inspectProof(allocationId: string) {
    clearFeedback()
    setBusyAllocationId(allocationId)

    try {
      const result =
        await getProfitDistributionPaymentProof({
          allocationId,
        })

      if (!result.ok) {
        throw new Error(result.error.message)
      }

      setMessage(
        `Bukti tersedia: ${result.data.original_file_name}`,
      )
    } catch (proofError) {
      setError(
        proofError instanceof Error
          ? proofError.message
          : 'Bukti pembayaran belum tersedia.',
      )
    } finally {
      setBusyAllocationId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">
          Kepemilikan
        </p>

        <h1 className="mt-1 font-display text-heading-lg text-fg">
          Distribusi Bagi Hasil
        </h1>

        <p className="mt-2 max-w-3xl text-body-sm text-fg-muted">
          Kelola perhitungan distribusi, allocation investor,
          bukti pembayaran, dan status pembayaran secara langsung
          dari data produksi.
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
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-caption text-fg-muted">
            Total Distribusi
          </p>
          <p className="mt-2 text-2xl font-semibold text-fg">
            {distributions.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-caption text-fg-muted">
            Investor Allocation
          </p>
          <p className="mt-2 text-2xl font-semibold text-fg">
            {allocations.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-caption text-fg-muted">
            Sudah Dibayar
          </p>
          <p className="mt-2 text-2xl font-semibold text-fg">
            {paidCount}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-caption text-fg-muted">
            Siap Dibayar
          </p>
          <p className="mt-2 text-2xl font-semibold text-fg">
            {payableCount}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-fg">
              Distribusi
            </h2>
          </div>

          <div className="divide-y divide-border">
            {distributions.length === 0 ? (
              <div className="p-6 text-sm text-fg-muted">
                Belum ada distribusi bagi hasil.
              </div>
            ) : (
              distributions.map((distribution) => {
                const selected =
                  distribution.id === selectedDistributionId

                return (
                  <button
                    key={distribution.id}
                    type="button"
                    onClick={() => {
                      clearFeedback()
                      setSelectedDistributionId(
                        distribution.id,
                      )
                    }}
                    className={[
                      'block w-full px-5 py-4 text-left transition',
                      selected
                        ? 'bg-muted'
                        : 'hover:bg-muted/60',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">
                          {formatDate(
                            distribution.period_start,
                          )}{' '}
                          —{' '}
                          {formatDate(
                            distribution.period_end,
                          )}
                        </p>

                        <p className="mt-1 truncate font-mono text-[11px] text-fg-subtle">
                          {distribution.id}
                        </p>
                      </div>

                      <span
                        className={[
                          'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium',
                          statusClass(
                            distribution.status,
                          ),
                        ].join(' ')}
                      >
                        {statusLabel(
                          distribution.status,
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-fg-muted">
                        Profit
                      </span>

                      <span className="font-medium text-fg">
                        {formatCurrency(
                          distribution.profit_amount,
                        )}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-fg-muted">
                        Investor Pool
                      </span>

                      <span className="font-medium text-fg">
                        {formatCurrency(
                          distribution.investor_pool_amount,
                        )}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            {selectedDistribution ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-fg">
                      Allocation Pembayaran
                    </h2>

                    <p className="mt-1 text-xs text-fg-muted">
                      {formatDate(
                        selectedDistribution.period_start,
                      )}{' '}
                      —{' '}
                      {formatDate(
                        selectedDistribution.period_end,
                      )}
                    </p>
                  </div>

                  <span
                    className={[
                      'rounded-full border px-2.5 py-1 text-xs font-medium',
                      statusClass(
                        selectedDistribution.status,
                      ),
                    ].join(' ')}
                  >
                    {statusLabel(
                      selectedDistribution.status,
                    )}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-fg-muted">
                      Profit
                    </p>
                    <p className="mt-1 text-sm font-semibold text-fg">
                      {formatCurrency(
                        selectedDistribution.profit_amount,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-fg-muted">
                      Investor Pool
                    </p>
                    <p className="mt-1 text-sm font-semibold text-fg">
                      {formatCurrency(
                        selectedDistribution.investor_pool_amount,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-fg-muted">
                      Total Allocation
                    </p>
                    <p className="mt-1 text-sm font-semibold text-fg">
                      {formatCurrency(totalAllocated)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <h2 className="font-semibold text-fg">
                Pilih Distribusi
              </h2>
            )}
          </div>

          {selectedDistribution && allocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-fg-muted">
                    <th className="px-5 py-3 font-medium">
                      Investor
                    </th>
                    <th className="px-5 py-3 font-medium">
                      Kepemilikan
                    </th>
                    <th className="px-5 py-3 font-medium">
                      Allocation
                    </th>
                    <th className="px-5 py-3 font-medium">
                      Status
                    </th>
                    <th className="px-5 py-3 font-medium">
                      Reference
                    </th>
                    <th className="px-5 py-3 font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {allocations.map((allocation) => {
                    const busy =
                      busyAllocationId === allocation.id

                    const canPay =
                      allocation.status === 'payable'

                    const hasProof =
                      allocation.status === 'paid' ||
                      Boolean(
                        allocation.payment_reference,
                      )

                    return (
                      <tr key={allocation.id}>
                        <td className="px-5 py-4">
                          <p className="font-medium text-fg">
                            Investor
                          </p>

                          <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                            {allocation.investor_id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {(allocation.ownership_bps / 100).toFixed(
                            2,
                          )}
                          %
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {formatCurrency(
                            allocation.allocation_amount,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={[
                              'rounded-full border px-2 py-1 text-[11px] font-medium',
                              statusClass(
                                allocation.status,
                              ),
                            ].join(' ')}
                          >
                            {statusLabel(
                              allocation.status,
                            )}
                          </span>

                          {allocation.paid_at ? (
                            <p className="mt-1 text-[11px] text-fg-subtle">
                              {formatDate(
                                allocation.paid_at,
                              )}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4">
                          <input
                            value={
                              referenceByAllocation[
                                allocation.id
                              ] ??
                              allocation.payment_reference ??
                              ''
                            }
                            onChange={(event) =>
                              setReferenceByAllocation(
                                (current) => ({
                                  ...current,
                                  [allocation.id]:
                                    event.target.value,
                                }),
                              )
                            }
                            maxLength={200}
                            placeholder="No. referensi"
                            className="h-9 w-44 rounded-lg border border-border bg-background px-3 text-xs text-fg outline-none focus:border-primary-solid"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {permissions.uploadProof &&
                            canPay ? (
                              <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border px-3 text-xs font-medium text-fg hover:bg-muted">
                                {busy
                                  ? 'Uploading...'
                                  : 'Upload Bukti'}

                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  disabled={busy}
                                  onChange={(event) => {
                                    const file =
                                      event.target
                                        .files?.[0]

                                    event.currentTarget.value =
                                      ''

                                    if (file) {
                                      void uploadProof(
                                        allocation.id,
                                        file,
                                      )
                                    }
                                  }}
                                />
                              </label>
                            ) : null}

                            {hasProof ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void inspectProof(
                                      allocation.id,
                                    )
                                  }
                                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-fg hover:bg-muted disabled:opacity-50"
                                >
                                  Cek Bukti
                                </button>

                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void openProof(
                                      allocation.id,
                                    )
                                  }
                                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-fg hover:bg-muted disabled:opacity-50"
                                >
                                  Buka Bukti
                                </button>
                              </>
                            ) : null}

                            {permissions.markPaid &&
                            canPay ? (
                              <button
                                type="button"
                                disabled={busy || isPending}
                                onClick={() =>
                                  void markPaid(
                                    allocation.id,
                                  )
                                }
                                className="inline-flex h-9 items-center rounded-lg bg-primary-solid px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                              >
                                {busy
                                  ? 'Memproses...'
                                  : 'Mark Paid'}
                              </button>
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
            <div className="p-8 text-center text-sm text-fg-muted">
              Belum ada allocation untuk distribusi ini.
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-fg-muted">
              Pilih distribusi di sebelah kiri.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

