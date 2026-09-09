'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { FinancialPeriodStatus } from '@/core/financials/periods'
import { changeFinancialPeriodStatus } from '@/server/financials/period-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'

type Props = {
  periodId: string
  status: FinancialPeriodStatus
  canClose: boolean
}

export function FinancialPeriodStatusActions({ periodId, status, canClose }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!canClose || status === 'locked') return null

  function changeStatus(nextStatus: 'closed' | 'locked') {
    if (pending) return
    setError(null)

    startTransition(async () => {
      const result = await changeFinancialPeriodStatus({ periodId, status: nextStatus })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      {error ? <Alert tone="danger" title="Status tidak dapat diubah">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {status === 'open' ? (
          <Button variant="secondary" disabled={pending} onClick={() => changeStatus('closed')}>
            Tutup periode
          </Button>
        ) : null}
        {(status === 'open' || status === 'closed') ? (
          <Button disabled={pending} loading={pending} onClick={() => changeStatus('locked')}>
            Kunci periode
          </Button>
        ) : null}
      </div>
    </div>
  )
}
