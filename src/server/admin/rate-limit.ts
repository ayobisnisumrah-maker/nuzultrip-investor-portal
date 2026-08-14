import 'server-only'

import { createHash } from 'node:crypto'
import { getServerEnv } from '@/lib/env'
import { RateLimitError } from '@/core/errors'
import { getServiceRoleClient } from './service-client'

/**
 * Rate limiting.
 *
 * Uses the service-role client because the counter table is deliberately
 * unreachable by `anon` and `authenticated` — if a client could call the
 * consume function, it could exhaust another caller's quota by naming their
 * bucket. RLS cannot express "only the server may touch this", so this is one
 * of the enumerated service-role uses (docs/SECURITY.md §3).
 */

export type RateLimitScope =
  | 'auth.sign_in'
  | 'auth.password_reset'
  | 'investor.application'
  | 'portal.inquiry'
  | 'storage.signed_url'
  | 'storage.upload'
  | 'message.send'

/** Conservative defaults; each is per identifier, per window. */
const LIMITS: Record<RateLimitScope, { limit: number; windowSeconds: number }> = {
  'auth.sign_in': { limit: 8, windowSeconds: 15 * 60 },
  'auth.password_reset': { limit: 4, windowSeconds: 60 * 60 },
  'investor.application': { limit: 3, windowSeconds: 60 * 60 },
  'portal.inquiry': { limit: 5, windowSeconds: 60 * 60 },
  'storage.signed_url': { limit: 120, windowSeconds: 60 },
  'storage.upload': { limit: 30, windowSeconds: 60 * 60 },
  'message.send': { limit: 30, windowSeconds: 60 * 60 },
}

/**
 * Buckets are salted hashes, so the stored key reveals nothing about the
 * identifier — an email address or IP address never lands in the table in the
 * clear (docs/SECURITY.md §9).
 */
function bucketFor(scope: RateLimitScope, identifier: string): string {
  return createHash('sha256')
    .update(`${getServerEnv().AUDIT_IP_SALT}:${scope}:${identifier.toLowerCase()}`)
    .digest('hex')
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export async function consumeRateLimit(
  scope: RateLimitScope,
  identifier: string,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = LIMITS[scope]
  const client = getServiceRoleClient()

  const { data, error } = await client.rpc('consume_rate_limit', {
    p_bucket: bucketFor(scope, identifier),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    // Fail **closed**. A rate limiter that opens up whenever the database is
    // struggling is worst-useless: it disappears exactly when it is needed.
    throw new RateLimitError(windowSeconds, `Rate limit check failed: ${error.message}`)
  }

  const row = data?.[0]
  if (!row) throw new RateLimitError(windowSeconds, 'Rate limit check returned no result.')

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    retryAfterSeconds: row.retry_after_seconds,
  }
}

/** Consume a slot or throw. The usual call shape. */
export async function enforceRateLimit(scope: RateLimitScope, identifier: string): Promise<void> {
  const result = await consumeRateLimit(scope, identifier)
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds)
  }
}
