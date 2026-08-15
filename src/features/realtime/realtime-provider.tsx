'use client'

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from '@supabase/supabase-js'
import {
  CONNECTION_STATES,
  DEGRADED_RECONCILE_MS,
  HEALTHY_RECONCILE_MS,
  parseRealtimeEvent,
  reconnectDelayMs,
  type ConnectionState,
  type EventKind,
  type RealtimeEvent,
} from '@/core/realtime/events'
import { getBrowserSupabase } from '@/lib/supabase/browser'

/**
 * The realtime backbone.
 *
 * One Supabase client and one websocket per tab; this provider multiplexes
 * every subscription over it. Opening a second connection would double the
 * server's fan-out for no benefit.
 *
 * See docs/REALTIME.md §6.
 */

export type EventHandler = (event: RealtimeEvent) => void

type RealtimeContextValue = {
  state: ConnectionState
  /** Bumped whenever the socket recovers, so consumers can refetch. */
  resumeToken: number
  subscribe: (topic: string, handler: EventHandler) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

/**
 * A single QueryClient for the tab. Defaults are deliberate: realtime is the
 * refresh mechanism, so background refetching is off and data is not
 * automatically considered stale.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is invalidated by events, not by time.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  })
}

export function RealtimeProvider({
  children,
  /** Topics this surface subscribes to for its whole lifetime. */
  topics,
}: {
  children: React.ReactNode
  topics: readonly string[]
}) {
  const [queryClient] = useState(createQueryClient)
  const [socketState, setState] = useState<ConnectionState>('connecting')
  // A surface with nothing to subscribe to is not "connecting" forever; it has
  // simply nothing to connect to. Derived rather than set from an effect.
  const state: ConnectionState = topics.length === 0 ? 'connected' : socketState
  const [resumeToken, setResumeToken] = useState(0)

  // topic -> set of handlers. Handlers are stored in a ref so that adding one
  // never tears down and re-establishes the channel.
  const handlers = useRef(new Map<string, Set<EventHandler>>())
  const channels = useRef(new Map<string, RealtimeChannel>())
  const attempt = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatch = useCallback((topic: string, payload: unknown) => {
    // Untrusted input like any other. An unparseable event is dropped rather
    // than passed on in a shape nothing expects.
    const event = parseRealtimeEvent(payload)
    if (!event) {
      console.warn('[realtime] dropped an unparseable event', { topic })
      return
    }
    for (const handler of handlers.current.get(topic) ?? []) handler(event)
  }, [])

  const subscribe = useCallback((topic: string, handler: EventHandler) => {
    const existing = handlers.current.get(topic) ?? new Set<EventHandler>()
    existing.add(handler)
    handlers.current.set(topic, existing)

    return () => {
      existing.delete(handler)
      if (existing.size === 0) handlers.current.delete(topic)
    }
  }, [])

  const topicKey = topics.join('|')

  useEffect(() => {
    if (topics.length === 0) return

    const supabase = getBrowserSupabase()
    let cancelled = false

    const openChannels = async () => {
      // Private channels are authorised by RLS on realtime.messages, which
      // needs the session token attached to the socket.
      const { data } = await supabase.auth.getSession()
      await supabase.realtime.setAuth(data.session?.access_token ?? undefined)
      if (cancelled) return

      setState((current) => (current === 'connected' ? current : 'connecting'))

      for (const topic of topics) {
        if (channels.current.has(topic)) continue

        const channel = supabase
          .channel(topic, { config: { private: true } })
          // A single wildcard listener: the event kind is inside the payload,
          // so registering one handler per kind would only add bookkeeping.
          .on('broadcast', { event: '*' }, (message) => {
            dispatch(topic, message['payload'])
          })
          .subscribe((status) => {
            if (cancelled) return
            if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
              attempt.current = 0
              setState('connected')
              // A socket that was down may have missed events, so recovery is
              // "assume stale" rather than "assume caught up".
              setResumeToken((token) => token + 1)
            } else if (
              status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
              status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
            ) {
              setState('degraded')
              scheduleRetry()
            } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
              setState((current) => (current === 'connected' ? 'degraded' : current))
            }
          })

        channels.current.set(topic, channel)
      }
    }

    const scheduleRetry = () => {
      if (retryTimer.current) return
      attempt.current += 1
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null
        teardown()
        void openChannels()
      }, reconnectDelayMs(attempt.current))
    }

    const teardown = () => {
      for (const channel of channels.current.values()) {
        void supabase.removeChannel(channel)
      }
      channels.current.clear()
    }

    void openChannels()

    // Safari suspends sockets aggressively in the background, and a bfcache
    // restore hands back a page whose connection is long gone. Both need an
    // explicit resume.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setResumeToken((token) => token + 1)
        if (channels.current.size === 0) void openChannels()
      }
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        teardown()
        void openChannels()
      }
    }
    const onOnline = () => {
      teardown()
      void openChannels()
    }
    const onOffline = () => setState('offline')

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      cancelled = true
      if (retryTimer.current) clearTimeout(retryTimer.current)
      retryTimer.current = null
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      teardown()
    }
    // `topicKey` is the stable identity of the topic list; `topics` itself is a
    // new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKey, dispatch])

  // The reconciliation safety net. Frequent while the socket is down, rare
  // while it is up — and never the thing that is supposed to deliver an update.
  useEffect(() => {
    const interval = state === 'connected' ? HEALTHY_RECONCILE_MS : DEGRADED_RECONCILE_MS
    const timer = setInterval(() => {
      void queryClient.invalidateQueries()
      setResumeToken((token) => token + 1)
    }, interval)
    return () => clearInterval(timer)
  }, [state, queryClient])

  const value = useMemo<RealtimeContextValue>(
    () => ({ state, resumeToken, subscribe }),
    [state, resumeToken, subscribe],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeContext value={value}>{children}</RealtimeContext>
    </QueryClientProvider>
  )
}

export function useRealtime(): RealtimeContextValue {
  const context = use(RealtimeContext)
  if (!context) throw new Error('useRealtime must be used within <RealtimeProvider>.')
  return context
}

export { CONNECTION_STATES }
export type { EventKind }
