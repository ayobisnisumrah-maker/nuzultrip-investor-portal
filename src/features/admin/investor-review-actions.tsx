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

type ActionName = 'startReview' | 'approve' | 'reject' | 'activate' | 'deactivate' | 'reactivate'

type WorkflowAction = {
  name: ActionName
  label: string
  target: InvestorStatus
  consequence: string
  variant: 'primary' | 'secondary' | 'danger'
}

const ACTIONS: Record<ActionName, WorkflowAction> = {
  startReview: {
    name: 'startReview',
    label: 'Mulai peninjauan',
    target: 'under_review',
    consequence: 'Pengajuan akan masuk ke tahap peninjauan oleh tim Investor Relations.',
    variant: 'primary',
  },
  approve: {
    name: 'approve',
    label: 'Setujui',
    target: 'approved',
    consequence: 'Pengajuan akan disetujui dan akses materi investor dibuka sesuai kebijakan.',
    variant: 'primary',
  },
  reject: {
    name: 'reject',
    label: 'Tolak',
    target: 'rejected',
    consequence: 'Pengajuan akan ditolak. Riwayat pengajuan tetap tersimpan.',
    variant: 'danger',
  },
  activate: {
    name: 'activate',
    label: 'Aktifkan',
    target: 'active',
    consequence: 'Investor akan menjadi aktif sesuai akses yang telah diberikan.',
    variant: 'primary',
  },
  deactivate: {
    name: 'deactivate',
    label: 'Nonaktifkan',
    target: 'inactive',
    consequence: 'Akses investor dihentikan sementara; riwayat dan dokumen tetap tersimpan.',
    variant: 'danger',
  },
  reactivate: {
    name: 'reactivate',
    label: 'Aktifkan kembali',
    target: 'active',
    consequence: 'Akses investor akan dipulihkan sesuai akses yang telah diberikan.',
    variant: 'primary',
  },
}

function allowedActions(status: InvestorStatus, permissions: readonly string[]): WorkflowAction[] {
  const can = (permission: string) => permissions.includes(permission)

  switch (status) {
    case 'prospective':
      return []

    case 'submitted':
      return [
        can('investors.update') ? ACTIONS.startReview : null,
        can('investors.reject') ? ACTIONS.reject : null,
      ].filter(Boolean) as WorkflowAction[]

    case 'under_review':
      return [
        can('investors.approve') ? ACTIONS.approve : null,
        can('investors.reject') ? ACTIONS.reject : null,
      ].filter(Boolean) as WorkflowAction[]

    case 'approved':
      return [
        can('investors.update') ? ACTIONS.activate : null,
        can('investors.reject') ? ACTIONS.reject : null,
      ].filter(Boolean) as WorkflowAction[]

    case 'active':
      return can('investors.deactivate') ? [ACTIONS.deactivate] : []

    case 'inactive':
      return can('investors.reactivate') ? [ACTIONS.reactivate] : []

    case 'rejected':
      return can('investors.update') ? [ACTIONS.startReview] : []

    default:
      return []
  }
}

const actionHandlers = {
  startReview: startInvestorReview,
  approve: approveInvestor,
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

  const [rejectionReason, setRejectionReason] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [pending, startTransition] = useTransition()

  const actions = allowedActions(status, permissions)

  function closeDialog() {
    if (pending) return

    setSelected(null)
    setRejectionReason('')
    setError(null)
  }

  function confirm() {
    if (!selected || pending) return

    if (selected.name === 'reject' && !rejectionReason.trim()) {
      setError('Alasan penolakan wajib diisi.')
      return
    }

    setError(null)

    startTransition(async () => {
      const actionLabel = selected.label

      try {
        let result

        if (selected.name === 'reject') {
          result = await rejectInvestor({
            investorId,
            rejectionReason: rejectionReason.trim(),
          })
        } else {
          result = await actionHandlers[selected.name]({
            investorId,
          })
        }

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        const targetLabel = INVESTOR_STATUS_LABELS[selected.target]

        setSelected(null)
        setRejectionReason('')

        push({
          tone: 'success',
          title: 'Status investor diperbarui',
          description: `${investorName} kini ${targetLabel.toLowerCase()}.`,
        })

        router.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : `Gagal menjalankan aksi "${actionLabel}".`,
        )
      }
    })
  }

  if (!actions.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.name}
          variant={action.variant}
          disabled={pending}
          onClick={() => {
            setError(null)
            setRejectionReason('')
            setSelected(action)
          }}
        >
          {action.label}
        </Button>
      ))}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog()
          }
        }}
      >
        <DialogContent size="sm" showClose={!pending}>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.label} investor?</DialogTitle>

                <DialogDescription>
                  Anda akan mengubah status <strong>{investorName}</strong> dari{' '}
                  {INVESTOR_STATUS_LABELS[status].toLowerCase()} menjadi{' '}
                  {INVESTOR_STATUS_LABELS[selected.target].toLowerCase()}.
                </DialogDescription>
              </DialogHeader>

              <p className="border-border bg-sunken text-body-sm text-fg-muted rounded-md border p-3">
                {selected.consequence}
              </p>

              {selected.name === 'reject' ? (
                <div className="space-y-2">
                  <label
                    htmlFor="investor-rejection-reason"
                    className="text-body-sm text-fg font-medium"
                  >
                    Alasan penolakan
                  </label>

                  <textarea
                    id="investor-rejection-reason"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    maxLength={2000}
                    rows={5}
                    disabled={pending}
                    placeholder="Masukkan alasan penolakan..."
                    className="border-border bg-background text-body-sm text-fg focus:border-primary w-full rounded-md border px-3 py-2 transition outline-none disabled:opacity-50"
                  />

                  <div className="text-fg-muted text-right text-xs">
                    {rejectionReason.length}/2000
                  </div>
                </div>
              ) : null}

              {error ? (
                <Alert tone="danger" title="Aksi tidak dapat diselesaikan">
                  {error}
                </Alert>
              ) : null}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" disabled={pending}>
                    Batal
                  </Button>
                </DialogClose>

                <Button
                  variant={selected.variant}
                  loading={pending}
                  disabled={selected.name === 'reject' && !rejectionReason.trim()}
                  onClick={confirm}
                >
                  {selected.label}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
