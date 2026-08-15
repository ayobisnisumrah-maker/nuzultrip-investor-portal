// @vitest-environment node
/**
 * The rate limiter, tested where it is implemented.
 *
 * Driving a browser through eight password attempts to prove a counter works
 * is a load test wearing a security test's clothes: it is slow, it saturates
 * the local stack, and when it fails it tells you nothing about the counter.
 * The control is exercised directly here, and the *wiring* is proved with a
 * single request in `tests/e2e/rate-limit.spec.ts`.
 *
 * See docs/SECURITY.md §10.
 */
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { closeDb, db } from './helpers/db'
import { RATE_LIMITS, rateLimitBucket, RATE_LIMIT_SCOPES } from '@/core/rate-limit/policy'

afterAll(async () => {
  await db()`delete from public.rate_limits where bucket like ${'test-%'}`
  await closeDb()
})

type ConsumeResult = { allowed: boolean; remaining: number; retry_after_seconds: number }

async function consume(bucket: string, limit: number, windowSeconds: number) {
  const rows = await db()<ConsumeResult[]>`
    select * from public.consume_rate_limit(${bucket}, ${limit}, ${windowSeconds})
  `
  const row = rows[0]
  if (!row) throw new Error('consume_rate_limit returned no row')
  return row
}

const bucket = () => `test-${randomUUID()}`

describe('consume_rate_limit', () => {
  it('allows exactly the configured number of attempts, then refuses', async () => {
    const key = bucket()

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await consume(key, 3, 3600)
      expect(result.allowed, `attempt ${attempt} should be allowed`).toBe(true)
      expect(result.remaining).toBe(3 - attempt)
    }

    const refused = await consume(key, 3, 3600)
    expect(refused.allowed).toBe(false)
    expect(refused.remaining).toBe(0)
    expect(refused.retry_after_seconds).toBeGreaterThan(0)
  })

  it('keeps refusing once the budget is spent', async () => {
    const key = bucket()
    for (let attempt = 0; attempt < 5; attempt += 1) await consume(key, 2, 3600)

    const result = await consume(key, 2, 3600)
    expect(result.allowed).toBe(false)
    // The window does not extend on each refusal — that would let an attacker
    // lock a victim out indefinitely by continuing to try.
    expect(result.retry_after_seconds).toBeLessThanOrEqual(3600)
  })

  it('counts each bucket independently', async () => {
    const a = bucket()
    const b = bucket()

    await consume(a, 1, 3600)
    const exhaustedA = await consume(a, 1, 3600)
    const freshB = await consume(b, 1, 3600)

    expect(exhaustedA.allowed).toBe(false)
    // One caller exhausting their quota must never affect another.
    expect(freshB.allowed).toBe(true)
  })

  it('starts a new window once the old one has elapsed', async () => {
    const key = bucket()
    // A one-second window, so elapsing it does not require waiting minutes.
    await consume(key, 1, 1)
    expect((await consume(key, 1, 1)).allowed).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 1100))

    const afterWindow = await consume(key, 1, 1)
    expect(afterWindow.allowed).toBe(true)
  })

  it('rejects a nonsensical configuration rather than silently allowing', async () => {
    // A limit of zero, or a zero-length window, would otherwise divide by the
    // wrong thing and let everything through.
    await expect(db()`select * from public.consume_rate_limit(${bucket()}, 0, 60)`).rejects.toThrow()
    await expect(db()`select * from public.consume_rate_limit(${bucket()}, 5, 0)`).rejects.toThrow()
  })

  it('is unreachable by anon and authenticated', async () => {
    // The counter table is service-role only; if a client could call this, it
    // could exhaust someone else's quota by naming their bucket.
    for (const role of ['anon', 'authenticated']) {
      const rows = await db()<{ has: boolean }[]>`
        select has_function_privilege(
          ${role},
          'public.consume_rate_limit(text,integer,integer)',
          'execute'
        ) as has
      `
      expect(rows[0]!.has, `${role} can execute consume_rate_limit`).toBe(false)
    }

    for (const role of ['anon', 'authenticated']) {
      const rows = await db()<{ has: boolean }[]>`
        select has_table_privilege(${role}, 'public.rate_limits', 'select') as has
      `
      expect(rows[0]!.has, `${role} can read rate_limits`).toBe(false)
    }
  })

  it('stores no identifier in the clear', () => {
    const salt = 'a-test-salt'
    const key = rateLimitBucket(salt, 'auth.sign_in', 'Victim@Example.test')

    expect(key).not.toContain('victim')
    expect(key).not.toContain('example')
    expect(key).toMatch(/^[0-9a-f]{64}$/)

    // Case-insensitive, so `A@x.test` and `a@x.test` share one budget rather
    // than giving an attacker two.
    expect(rateLimitBucket(salt, 'auth.sign_in', 'VICTIM@EXAMPLE.TEST')).toBe(key)
    // Salted, so the key cannot be precomputed from the address alone.
    expect(rateLimitBucket('another-salt', 'auth.sign_in', 'Victim@Example.test')).not.toBe(key)
    // Scoped, so exhausting sign-in does not exhaust password reset.
    expect(rateLimitBucket(salt, 'auth.password_reset', 'Victim@Example.test')).not.toBe(key)
  })
})

describe('policy', () => {
  it('defines a sane budget for every scope', () => {
    for (const scope of RATE_LIMIT_SCOPES) {
      const policy = RATE_LIMITS[scope]
      expect(policy, scope).toBeDefined()
      expect(policy.limit, `${scope} limit`).toBeGreaterThan(0)
      expect(policy.windowSeconds, `${scope} window`).toBeGreaterThan(0)
    }
  })

  it('keeps the authentication budgets tight', () => {
    // These are the ones that matter for credential stuffing. If someone
    // loosens them, this test should be the thing that asks why.
    expect(RATE_LIMITS['auth.sign_in'].limit).toBeLessThanOrEqual(10)
    expect(RATE_LIMITS['auth.password_reset'].limit).toBeLessThanOrEqual(5)
    expect(RATE_LIMITS['investor.application'].limit).toBeLessThanOrEqual(5)
  })
})
