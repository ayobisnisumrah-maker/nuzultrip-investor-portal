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

  // Administration and RBAC
  'admin.changed',
  'rbac.changed',

  // Materials
  'document.state_changed',
  'financial_period.changed',
  'financial_report.published',
  'financial_report.state_changed',

  // Finance operations
  'finance.transaction_changed',
  'finance.cashflow_changed',

  // Ownership and distributions
  'ownership.changed',
  'profit_distribution.changed',

  // Communication
  'message.received',
  'notification.created',
  'inquiry.received',
  'inquiry.changed',
] as const

export type EventKind = (typeof EVENT_KINDS)[number]

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

export const topics = {
  portal: () => 'portal:public',
  allInvestors: () => 'investors:all',
  investor: (investorId: string) => `investor:${investorId}`,
  admin: () => 'admin:global',
  user: (userId: string) => `user:${userId}`,
} as const

export type Topic = ReturnType<(typeof topics)[keyof typeof topics]>

export const TOPIC_EVENTS: Readonly<Record<string, readonly EventKind[]>> = {
  'portal:public': [
    'portal.page_published',
    'portal.section_published',
    'portal.theme_updated',
    'portal.navigation_updated',
    'document.published',
    // A published public document can become internal/restricted/archived.
    // Public clients must refetch immediately so stale access disappears.
    'document.state_changed',
  ],
  'investors:all': [
    'document.published',
    // Visibility/status changes can both add and remove a document from the
    // investor-visible result set. The event only triggers an RLS-guarded refetch.
    'document.state_changed',
    'financial_report.published',
    'finance.cashflow_changed',
    'portal.theme_updated',
  ],
  'admin:global': [
    'investor.applied',
    'investor.status_changed',
    'admin.changed',
    'rbac.changed',
    'portal.theme_updated',
    'document.state_changed',
    'financial_period.changed',
    'financial_report.state_changed',
    'finance.transaction_changed',
    'ownership.changed',
    'profit_distribution.changed',
    'message.received',
    'inquiry.received',
    'inquiry.changed',
  ],
} as const

export function eventsForTopic(topic: string): readonly EventKind[] {
  if (topic.startsWith('investor:')) {
    return [
      'investor.status_changed',
      'investor.document_shared',
      'investor.document_revoked',
      'ownership.changed',
      'profit_distribution.changed',
      'message.received',
      'document.published',
      // Includes visibility changes such as investors -> internal and lifecycle
      // changes such as published -> archived.
      'document.state_changed',
      'portal.theme_updated',
    ]
  }
  if (topic.startsWith('user:')) {
    return ['notification.created', 'investor.status_changed']
  }
  return TOPIC_EVENTS[topic] ?? []
}

export const CONNECTION_STATES = ['connecting', 'connected', 'degraded', 'offline'] as const
export type ConnectionState = (typeof CONNECTION_STATES)[number]

export const CONNECTION_LABELS: Readonly<Record<ConnectionState, string>> = {
  connecting: 'Menyambungkan',
  connected: 'Data langsung aktif',
  degraded: 'Koneksi langsung terputus',
  offline: 'Tidak ada koneksi',
}

export const DEGRADED_RECONCILE_MS = 30_000
export const HEALTHY_RECONCILE_MS = 10 * 60_000

export function reconnectDelayMs(attempt: number, random: number = Math.random()): number {
  const base = Math.min(1000 * 2 ** Math.max(attempt - 1, 0), 30_000)
  return Math.round(base * (0.5 + random * 0.5))
}
