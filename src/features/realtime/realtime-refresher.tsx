'use client'

import type { EventKind } from '@/core/realtime/events'
import { useRealtimeRefresh } from './use-realtime-topic'

/**
 * Drop-in for a Server Component page: subscribes to a topic and refreshes the
 * route when any of the listed events arrives.
 *
 * Renders nothing. The refresh goes back through the server, where
 * authorisation is applied again — the event only says "look again".
 */
export function RealtimeRefresher({
  topic,
  kinds,
}: {
  topic: string
  kinds: readonly EventKind[]
}) {
  useRealtimeRefresh(topic, kinds)
  return null
}
