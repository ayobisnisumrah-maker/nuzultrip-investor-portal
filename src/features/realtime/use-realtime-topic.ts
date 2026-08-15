'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { eventsForTopic, type EventKind, type RealtimeEvent } from '@/core/realtime/events'
import { isDevelopment } from '@/lib/env'
import { useRealtime } from './realtime-provider'

/**
 * Subscribe to a topic and react to its events.
 *
 * The handler map is keyed by event kind. In development, a handler for an
 * event the topic can never deliver is reported — a silently dead handler is
 * indistinguishable from "it just has not happened yet", which is the worst
 * kind of realtime bug to chase.
 */
export function useRealtimeTopic(
  topic: string,
  handlers: Partial<Record<EventKind, (event: RealtimeEvent) => void>>,
): void {
  const { subscribe } = useRealtime()
  // Handlers are usually inline arrows, so a new object every render. Holding
  // them in a ref keeps the subscription stable across renders; the ref is
  // updated in an effect rather than during render.
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    if (isDevelopment()) {
      const deliverable = new Set(eventsForTopic(topic))
      for (const kind of Object.keys(latest.current)) {
        if (!deliverable.has(kind as EventKind)) {
          console.warn(
            `[realtime] "${topic}" never delivers "${kind}" — this handler will never fire.`,
          )
        }
      }
    }

    return subscribe(topic, (event) => {
      latest.current[event.kind]?.(event)
    })
  }, [topic, subscribe])
}

/**
 * The common case: refresh the current route when any of these events arrives.
 *
 * `router.refresh()` refetches the RSC payload **on the server**, where
 * authorisation is applied again — so what the user ends up seeing is exactly
 * what they are permitted to see, regardless of what the event said.
 */
export function useRealtimeRefresh(topic: string, kinds: readonly EventKind[]): void {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { resumeToken } = useRealtime()

  const handlers = Object.fromEntries(
    kinds.map((kind) => [
      kind,
      () => {
        void queryClient.invalidateQueries()
        router.refresh()
      },
    ]),
  ) as Partial<Record<EventKind, () => void>>

  useRealtimeTopic(topic, handlers)

  // A socket that was down may have missed events, so a resume refreshes
  // unconditionally rather than assuming it caught up.
  const seenResume = useRef(resumeToken)
  useEffect(() => {
    if (resumeToken !== seenResume.current) {
      seenResume.current = resumeToken
      router.refresh()
    }
  }, [resumeToken, router])
}
