'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { sendInvestorMessage } from '@/server/messaging/investor-actions'
import { Button } from '@/ui/button'
import { Alert } from '@/ui/alert'

export function InvestorMessageComposer({ threadId, disabled }: { threadId: string; disabled?: boolean }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await sendInvestorMessage({ threadId, body })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setBody('')
      router.refresh()
    })
  }

  return (
    <div className="border-t border-border pt-4">
      {error ? <Alert tone="danger" title="Pesan tidak terkirim" className="mb-3">{error}</Alert> : null}
      <label htmlFor="investor-message-body" className="sr-only">Tulis pesan</label>
      <textarea
        id="investor-message-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Tulis balasan..."
        rows={5}
        maxLength={20000}
        disabled={disabled || pending}
        className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-body-sm"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-caption text-fg-subtle">Maksimal 20.000 karakter.</p>
        <Button disabled={disabled || pending || !body.trim()} loading={pending} onClick={submit}>Kirim</Button>
      </div>
    </div>
  )
}
