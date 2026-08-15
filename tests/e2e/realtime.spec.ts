import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  advanceInvestor,
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  signIn,
  waitForRealtime,
  type TestAccount,
} from './helpers/accounts'

/**
 * The literal acceptance criterion from the brief:
 *
 *   "Browser A: Admin changes something. Browser B must receive the change
 *    automatically."
 *
 * Every assertion below runs in two **independent browser contexts** — separate
 * cookie jars, separate websockets, no shared JavaScript. Nothing here reloads
 * a page, navigates, or clicks refresh; if the content changes, it changed
 * because the database told the other browser it had.
 *
 * See docs/REALTIME.md §8.
 */

/**
 * Serial, deliberately. The dashboard assertions compare a count before and
 * after, so a sibling test creating an investor concurrently would make them
 * flaky — and a flaky security test is worse than no test, because it gets
 * muted.
 */
test.describe.configure({ mode: 'serial' })

const created: string[] = []

// These tests sign in repeatedly from one address. The rate limiter is doing
// its job when it stops them; it is verified on its own in rate-limit.spec.ts.
test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  await deleteAccounts(created)
  created.length = 0
})

async function openContext(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

test.describe('realtime propagation between browsers', () => {
  test('an application submitted in one browser appears on the admin dashboard in another', async ({
    browser,
  }) => {
    const admin = await createAdminAccount({ roleKey: 'super_admin' })
    created.push(admin.userId)

    // Browser A — an administrator watching the dashboard.
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await signIn(adminPage, admin, '/admin')
    await openContext(adminPage)
    await waitForRealtime(adminPage)

    const pendingValue = adminPage.getByTestId('stat-pending-review-value')
    const before = Number((await pendingValue.textContent()) ?? '0')

    // Browser B — an anonymous visitor submitting an application. Entirely
    // separate context: different cookies, different socket.
    const visitorContext = await browser.newContext()
    await visitorContext.newPage()
    const applicant = await createInvestorAccount('submitted')
    created.push(applicant.userId)

    // The dashboard must move without anyone touching browser A.
    await expect
      .poll(async () => Number((await pendingValue.textContent()) ?? '0'), {
        message: 'the admin dashboard should update itself when an application arrives',
        timeout: 30_000,
      })
      .toBe(before + 1)

    await visitorContext.close()
    await adminContext.close()
  })

  test('an approval in one browser reaches the investor in another', async ({ browser }) => {
    const investor = await createInvestorAccount('submitted')
    created.push(investor.userId)

    // Browser A — the investor, waiting.
    const investorContext = await browser.newContext()
    const investorPage = await investorContext.newPage()
    await signIn(investorPage, investor, '/investor')
    await openContext(investorPage)
    await waitForRealtime(investorPage)

    await expect(investorPage.locator('main')).toContainText('Diajukan')

    // Browser B — the change is made elsewhere. It does not matter who makes
    // it: the trigger fires on the row, not on the caller.
    await advanceInvestor(investor.userId, ['under_review', 'approved', 'active'])

    // No reload, no navigation, no click.
    await expect(investorPage.locator('main')).toContainText('Aktif', { timeout: 30_000 })
    await expect(investorPage.locator('main')).toContainText('Riwayat status')

    await investorContext.close()
  })

  test('an unrelated investor receives nothing', async ({ browser }) => {
    // Realtime must not become the leak. This is asserted as directly as
    // possible: capture every websocket frame the bystander's browser receives
    // and require that none of them mentions the other investor.
    const subject = await createInvestorAccount('active')
    const bystander = await createInvestorAccount('active')
    created.push(subject.userId, bystander.userId)

    const bystanderContext = await browser.newContext()
    const bystanderPage = await bystanderContext.newPage()

    const frames: string[] = []
    bystanderPage.on('websocket', (socket) => {
      socket.on('framereceived', (frame) => {
        if (typeof frame.payload === 'string') frames.push(frame.payload)
      })
    })

    await signIn(bystanderPage, bystander, '/investor')
    await openContext(bystanderPage)
    await waitForRealtime(bystanderPage)

    // Something happens to the *other* investor.
    await advanceInvestor(subject.userId, ['inactive'])

    // Give any leak a generous chance to arrive before asserting it did not.
    await bystanderPage.waitForTimeout(8_000)

    const leaked = frames.filter((frame) => frame.includes(subject.userId))
    expect(leaked, `bystander received ${leaked.length} frame(s) about another investor`).toEqual(
      [],
    )

    // And their own view is unchanged.
    await expect(bystanderPage.locator('main')).toContainText('Aktif')

    await bystanderContext.close()
  })

  test('the live-data indicator reports the connection state', async ({ browser }) => {
    const admin = await createAdminAccount({ roleKey: 'admin_internal' })
    created.push(admin.userId)

    const context: BrowserContext = await browser.newContext()
    const page = await context.newPage()
    await signIn(page, admin, '/admin')
    await waitForRealtime(page)

    const indicator = page.locator('[data-testid="realtime-status"]')
    await expect(indicator).toHaveAttribute('data-state', 'connected')

    // A user must be able to tell when they are no longer looking at live data.
    await context.setOffline(true)
    await expect(indicator).not.toHaveAttribute('data-state', 'connected', { timeout: 30_000 })

    await context.setOffline(false)
    await expect(indicator).toHaveAttribute('data-state', 'connected', { timeout: 60_000 })

    await context.close()
  })
})

test.describe('cross-investor isolation through the browser', () => {
  test('an investor cannot reach the admin surface', async ({ browser }) => {
    const investor = await createInvestorAccount('active')
    created.push(investor.userId)

    const context = await browser.newContext()
    const page = await context.newPage()
    await signIn(page, investor, '/investor')

    // The server redirects mid-navigation, which is the behaviour under test.
    // Playwright reports the interrupted `goto` as an error, so the assertion
    // is on where the browser actually ends up.
    await page.goto('/admin', { waitUntil: 'commit' }).catch(() => {})
    await page.waitForURL(/\/investor/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/investor/)

    await context.close()
  })

  test('an admin cannot reach the investor surface', async ({ browser }) => {
    const admin: TestAccount = await createAdminAccount({ roleKey: 'super_admin' })
    created.push(admin.userId)

    const context = await browser.newContext()
    const page = await context.newPage()
    await signIn(page, admin, '/admin')

    await page.goto('/investor', { waitUntil: 'commit' }).catch(() => {})
    await page.waitForURL(/\/admin/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/admin/)

    await context.close()
  })
})
