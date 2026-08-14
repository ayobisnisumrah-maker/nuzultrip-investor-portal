import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { cache } from 'react'
import { headers } from 'next/headers'
import { getServerEnv } from '@/lib/env'
import { principalActorType, principalLabel, type Principal } from '@/core/auth/principal'
import { getServerSupabase } from './supabase/server'
import { writeSystemAudit } from './admin/system-audit'

/**
 * Audit logging.
 *
 * Written through the **request-scoped** client, so the row's actor is pinned
 * to the session by the insert policy and cannot be forged. `audit_logs` is
 * append-only by policy and by trigger, so a record, once written, is permanent
 * (docs/DATABASE.md §10).
 */

export type AuditChange = { before: unknown; after: unknown }

export type AuditEntry = {
  /** `module.action`, e.g. `investor.approve`. */
  action: string
  entityType: string
  entityId?: string | null
  summary?: string
  /** Changed fields only. Must never contain secrets, tokens or signed URLs. */
  changes?: Record<string, AuditChange>
}

/**
 * One correlation id per request, shared by the audit record, the structured
 * log line, and the id shown to the user on an error — so a support report can
 * be traced without the user ever seeing an internal detail.
 */
export const getCorrelationId = cache((): string => randomUUID())

/** Salted hash: enough to correlate abuse, without retaining a raw address. */
function hashIp(ip: string | null): string | null {
  if (!ip) return null
  return createHash('sha256').update(`${getServerEnv().AUDIT_IP_SALT}:${ip}`).digest('hex')
}

export const getRequestMeta = cache(
  async (): Promise<{ ipHash: string | null; userAgent: string | null }> => {
    const headerList = await headers()
    // The left-most entry is the client; the rest are proxies.
    const forwarded = headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = forwarded ?? headerList.get('x-real-ip') ?? null
    return {
      ipHash: hashIp(ip),
      userAgent: headerList.get('user-agent')?.slice(0, 500) ?? null,
    }
  },
)

/**
 * Compute the diff between two records, keeping only fields that actually
 * changed. Storing a full before/after would bloat the log and, worse, would
 * copy fields nobody intended to retain.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T | null,
  after: Partial<T>,
  fields: ReadonlyArray<keyof T & string>,
): Record<string, AuditChange> {
  const changes: Record<string, AuditChange> = {}
  for (const field of fields) {
    const previous = before?.[field]
    const next = after[field]
    if (next !== undefined && previous !== next) {
      changes[field] = { before: previous ?? null, after: next }
    }
  }
  return changes
}

export async function writeAudit(principal: Principal, entry: AuditEntry): Promise<void> {
  const meta = await getRequestMeta()

  // An anonymous action still has to be recorded, but `anon` holds no INSERT
  // privilege on the audit log — deliberately, so nobody can POST directly to
  // the REST endpoint and bury the entries that matter. Those go through the
  // server instead.
  if (principal.kind === 'anonymous') {
    await writeSystemAudit({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary ?? '',
      ...(entry.changes ? { changes: entry.changes } : {}),
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      correlationId: getCorrelationId(),
    })
    return
  }

  const supabase = await getServerSupabase()

  const { error } = await supabase.from('audit_logs').insert({
    // Narrowed to an authenticated principal by the early return above. The
    // insert policy pins this to the session, so it cannot be forged anyway.
    actor_id: principal.userId,
    actor_type: principalActorType(principal),
    actor_label: principalLabel(principal),
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    summary: entry.summary ?? '',
    changes: (entry.changes ?? {}) as never,
    ip_hash: meta.ipHash,
    user_agent: meta.userAgent,
    correlation_id: getCorrelationId(),
  })

  if (error) {
    // An audit write that fails must be loud. Swallowing it would leave a
    // privileged mutation with no record, which is precisely the situation the
    // audit log exists to prevent.
    throw new Error(`Failed to write the audit record for "${entry.action}": ${error.message}`)
  }
}
