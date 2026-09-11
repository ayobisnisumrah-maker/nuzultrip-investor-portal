'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { topics } from '@/core/realtime/events'
import { useRealtime } from '@/features/realtime/realtime-provider'
import { useRealtimeTopic } from '@/features/realtime/use-realtime-topic'
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

const AUTO_SYNC_DEBOUNCE_MS = 400

export function FinancialReportTransactionSync({ reportId }: { reportId: string }) {
  const router = useRouter()
  const { resumeToken } = useRealtime()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [autoSyncing, setAutoSyncing] = useState(false)
  const autoSyncInFlight = useRef(false)
  const autoSyncQueued = useRef(false)
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenResumeToken = useRef(resumeToken)

  const runAutoSync = useCallback(async () => {
    if (autoSyncInFlight.current) {
      autoSyncQueued.current = true
      return
    }

    autoSyncInFlight.current = true
    setAutoSyncing(true)
    setError(null)
    try {
      do {
        autoSyncQueued.current = false
        const result = await syncFinancialReportFromTransactions({ reportId })
        if (!result.ok) {
          setError(result.error.message)
          return
        }
        router.refresh()
      } while (autoSyncQueued.current)
    } finally {
      autoSyncInFlight.current = false
      setAutoSyncing(false)
    }
  }, [reportId, router])

  const scheduleAutoSync = useCallback(() => {
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current)
    autoSyncTimer.current = setTimeout(() => {
      autoSyncTimer.current = null
      void runAutoSync()
    }, AUTO_SYNC_DEBOUNCE_MS)
  }, [runAutoSync])

  useRealtimeTopic(topics.admin(), {
    'finance.transaction_changed': scheduleAutoSync,
  })

  useEffect(() => {
    if (resumeToken !== seenResumeToken.current) {
      seenResumeToken.current = resumeToken
      scheduleAutoSync()
    }
  }, [resumeToken, scheduleAutoSync])

  useEffect(
    () => () => {
      if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current)
    },
    [],
  )

  function confirm() {
    if (pending || autoSyncing) return
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
      <div className="flex items-center gap-2">
        <span className="text-caption text-fg-subtle">
          {autoSyncing ? 'Menyinkronkan realtime…' : 'Sinkron realtime aktif'}
        </span>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={autoSyncing}>
          Sinkronkan sekarang
        </Button>
      </div>
      {error && !open ? (
        <Alert tone="danger" title="Sinkronisasi realtime gagal">
          {error}
        </Alert>
      ) : null}
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
            <DialogTitle>Sinkronkan laporan dari transaksi sekarang?</DialogTitle>
            <DialogDescription>
              Sistem sudah menyinkronkan draft secara otomatis ketika invoice, pembayaran, refund, atau pengeluaran berubah. Tindakan ini menjalankan sinkronisasi ulang segera sebagai verifikasi manual; lampiran dan pos manual tetap dipertahankan.
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
            <Button loading={pending} disabled={autoSyncing} onClick={confirm}>
              Sinkronkan sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
