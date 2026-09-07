'use client'

import { useEffect, useState } from 'react'
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
  const [count, setCount] = useState(initialCount)
  const [previousInitialCount, setPreviousInitialCount] = useState(initialCount)

  if (previousInitialCount !== initialCount) {
    setPreviousInitialCount(initialCount)
    setCount(initialCount)
  }

  useEffect(() => {
    return realtime.subscribe(topic, (event) => {
      if (event.kind !== eventKind) return
      setCount((current) => current + 1)
      router.refresh()
    })
  }, [eventKind, realtime, router, topic])

  useEffect(() => {
    if (realtime.resumeToken === 0) return
    router.refresh()
  }, [realtime.resumeToken, router])

  if (count <= 0) return null

  return (
    <span
      className="bg-danger text-danger-fg tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold"
      aria-label={`${count} belum dibaca`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
