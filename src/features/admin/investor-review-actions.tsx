'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  approveInvestor,
  activateInvestor,
  deactivateInvestor,
  reactivateInvestor,
  rejectInvestor,
  startInvestorReview,
} from '@/server/investors/admin-actions'
import type { InvestorStatus } from '@/core/investors/status'
import { INVESTOR_STATUS_LABELS } from '@/core/investors/status'
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

type ActionName =
  | 'startReview'
  | 'approve'
  | 'reject'
  | 'activate'
  | 'deactivate'
  | 'reactivate'

type WorkflowAction = {
  name: ActionName
  label: string
  target: InvestorStatus
  consequence: string
  variant: 'primary' | 'secondary' | 'danger'
}

const ACTIONS: Record<ActionName, WorkflowAction> = {
  startReview: {
    name: 'startReview', label: 'Mulai peninjauan', target: 'under_review',
    consequence: 'Pengajuan akan masuk ke tahap peninjauan oleh tim Investor Relations.', variant: 'primary',
  },
  approve: {
    name: 'approve', label: 'Setujui', target: 'approved',
    consequence: 'Pengajuan akan disetujui dan akses materi investor dibuka sesuai kebijakan.', variant: 'primary',
  },
  reject: {
    name: 'reject', label: 'Tolak', target: 'rejected',
    consequence: 'Pengajuan akan ditolak. Riwayat pengajuan tetap tersimpan.', variant: 'danger',
  },
  activate: {
    name: 'activate', label: 'Aktifkan', target: 'active',
    consequence: 'Investor akan menjadi aktif sesuai akses yang telah diberikan.', variant: 'primary',
  },
  deactivate: {
    name: 'deactivate', label: 'Nonaktifkan', target: 'inactive',
    consequence: 'Akses investor dihentikan sementara; riwayat dan dokumen tetap tersimpan.', variant: 'danger',
  },
  reactivate: {
    name: 'reactivate', label: 'Aktifkan kembali', target: 'active',
    consequence: 'Akses investor akan dipulihkan sesuai akses yang telah diberikan.', variant: 'primary',
  },
}

function allowedActions(status: InvestorStatus, permissions: readonly string[]): WorkflowAction[] {
  const can = (permission: string) => permissions.includes(permission)
  switch (status) {
    case 'submitted': return [can('investors.update') ? ACTIONS.startReview : null, can('investors.reject') ? ACTIONS.reject : null].filter(Boolean) as WorkflowAction[]
    case 'under_review': return [can('investors.approve') ? ACTIONS.approve : null, can('investors.reject') ? ACTIONS.reject : null].filter(Boolean) as WorkflowAction[]
    case 'approved': return [can('investors.update') ? ACTIONS.activate : null, can('investors.reject') ? ACTIONS.reject : null].filter(Boolean) as WorkflowAction[]
    case 'active': return can('investors.deactivate') ? [ACTIONS.deactivate] : []
    case 'inactive': return can('investors.reactivate') ? [ACTIONS.reactivate] : []
    case 'rejected': return can('investors.update') ? [ACTIONS.startReview] : []
    default: return []
  }
}

const actionHandlers = {
  startReview: startInvestorReview,
  approve: approveInvestor,
  reject: rejectInvestor,
  activate: activateInvestor,
  deactivate: deactivateInvestor,
  reactivate: reactivateInvestor,
} as const

export function InvestorReviewActions({
  investorId,
  investorName,
  status,
  permissions,
}: {
  investorId: string
  investorName: string
  status: InvestorStatus
  permissions: readonly string[]
}) {
  const router = useRouter()
  const { push } = useToast()
  const [selected, setSelected] = useState<WorkflowAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const actions = allowedActions(status, permissions)

  function confirm() {
    if (!selected || pending) return
    setError(null)
    startTransition(async () => {
      const result = await actionHandlers[selected.name]({ investorId })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setSelected(null)
      push({ tone: 'success', title: 'Status investor diperbarui', description: `${investorName} kini ${INVESTOR_STATUS_LABELS[selected.target].toLowerCase()}.` })
      router.refresh()
    })
  }

  if (!actions.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.name} variant={action.variant} onClick={() => { setError(null); setSelected(action) }}>
          {action.label}
        </Button>
      ))}

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !pending) { setSelected(null); setError(null) } }}>
        <DialogContent size="sm" showClose={!pending}>
          {selected ? <>
            <DialogHeader>
              <DialogTitle>{selected.label} investor?</DialogTitle>
              <DialogDescription>
                Anda akan mengubah status <strong>{investorName}</strong> dari {INVESTOR_STATUS_LABELS[status].toLowerCase()} menjadi {INVESTOR_STATUS_LABELS[selected.target].toLowerCase()}.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-md border border-border bg-sunken p-3 text-body-sm text-fg-muted">{selected.consequence}</p>
            {error ? <Alert tone="danger" title="Aksi tidak dapat diselesaikan">{error}</Alert> : null}
            <DialogFooter>
              <DialogClose asChild><Button variant="secondary" disabled={pending}>Batal</Button></DialogClose>
              <Button variant={selected.variant} loading={pending} onClick={confirm}>{selected.label}</Button>
            </DialogFooter>
          </> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
