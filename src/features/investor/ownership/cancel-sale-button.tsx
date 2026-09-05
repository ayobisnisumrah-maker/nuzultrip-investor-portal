'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { cancelOwnershipSaleRequestAction } from '@/server/ownership/transfer-actions'
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

export function CancelSaleButton({
  transferId,
  units,
}: {
  transferId: string
  units: number
}) {
  const router = useRouter()
  const { push } = useToast()

  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    if (pending) return

    setError(null)

    startTransition(async () => {
      try {
        const result = await cancelOwnershipSaleRequestAction({
          transferId,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        setOpen(false)

        push({
          tone: 'success',
          title: 'Pengajuan dibatalkan',
          description: `${units.toLocaleString(
            'id-ID',
          )} unit kembali tersedia untuk diajukan.`,
        })

        router.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Pengajuan penjualan tidak dapat dibatalkan.',
        )
      }
    })
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        Batalkan Pengajuan
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!pending) {
            setOpen(nextOpen)
            setError(null)
          }
        }}
      >
        <DialogContent size="sm" showClose={!pending}>
          <DialogHeader>
            <DialogTitle>
              Batalkan pengajuan penjualan?
            </DialogTitle>

            <DialogDescription>
              Pengajuan penjualan{' '}
              <strong>
                {units.toLocaleString('id-ID')} unit
              </strong>{' '}
              akan dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <p className="border-border bg-sunken text-body-sm text-fg-muted rounded-md border p-3">
            Pembatalan hanya dapat dilakukan selama pengajuan
            masih berstatus Menunggu Persetujuan. Unit tidak
            dihapus dari kepemilikan dan akan kembali tersedia
            untuk diajukan.
          </p>

          {error ? (
            <Alert
              tone="danger"
              title="Pengajuan tidak dapat dibatalkan"
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
                Kembali
              </Button>
            </DialogClose>

            <Button
              variant="danger"
              loading={pending}
              onClick={confirm}
            >
              Batalkan Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
