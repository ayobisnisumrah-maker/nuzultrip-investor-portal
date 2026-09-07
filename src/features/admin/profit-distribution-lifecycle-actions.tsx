'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  approveProfitDistributionAction,
  publishProfitDistributionAction,
  regenerateProfitDistributionAllocationsAction,
  submitProfitDistributionForReviewAction,
} from '@/server/ownership/profit-distribution-lifecycle-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'

type Props = {
  distributionId: string
  status: 'draft' | 'review' | 'approved' | 'payable' | 'paid' | 'cancelled'
  permissions: readonly string[]
}

export function ProfitDistributionLifecycleActions({ distributionId, status, permissions }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const canUpdate = permissions.includes('profit_distributions.update')
  const canApprove = permissions.includes('profit_distributions.approve')
  const canPublish = permissions.includes('profit_distributions.publish')

  function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error?.message ?? 'Aksi tidak dapat diselesaikan.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {(status === 'draft' || status === 'review') && canUpdate ? (
          <Button variant="secondary" loading={pending} onClick={() => run(() => regenerateProfitDistributionAllocationsAction({ distributionId }))}>
            Hitung ulang allocation
          </Button>
        ) : null}
        {status === 'draft' && canUpdate ? (
          <Button loading={pending} onClick={() => run(() => submitProfitDistributionForReviewAction({ distributionId }))}>
            Kirim untuk review
          </Button>
        ) : null}
        {status === 'review' && canApprove ? (
          <Button loading={pending} onClick={() => run(() => approveProfitDistributionAction({ distributionId }))}>
            Setujui distribusi
          </Button>
        ) : null}
        {status === 'approved' && canPublish ? (
          <Button loading={pending} onClick={() => run(() => publishProfitDistributionAction({ distributionId }))}>
            Terbitkan / Siap dibayar
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="danger" title="Lifecycle tidak dapat diperbarui">{error}</Alert> : null}
    </div>
  )
}
