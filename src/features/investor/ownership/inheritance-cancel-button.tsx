'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { cancelInheritanceAction } from '@/server/ownership/inheritance-actions'

export function InheritanceCancelButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        className="min-h-9 rounded-md border border-border px-3 text-body-sm font-medium disabled:opacity-50"
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await cancelInheritanceAction({ requestId })
            if (!result.ok) {
              setError(result.error.message)
              return
            }
            router.refresh()
          })
        }}
      >
        {pending ? 'Membatalkan…' : 'Batalkan Pengajuan'}
      </button>
      {error ? <p className="text-caption text-danger">{error}</p> : null}
    </div>
  )
}
