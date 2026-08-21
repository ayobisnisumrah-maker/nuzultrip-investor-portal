'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  markAllInvestorNotificationsRead,
  markInvestorNotificationRead,
} from '@/server/messaging/investor-actions'
import { Button } from '@/ui/button'
import { Alert } from '@/ui/alert'

export function InvestorNotificationActions({ unreadIds }: { unreadIds: string[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!unreadIds.length) return null

  function markAll() {
    setError(null)
    startTransition(async () => {
      const result = await markAllInvestorNotificationsRead({})
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {error ? <Alert tone="danger" title="Notifikasi gagal diperbarui" className="w-full">{error}</Alert> : null}
      <span className="text-body-sm text-fg-muted">{unreadIds.length} belum dibaca</span>
      <Button variant="secondary" size="sm" disabled={pending} loading={pending} onClick={markAll}>
        Tandai semua sudah dibaca
      </Button>
    </div>
  )
}

export function InvestorNotificationReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function markRead() {
    startTransition(async () => {
      const result = await markInvestorNotificationRead({ notificationId })
      if (result.ok) router.refresh()
    })
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} loading={pending} onClick={markRead}>
      Tandai dibaca
    </Button>
  )
}
