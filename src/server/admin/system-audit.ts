import 'server-only'

import { getServiceRoleClient } from './service-client'

/**
 * Audit records for actions taken by an unauthenticated caller.
 *
 * Sign-in attempts, investor applications, public inquiries and first-run setup
 * all need to be recorded, but the actor is `anon` — and `anon` deliberately
 * holds no INSERT privilege on `audit_logs`. Granting it would let anyone POST
 * directly to the REST endpoint and fill the audit trail with noise, which is
 * a cheap way to bury the entries that matter.
 *
 * So these entries are written by the server instead. This is one of the
 * enumerated service-role uses (docs/SECURITY.md §3): there is no session to
 * act as, and no policy that could express "only the application may write
 * this".
 *
 * `actor_id` is always null here. An anonymous action has no actor by
 * definition, and accepting one from the caller would let a request forge
 * attribution.
 */
export type SystemAuditEntry = {
  action: string
  entityType: string
  entityId?: string | null
  summary?: string
  changes?: Record<string, { before: unknown; after: unknown }>
  ipHash?: string | null
  userAgent?: string | null
  correlationId?: string | null
}

export async function writeSystemAudit(entry: SystemAuditEntry): Promise<void> {
  const { error } = await getServiceRoleClient()
    .from('audit_logs')
    .insert({
      actor_id: null,
      actor_type: 'anonymous',
      actor_label: 'anonymous',
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      summary: entry.summary ?? '',
      changes: (entry.changes ?? {}) as never,
      ip_hash: entry.ipHash ?? null,
      user_agent: entry.userAgent ?? null,
      correlation_id: entry.correlationId ?? null,
    })

  if (error) {
    throw new Error(
      `Failed to write the system audit record for "${entry.action}": ${error.message}`,
    )
  }
}
