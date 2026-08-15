import { createHash } from 'node:crypto'

/**
 * The rate-limit policy: what is limited, how much, and how a bucket key is
 * derived.
 *
 * Kept here — outside `src/server` — so the server, the tests, and any future
 * worker all derive the same bucket from the same rule. A test that
 * re-implements the hash would pass while the server used a different key,
 * which is the one bug this module exists to prevent.
 *
 * See docs/SECURITY.md §10.
 */

export const RATE_LIMIT_SCOPES = [
  'auth.sign_in',
  'auth.password_reset',
  'investor.application',
  'portal.inquiry',
  'storage.signed_url',
  'storage.upload',
  'message.send',
] as const

export type RateLimitScope = (typeof RATE_LIMIT_SCOPES)[number]

export type RateLimitPolicy = { limit: number; windowSeconds: number }

/** Conservative by default; each is per identifier, per window. */
export const RATE_LIMITS: Readonly<Record<RateLimitScope, RateLimitPolicy>> = {
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
 * identifier — an email or IP address never lands in the table in the clear
 * (docs/SECURITY.md §9).
 *
 * Rotating the salt resets every counter, which is harmless: the worst case is
 * that in-flight windows start again.
 */
export function rateLimitBucket(salt: string, scope: RateLimitScope, identifier: string): string {
  return createHash('sha256').update(`${salt}:${scope}:${identifier.toLowerCase()}`).digest('hex')
}
