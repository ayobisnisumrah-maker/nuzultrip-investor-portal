'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import type { EventKind } from '@/core/realtime/events'
import { useRealtime } from '@/features/realtime/realtime-provider'

type LiveNavBadgeProps = {
  initialCount: number
  topic: string
  eventKind: EventKind
}

export function LiveNavBadge({ initialCount, topic, eventKind }: LiveNavBadgeProps) {
  const router = useRouter()
  const realtime = useRealtime()

  useEffect(() => {
    return realtime.subscribe(topic, (event) => {
      if (event.kind !== eventKind) return
      router.refresh()
    })
  }, [eventKind, realtime, router, topic])

  useEffect(() => {
    if (realtime.resumeToken === 0) return
    router.refresh()
  }, [realtime.resumeToken, router])

  if (initialCount <= 0) return null

  return (
    <span
      className="bg-danger text-danger-fg inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular"
      aria-label={`${initialCount} belum dibaca`}
    >
      {initialCount > 99 ? '99+' : initialCount}
    </span>
  )
}
