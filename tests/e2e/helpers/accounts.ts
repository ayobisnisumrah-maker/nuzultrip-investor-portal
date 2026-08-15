import { createHash, randomUUID } from 'node:crypto'
import {
  RATE_LIMITS,
  rateLimitBucket,
  type RateLimitScope,
} from '../../../src/core/rate-limit/policy'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'

/**
 * Test account helpers.
 *
 * Accounts are created directly through the service role rather than through
 * the UI: the E2E suite is testing realtime propagation and access control, not
 * the sign-up form (which has its own coverage), and driving three account
 * creations through forms would make every test minutes long and flaky.
 *
 * Every account is namespaced with a per-run id so parallel workers and repeat
 * runs never collide, and each test removes what it created.
 */

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

export const TEST_PASSWORD = 'KataSandiUjiE2E2026'

let client: SupabaseClient | null = null

export function serviceClient(): SupabaseClient {
  if (!SERVICE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. The E2E suite provisions its own accounts.',
    )
  }
  client ??= createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

export type TestAccount = { userId: string; email: string; password: string }

export async function createAdminAccount(options?: {
  roleKey?: 'super_admin' | 'admin_internal'
  fullName?: string
}): Promise<TestAccount> {
  const supabase = serviceClient()
  const email = `e2e-admin-${randomUUID().slice(0, 8)}@example.test`
  const fullName = options?.fullName ?? 'Admin E2E'

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`)

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('key', options?.roleKey ?? 'admin_internal')
    .single()
  if (roleError || !role) throw new Error(`role lookup failed: ${roleError?.message}`)

  const { error: provisionError } = await supabase.rpc('provision_admin_account', {
    p_user_id: created.user.id,
    p_email: email,
    p_full_name: fullName,
    p_role_id: role.id as string,
  })
  if (provisionError) throw new Error(`provision_admin_account failed: ${provisionError.message}`)

  return { userId: created.user.id, email, password: TEST_PASSWORD }
}

export type InvestorTarget = 'submitted' | 'active'

export async function createInvestorAccount(
  target: InvestorTarget = 'submitted',
): Promise<TestAccount & { referenceCode: string }> {
  const supabase = serviceClient()
  const email = `e2e-investor-${randomUUID().slice(0, 8)}@example.test`
  const fullName = 'Investor E2E'

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`)

  const { data, error: provisionError } = await supabase.rpc('provision_investor_account', {
    p_user_id: created.user.id,
    p_email: email,
    p_full_name: fullName,
    p_legal_name: fullName,
    p_investor_type: 'individual',
  })
  if (provisionError)
    throw new Error(`provision_investor_account failed: ${provisionError.message}`)

  const referenceCode = (data as { referenceCode: string }).referenceCode

  if (target === 'active') {
    await advanceInvestor(created.user.id, ['under_review', 'approved', 'active'])
  }

  return { userId: created.user.id, email, password: TEST_PASSWORD, referenceCode }
}

/** Walks the real lifecycle, one legal transition at a time. */
export async function advanceInvestor(investorId: string, path: readonly string[]): Promise<void> {
  const supabase = serviceClient()
  for (const status of path) {
    const { error } = await supabase.from('investors').update({ status }).eq('id', investorId)
    if (error) throw new Error(`transition to ${status} failed: ${error.message}`)
  }
}

export async function deleteAccounts(userIds: readonly string[]): Promise<void> {
  const supabase = serviceClient()
  for (const id of userIds) {
    // Admin rows must go first: the last-Super-Admin guard would otherwise
    // refuse, and the cascade from auth.users would fail with it.
    await supabase.from('admins').delete().eq('id', id)
    await supabase.auth.admin.deleteUser(id).catch(() => {})
  }
}

/* -------------------------------------------------------------------------- */

/**
 * Fill a field and make sure the value survives.
 *
 * Playwright's `fill` waits for the element to be actionable, not for React to
 * hydrate. A fill that lands in the server-rendered input a moment before
 * hydration is discarded when React takes over — which showed up as WebKit
 * submitting an empty email while the password went through. Retrying until the
 * value sticks removes the race without adding an arbitrary sleep.
 */
async function fillStable(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector)
  await field.waitFor({ state: 'visible' })
  await expect
    .poll(
      async () => {
        await field.fill(value)
        return await field.inputValue()
      },
      { message: `"${selector}" did not retain its value`, timeout: 15_000 },
    )
    .toBe(value)
}

export async function signIn(page: Page, account: TestAccount, expectPath: string): Promise<void> {
  await page.goto('/masuk')
  await page.waitForLoadState('networkidle')

  await fillStable(page, 'input[name="email"]', account.email)
  await fillStable(page, 'input[name="password"]', account.password)

  await page.click('button[type="submit"]')

  // Race the redirect against a visible error, so a failed sign-in reports what
  // went wrong instead of expiring as an opaque navigation timeout.
  // Scoped to `main` to avoid Next's route-announcer element, which also
  // carries `role="alert"`.
  const failure = page.locator('main [role="alert"]')
  await Promise.race([
    page.waitForURL(`**${expectPath}`, { timeout: 60_000 }),
    failure.waitFor({ state: 'visible', timeout: 60_000 }).then(async () => {
      throw new Error(`Sign-in failed for ${account.email}: ${await failure.innerText()}`)
    }),
  ])
}

/**
 * Reset the rate-limit counters.
 *
 * Every request in a local run comes from 127.0.0.1, so the per-IP sign-in
 * budget — eight attempts per fifteen minutes, correct for production — is
 * spent within one cross-browser run. The counters are cleared between tests
 * rather than the limit being raised: the control keeps its production value,
 * and it is verified directly in `rate-limit.spec.ts`.
 */
export async function clearRateLimits(): Promise<void> {
  const { error } = await serviceClient().from('rate_limits').delete().not('bucket', 'is', null)
  if (error) throw new Error(`Failed to clear rate limits: ${error.message}`)
}

/**
 * Spend a scope's entire budget for one identifier.
 *
 * Uses the same bucket derivation the server uses, imported rather than
 * re-implemented — a test that hashed the key its own way would exhaust a
 * bucket nobody reads and then assert nothing.
 *
 * Both the per-address and the per-client budget are spent, because the sign-in
 * action checks both and either one is enough to refuse.
 */
export async function exhaustRateLimit(scope: RateLimitScope, identifier: string): Promise<void> {
  const salt = process.env['AUDIT_IP_SALT']
  if (!salt) throw new Error('AUDIT_IP_SALT is not set; the E2E suite cannot derive a bucket.')

  const { limit, windowSeconds } = RATE_LIMITS[scope]
  const supabase = serviceClient()

  const spend = async (bucket: string) => {
    // One past the limit, so the very next request is refused rather than
    // being the one that trips it.
    for (let attempt = 0; attempt <= limit; attempt += 1) {
      const { error } = await supabase.rpc('consume_rate_limit', {
        p_bucket: bucket,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      })
      if (error) throw new Error(`consume_rate_limit failed: ${error.message}`)
    }
  }

  await spend(rateLimitBucket(salt, scope, identifier))
  // The server hashes the client address before using it as an identifier, and
  // prefixes it — mirrored here so the browser's own request is refused too.
  const ipHash = createHash('sha256').update(`${salt}:127.0.0.1`).digest('hex')
  await spend(rateLimitBucket(salt, scope, `ip:${ipHash}`))
}

/** Waits until the live-data indicator reports a working socket. */
export async function waitForRealtime(page: Page): Promise<void> {
  await page
    .locator('[data-testid="realtime-status"][data-state="connected"]')
    .waitFor({ state: 'attached', timeout: 60_000 })
}
