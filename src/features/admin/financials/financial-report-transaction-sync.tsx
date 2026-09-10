'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { syncFinancialReportFromTransactions } from '@/server/financials/report-actions'
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

export function FinancialReportTransactionSync({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const result = await syncFinancialReportFromTransactions({ reportId })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Sinkronkan dari transaksi
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            setOpen(next)
            if (!next) setError(null)
          }
        }}
      >
        <DialogContent size="sm" showClose={!pending}>
          <DialogHeader>
            <DialogTitle>Sinkronkan laporan dari transaksi?</DialogTitle>
            <DialogDescription>
              Pos laporan dan KPI draft akan dihitung ulang dari invoice, pembayaran, refund, pengeluaran, dan jumlah pax pada periode laporan. Lampiran yang sudah dipilih tetap dipertahankan.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert tone="danger" title="Sinkronisasi gagal">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={pending}>
                Batal
              </Button>
            </DialogClose>
            <Button loading={pending} onClick={confirm}>
              Hitung & sinkronkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
