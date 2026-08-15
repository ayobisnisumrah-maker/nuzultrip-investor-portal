import { expect, test } from '@playwright/test'
import {
  clearRateLimits,
  createAdminAccount,
  deleteAccounts,
  exhaustRateLimit,
} from './helpers/accounts'

/**
 * The rate limiter's **wiring**, end to end.
 *
 * The counter itself is exercised thoroughly and quickly in
 * `tests/integration/rate-limit.test.ts`. What can only be proved here is that
 * the sign-in form is actually connected to it and that a throttled user is
 * told so clearly.
 *
 * The budget is therefore spent through the service role rather than by
 * driving the browser through eight password attempts — that version took
 * minutes, saturated the local stack, and told us nothing the direct test
 * doesn't.
 *
 * See docs/SECURITY.md §10.
 */
test.describe.configure({ mode: 'serial' })

const created: string[] = []

test.afterAll(async () => {
  await deleteAccounts(created)
  await clearRateLimits()
  created.length = 0
})

// Scoped to `main`: Next renders its own `role="alert"` route announcer on the
// document body, which would otherwise make this locator ambiguous.
const ALERT = 'main [role="alert"]'

test('a throttled sign-in is refused and says so', async ({ page }) => {
  await clearRateLimits()

  const admin = await createAdminAccount({ roleKey: 'admin_internal' })
  created.push(admin.userId)

  // Spend the budget for this address without touching the browser.
  await exhaustRateLimit('auth.sign_in', admin.email)

  await page.goto('/masuk')
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', admin.email)
  // Deliberately the *correct* password: a limiter that only stops people who
  // are guessing wrong is precisely backwards.
  await page.fill('input[name="password"]', admin.password)
  await page.click('button[type="submit"]')

  const alert = page.locator(ALERT)
  await alert.waitFor({ state: 'visible', timeout: 30_000 })
  await expect(alert).toContainText('Terlalu banyak percobaan')
  await expect(page).toHaveURL(/\/masuk/)
})

test('clearing the budget restores access', async ({ page }) => {
  // Proves the previous test was blocked by the limiter and not by something
  // else — a refusal that never lifts is indistinguishable from a broken login.
  const admin = await createAdminAccount({ roleKey: 'admin_internal' })
  created.push(admin.userId)

  await exhaustRateLimit('auth.sign_in', admin.email)
  await clearRateLimits()

  await page.goto('/masuk')
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', admin.email)
  await page.fill('input[name="password"]', admin.password)
  await page.click('button[type="submit"]')

  await page.waitForURL('**/admin', { timeout: 60_000 })
  await expect(page).toHaveURL(/\/admin/)
})

test('the failure message does not reveal whether an account exists', async ({ page }) => {
  await clearRateLimits()

  const admin = await createAdminAccount({ roleKey: 'admin_internal' })
  created.push(admin.userId)

  const attempt = async (email: string): Promise<string> => {
    await page.goto('/masuk')
    await page.waitForLoadState('networkidle')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'KataSandiYangSalah2026')
    await page.click('button[type="submit"]')

    const alert = page.locator(ALERT)
    await alert.waitFor({ state: 'visible', timeout: 30_000 })
    return await alert.innerText()
  }

  const existing = await attempt(admin.email)
  const missing = await attempt(`tidak-ada-${Date.now()}@example.test`)

  // Correlation ids differ per request, so compare the human-readable part.
  const strip = (text: string) => text.replace(/Kode referensi:.*/s, '').trim()

  expect(strip(existing)).toContain('Surel atau kata sandi tidak sesuai')
  expect(strip(missing)).toBe(strip(existing))
})
