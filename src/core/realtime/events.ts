/**
 * The realtime event contract.
 *
 * An event carries **identifiers and nothing else**. It is a signal that
 * something changed, not the thing that changed.
 *
 * That is the single most important decision in the realtime design
 * (docs/REALTIME.md §4). Because no business data crosses the socket, a client
 * can never render anything it received there; it refetches through the normal
 * RLS-guarded path. The socket therefore cannot become an authorisation bypass,
 * and the worst a spoofed or replayed event can do is cause one extra query.
 */
import { z } from 'zod'

export const EVENT_KINDS = [
  // Portal
  'portal.page_published',
  'portal.section_published',
  'portal.theme_updated',
  'portal.navigation_updated',
  'document.published',

  // Investor lifecycle
  'investor.applied',
  'investor.status_changed',
  'investor.document_shared',
  'investor.document_revoked',

  // Materials
  'document.state_changed',
  'financial_report.published',
  'financial_report.state_changed',

  // Communication
  'message.received',
  'notification.created',
  'inquiry.received',
] as const

export type EventKind = (typeof EVENT_KINDS)[number]

/**
 * Parsed on arrival. An unparseable event is dropped and counted, never
 * applied — the socket is untrusted input like any other.
 */
export const realtimeEventSchema = z.object({
  kind: z.enum(EVENT_KINDS),
  entityType: z.string().max(64),
  entityId: z.uuid().nullable(),
  occurredAt: z.string().max(32),
  actorType: z.enum(['admin', 'investor', 'system', 'anonymous']),
  version: z.literal(1),
})

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>

export function parseRealtimeEvent(payload: unknown): RealtimeEvent | null {
  const parsed = realtimeEventSchema.safeParse(payload)
  return parsed.success ? parsed.data : null
}

/* -------------------------------------------------------------------------- */
/* Topics                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Topic names are produced here and by the matching SQL helpers, never by
 * string concatenation at a call site — a typo would be a silent subscription
 * to a channel that never receives anything, which is indistinguishable from
 * "nothing has happened yet".
 */
export const topics = {
  portal: () => 'portal:public',
  allInvestors: () => 'investors:all',
  investor: (investorId: string) => `investor:${investorId}`,
  admin: () => 'admin:global',
  user: (userId: string) => `user:${userId}`,
} as const

export type Topic = ReturnType<(typeof topics)[keyof typeof topics]>

/** Which events a given topic can actually deliver. Used to catch dead handlers. */
export const TOPIC_EVENTS: Readonly<Record<string, readonly EventKind[]>> = {
  'portal:public': [
    'portal.page_published',
    'portal.section_published',
    'portal.theme_updated',
    'portal.navigation_updated',
    'document.published',
  ],
  'investors:all': ['document.published', 'financial_report.published'],
  'admin:global': [
    'investor.applied',
    'investor.status_changed',
    'document.state_changed',
    'financial_report.state_changed',
    'message.received',
    'inquiry.received',
  ],
} as const

/** Prefixed topics carry an id, so they are matched by shape. */
export function eventsForTopic(topic: string): readonly EventKind[] {
  if (topic.startsWith('investor:')) {
    return [
      'investor.status_changed',
      'investor.document_shared',
      'investor.document_revoked',
      'message.received',
      'document.published',
    ]
  }
  if (topic.startsWith('user:')) {
    return ['notification.created', 'investor.status_changed']
  }
  return TOPIC_EVENTS[topic] ?? []
}

/* -------------------------------------------------------------------------- */
/* Connection state                                                           */
/* -------------------------------------------------------------------------- */

export const CONNECTION_STATES = ['connecting', 'connected', 'degraded', 'offline'] as const
export type ConnectionState = (typeof CONNECTION_STATES)[number]

export const CONNECTION_LABELS: Readonly<Record<ConnectionState, string>> = {
  connecting: 'Menyambungkan',
  connected: 'Data langsung aktif',
  degraded: 'Koneksi langsung terputus',
  offline: 'Tidak ada koneksi',
}

/**
 * How often to reconcile by refetching while the socket is down.
 *
 * This is a **safety net, not the mechanism**. Polling is explicitly not how
 * this system stays in sync (docs/REALTIME.md §1); if this interval is ever the
 * thing that delivers an update to a user, that is a bug the metric should
 * show.
 */
export const DEGRADED_RECONCILE_MS = 30_000

/** The same net, far slower, for a socket that is up but might have missed something. */
export const HEALTHY_RECONCILE_MS = 10 * 60_000

/** Exponential backoff with jitter, capped, so a dead server is not hammered. */
export function reconnectDelayMs(attempt: number, random: number = Math.random()): number {
  const base = Math.min(1000 * 2 ** Math.max(attempt - 1, 0), 30_000)
  // Jitter spreads reconnects so a restarted server does not receive every
  // client at the same instant.
  return Math.round(base * (0.5 + random * 0.5))
}
