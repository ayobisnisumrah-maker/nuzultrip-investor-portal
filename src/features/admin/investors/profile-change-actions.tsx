'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  applyInvestorProfileChangeRequest,
  reviewInvestorProfileChangeRequest,
} from '@/server/investors/profile-change-actions'

export function InvestorProfileChangeActions({
  requestId,
  status,
}: {
  requestId: string
  status: string
}) {
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const run = (operation: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
    setError(null)
    startTransition(async () => {
      const result = await operation()
      if (!result.ok) {
        setError(result.error?.message ?? 'Operasi gagal diproses.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid gap-2">
      {status === 'pending' ? (
        <>
          <button
            type="button"
            disabled={pending}
            className="min-h-10 rounded-md bg-fg px-4 text-body-sm font-semibold text-bg disabled:opacity-50"
            onClick={() =>
              run(() =>
                reviewInvestorProfileChangeRequest({ requestId, decision: 'approved', note: note || null }),
              )
            }
          >
            {pending ? 'Memproses…' : 'Setujui Pengajuan'}
          </button>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
            placeholder="Catatan review / alasan penolakan"
            className="min-h-20 rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            className="min-h-10 rounded-md border border-border px-4 text-body-sm font-semibold disabled:opacity-50"
            onClick={() =>
              run(() =>
                reviewInvestorProfileChangeRequest({ requestId, decision: 'rejected', note }),
              )
            }
          >
            Tolak Pengajuan
          </button>
        </>
      ) : null}

      {status === 'approved' ? (
        <button
          type="button"
          disabled={pending}
          className="min-h-10 rounded-md bg-fg px-4 text-body-sm font-semibold text-bg disabled:opacity-50"
          onClick={() => run(() => applyInvestorProfileChangeRequest({ requestId }))}
        >
          {pending ? 'Menerapkan…' : 'Terapkan Perubahan'}
        </button>
      ) : null}

      {error ? <p className="text-caption text-danger">{error}</p> : null}
    </div>
  )
}
