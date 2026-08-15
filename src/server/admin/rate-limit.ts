import 'server-only'

import { getServerEnv } from '@/lib/env'
import { RATE_LIMITS, rateLimitBucket, type RateLimitScope } from '@/core/rate-limit/policy'
import { RateLimitError } from '@/core/errors'
import { getServiceRoleClient } from './service-client'

export type { RateLimitScope }

/**
 * Rate limiting.
 *
 * Uses the service-role client because the counter table is deliberately
 * unreachable by `anon` and `authenticated` — if a client could call the
 * consume function, it could exhaust another caller's quota by naming their
 * bucket. RLS cannot express "only the server may touch this", so this is one
 * of the enumerated service-role uses (docs/SECURITY.md §3).
 */

/**
 * Bucket derivation and the policy table live in `src/core/rate-limit/policy`
 * so the server and the tests cannot disagree about which key a given caller
 * maps to.
 */
function bucketFor(scope: RateLimitScope, identifier: string): string {
  return rateLimitBucket(getServerEnv().AUDIT_IP_SALT, scope, identifier)
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
  const { limit, windowSeconds } = RATE_LIMITS[scope]
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
