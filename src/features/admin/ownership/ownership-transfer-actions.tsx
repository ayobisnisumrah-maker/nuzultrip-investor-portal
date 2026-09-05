'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  approveOwnershipSaleAction,
  completeOwnershipSaleAction,
  processOwnershipSaleAction,
  rejectOwnershipSaleAction,
} from '@/server/ownership/transfer-actions'
import type {
  OwnershipSaleTransfer,
  OwnershipTransferStatus,
} from '@/server/ownership/transfer-service'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog'
import { useToast } from '@/ui/toast'

type BuyerOption = {
  id: string
  legalName: string
  referenceCode: string
}

type ActionKey = 'approve' | 'reject' | 'process' | 'complete'

type Props = {
  transfer: OwnershipSaleTransfer
  sellerName: string
  permissions: readonly string[]
  buyers: BuyerOption[]
}

const STATUS_LABELS: Record<OwnershipTransferStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  processing: 'Dalam Proses',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

function hasPermission(
  permissions: readonly string[],
  permission: string,
) {
  return permissions.includes(permission)
}

function availableActions(
  status: OwnershipTransferStatus,
  permissions: readonly string[],
): ActionKey[] {
  switch (status) {
    case 'pending':
      return [
        hasPermission(
          permissions,
          'ownership_transfers.approve',
        )
          ? 'approve'
          : null,
        hasPermission(
          permissions,
          'ownership_transfers.reject',
        )
          ? 'reject'
          : null,
      ].filter(Boolean) as ActionKey[]

    case 'approved':
      return [
        hasPermission(
          permissions,
          'ownership_transfers.process',
        )
          ? 'process'
          : null,
        hasPermission(
          permissions,
          'ownership_transfers.reject',
        )
          ? 'reject'
          : null,
      ].filter(Boolean) as ActionKey[]

    case 'processing':
      return hasPermission(
        permissions,
        'ownership_transfers.complete',
      )
        ? ['complete']
        : []

    default:
      return []
  }
}

export function OwnershipTransferActions({
  transfer,
  sellerName,
  permissions,
  buyers,
}: Props) {
  const router = useRouter()
  const { push } = useToast()

  const [selected, setSelected] =
    useState<ActionKey | null>(null)
  const [reason, setReason] = useState('')
  const [buyerId, setBuyerId] = useState('')
  const [agreedUnitPrice, setAgreedUnitPrice] =
    useState(
      transfer.requested_unit_price
        ? String(transfer.requested_unit_price)
        : '',
    )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const actions = useMemo(
    () => availableActions(transfer.status, permissions),
    [transfer.status, permissions],
  )

  const eligibleBuyers = buyers.filter(
    (buyer) => buyer.id !== transfer.from_investor_id,
  )

  if (actions.length === 0) {
    return null
  }

  function closeDialog() {
    if (pending) return

    setSelected(null)
    setReason('')
    setBuyerId('')
    setAgreedUnitPrice(
      transfer.requested_unit_price
        ? String(transfer.requested_unit_price)
        : '',
    )
    setError(null)
  }

  function runAction() {
    if (!selected || pending) return

    if (selected === 'reject' && !reason.trim()) {
      setError('Alasan penolakan wajib diisi.')
      return
    }

    if (selected === 'process') {
      if (!buyerId) {
        setError('Pembeli wajib dipilih.')
        return
      }

      const price = Number(agreedUnitPrice)

      if (!Number.isFinite(price) || price <= 0) {
        setError('Harga kesepakatan harus lebih dari 0.')
        return
      }
    }

    setError(null)

    startTransition(async () => {
      try {
        let result

        switch (selected) {
          case 'approve':
            result = await approveOwnershipSaleAction({
              transferId: transfer.id,
            })
            break

          case 'reject':
            result = await rejectOwnershipSaleAction({
              transferId: transfer.id,
              reason: reason.trim(),
            })
            break

          case 'process':
            result = await processOwnershipSaleAction({
              transferId: transfer.id,
              toInvestorId: buyerId,
              agreedUnitPrice: Number(agreedUnitPrice),
            })
            break

          case 'complete':
            result = await completeOwnershipSaleAction({
              transferId: transfer.id,
            })
            break
        }

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        const successTitle =
          selected === 'approve'
            ? 'Penjualan saham disetujui'
            : selected === 'reject'
              ? 'Penjualan saham ditolak'
              : selected === 'process'
                ? 'Penjualan masuk tahap proses'
                : 'Penjualan saham selesai'

        setSelected(null)
        setReason('')
        setBuyerId('')

        push({
          tone: 'success',
          title: successTitle,
          description: `Permintaan penjualan milik ${sellerName} berhasil diperbarui.`,
        })

        router.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Aksi penjualan saham tidak dapat diselesaikan.',
        )
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.includes('approve') ? (
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => setSelected('approve')}
          >
            Setujui
          </Button>
        ) : null}

        {actions.includes('process') ? (
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => setSelected('process')}
          >
            Proses
          </Button>
        ) : null}

        {actions.includes('complete') ? (
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => setSelected('complete')}
          >
            Selesaikan
          </Button>
        ) : null}

        {actions.includes('reject') ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => setSelected('reject')}
          >
            Tolak
          </Button>
        ) : null}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent size="sm" showClose={!pending}>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected === 'approve'
                    ? 'Setujui penjualan saham?'
                    : selected === 'reject'
                      ? 'Tolak penjualan saham?'
                      : selected === 'process'
                        ? 'Proses penjualan saham'
                        : 'Selesaikan penjualan saham?'}
                </DialogTitle>

                <DialogDescription>
                  Permintaan milik{' '}
                  <strong>{sellerName}</strong> saat ini berstatus{' '}
                  {STATUS_LABELS[
                    transfer.status
                  ].toLowerCase()}.
                </DialogDescription>
              </DialogHeader>

              {selected === 'approve' ? (
                <p className="border-border bg-sunken text-body-sm text-fg-muted rounded-md border p-3">
                  Persetujuan belum memindahkan kepemilikan.
                  Saham baru akan dialihkan setelah tahap proses
                  dan penyelesaian selesai.
                </p>
              ) : null}

              {selected === 'reject' ? (
                <div className="space-y-2">
                  <label
                    htmlFor={`reject-${transfer.id}`}
                    className="text-body-sm font-medium"
                  >
                    Alasan penolakan
                  </label>

                  <textarea
                    id={`reject-${transfer.id}`}
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    rows={5}
                    maxLength={5000}
                    disabled={pending}
                    placeholder="Masukkan alasan penolakan..."
                    className="border-border bg-background text-body-sm text-fg focus:border-primary w-full rounded-md border px-3 py-2 outline-none"
                  />
                </div>
              ) : null}

              {selected === 'process' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor={`buyer-${transfer.id}`}
                      className="text-body-sm font-medium"
                    >
                      Investor pembeli
                    </label>

                    <select
                      id={`buyer-${transfer.id}`}
                      value={buyerId}
                      onChange={(event) =>
                        setBuyerId(event.target.value)
                      }
                      disabled={pending}
                      className="border-border bg-background text-body-sm text-fg focus:border-primary w-full rounded-md border px-3 py-2 outline-none"
                    >
                      <option value="">
                        Pilih investor pembeli
                      </option>

                      {eligibleBuyers.map((buyer) => (
                        <option
                          key={buyer.id}
                          value={buyer.id}
                        >
                          {buyer.legalName} ·{' '}
                          {buyer.referenceCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={`price-${transfer.id}`}
                      className="text-body-sm font-medium"
                    >
                      Harga kesepakatan per unit
                    </label>

                    <input
                      id={`price-${transfer.id}`}
                      type="number"
                      min={1}
                      step="0.01"
                      value={agreedUnitPrice}
                      onChange={(event) =>
                        setAgreedUnitPrice(
                          event.target.value,
                        )
                      }
                      disabled={pending}
                      className="border-border bg-background text-body-sm text-fg focus:border-primary w-full rounded-md border px-3 py-2 outline-none"
                    />
                  </div>

                  <p className="border-border bg-sunken text-body-sm text-fg-muted rounded-md border p-3">
                    Tahap ini menetapkan pembeli dan harga
                    kesepakatan. Kepemilikan belum berpindah
                    sampai transaksi diselesaikan.
                  </p>
                </div>
              ) : null}

              {selected === 'complete' ? (
                <Alert
                  tone="warning"
                  title="Penyelesaian memindahkan kepemilikan"
                >
                  Setelah diselesaikan, unit akan dialihkan dari
                  penjual kepada pembeli dan holding baru pembeli
                  akan tercatat. Pastikan seluruh transaksi telah
                  diverifikasi.
                </Alert>
              ) : null}

              {error ? (
                <Alert
                  tone="danger"
                  title="Aksi tidak dapat diselesaikan"
                >
                  {error}
                </Alert>
              ) : null}

              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant="secondary"
                    disabled={pending}
                  >
                    Batal
                  </Button>
                </DialogClose>

                <Button
                  variant={
                    selected === 'reject'
                      ? 'danger'
                      : 'primary'
                  }
                  loading={pending}
                  onClick={runAction}
                >
                  {selected === 'approve'
                    ? 'Setujui'
                    : selected === 'reject'
                      ? 'Tolak'
                      : selected === 'process'
                        ? 'Mulai Proses'
                        : 'Selesaikan'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
