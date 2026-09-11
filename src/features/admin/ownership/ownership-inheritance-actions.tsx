'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  approveInheritanceAction,
  completeInheritanceAction,
  rejectInheritanceAction,
} from '@/server/ownership/inheritance-actions'
import type { InheritanceRequest } from '@/server/ownership/inheritance-service'

type InvestorOption = {
  id: string
  legalName: string
  referenceCode: string
}

export function OwnershipInheritanceActions({
  request,
  permissions,
  investors,
}: {
  request: InheritanceRequest
  permissions: string[]
  investors: InvestorOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [beneficiaryInvestorId, setBeneficiaryInvestorId] = useState('')
  const router = useRouter()

  const canReview = permissions.includes('ownership_inheritance.approve')

  const run = (operation: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
    setError(null)
    startTransition(async () => {
      const result = await operation()
      if (!result.ok) {
        setError(result.error?.message ?? 'Operasi pewarisan gagal diproses.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      {request.status === 'pending' && canReview ? (
        <button
          type="button"
          disabled={pending}
          className="min-h-10 rounded-md bg-fg px-4 text-body-sm font-semibold text-bg disabled:opacity-50"
          onClick={() => run(() => approveInheritanceAction({ requestId: request.id }))}
        >
          {pending ? 'Memproses…' : 'Setujui Pengajuan'}
        </button>
      ) : null}

      {['pending', 'approved'].includes(request.status) && canReview ? (
        <div className="grid gap-2">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Alasan penolakan"
            maxLength={5000}
            className="min-h-20 rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
          />
          <button
            type="button"
            disabled={pending || reason.trim().length === 0}
            className="min-h-10 rounded-md border border-border px-4 text-body-sm font-semibold disabled:opacity-50"
            onClick={() =>
              run(() =>
                rejectInheritanceAction({
                  requestId: request.id,
                  reason,
                }),
              )
            }
          >
            Tolak Pengajuan
          </button>
        </div>
      ) : null}

      {request.status === 'approved' && canReview ? (
        <div className="grid gap-2">
          <label className="grid gap-1 text-body-sm">
            Investor penerima resmi
            <select
              value={beneficiaryInvestorId}
              onChange={(event) => setBeneficiaryInvestorId(event.target.value)}
              className="min-h-10 rounded-md border border-border bg-surface px-3"
            >
              <option value="">Pilih investor penerima</option>
              {investors
                .filter((investor) => investor.id !== request.current_investor_id)
                .map((investor) => (
                  <option key={investor.id} value={investor.id}>
                    {investor.legalName} · {investor.referenceCode}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !beneficiaryInvestorId}
            className="min-h-10 rounded-md bg-fg px-4 text-body-sm font-semibold text-bg disabled:opacity-50"
            onClick={() =>
              run(() =>
                completeInheritanceAction({
                  requestId: request.id,
                  beneficiaryInvestorId,
                }),
              )
            }
          >
            Selesaikan Pewarisan
          </button>
        </div>
      ) : null}

      {error ? <p className="text-caption text-danger">{error}</p> : null}
    </div>
  )
}
