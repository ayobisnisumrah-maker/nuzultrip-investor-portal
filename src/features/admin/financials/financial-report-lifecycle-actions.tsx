'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  approveFinancialReport,
  publishFinancialReport,
  submitFinancialReportForReview,
} from '@/server/financials/report-actions'
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

type Status = 'draft' | 'review' | 'approved' | 'published' | 'archived'
type ActionKey = 'review' | 'approve' | 'publish'

const config = {
  review: { label: 'Kirim untuk peninjauan', target: 'review', permission: 'financial_reports.review', handler: submitFinancialReportForReview },
  approve: { label: 'Setujui laporan', target: 'approved', permission: 'financial_reports.approve', handler: approveFinancialReport },
  publish: { label: 'Terbitkan ke investor', target: 'published', permission: 'financial_reports.publish', handler: publishFinancialReport },
} as const

export function FinancialReportLifecycleActions({ reportId, title, status, permissions }: { reportId: string; title: string; status: Status; permissions: readonly string[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ActionKey | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const key: ActionKey | null = status === 'draft' ? 'review' : status === 'review' ? 'approve' : status === 'approved' ? 'publish' : null
  if (!key || !permissions.includes(config[key].permission)) return null
  const action = config[key]

  function confirm() {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const result = await action.handler({ reportId })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setSelected(null)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setSelected(key)}>{action.label}</Button>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !pending) { setSelected(null); setError(null) } }}>
        <DialogContent size="sm" showClose={!pending}>
          <DialogHeader>
            <DialogTitle>{action.label}?</DialogTitle>
            <DialogDescription>Anda akan mengubah lifecycle <strong>{title}</strong> menjadi <strong>{action.target}</strong>.</DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger" title="Aksi tidak dapat diselesaikan">{error}</Alert> : null}
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary" disabled={pending}>Batal</Button></DialogClose>
            <Button loading={pending} onClick={confirm}>{action.label}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
