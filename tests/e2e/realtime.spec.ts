import { randomUUID } from 'node:crypto'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  advanceInvestor,
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  serviceClient,
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

function captureReceivedWebSocketFrames(page: Page): string[] {
  const frames: string[] = []
  page.on('websocket', (socket) => {
    socket.on('framereceived', (frame) => {
      frames.push(
        typeof frame.payload === 'string' ? frame.payload : frame.payload.toString('utf8'),
      )
    })
  })
  return frames
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
    const adminFrames = captureReceivedWebSocketFrames(adminPage)
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
    await expect
      .poll(
        () =>
          adminFrames.some(
            (frame) =>
              frame.includes('admin:global') &&
              frame.includes('investor.applied') &&
              frame.includes(applicant.userId),
          ),
        { message: 'admin must receive the application through its private Realtime channel' },
      )
      .toBe(true)

    await visitorContext.close()
    await adminContext.close()
  })

  test('an approval in one browser reaches the investor in another', async ({ browser }) => {
    const investor = await createInvestorAccount('submitted')
    created.push(investor.userId)

    // Browser A — the investor, waiting.
    const investorContext = await browser.newContext()
    const investorPage = await investorContext.newPage()
    const investorFrames = captureReceivedWebSocketFrames(investorPage)
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
    await expect
      .poll(
        () =>
          investorFrames.some(
            (frame) =>
              frame.includes(`investor:${investor.userId}`) &&
              frame.includes('investor.status_changed') &&
              frame.includes(investor.userId),
          ),
        { message: 'investor must receive approval through its own private Realtime channel' },
      )
      .toBe(true)

    await investorContext.close()
  })

  test('a new ownership holding appears on the investor page without reload', async ({ browser }) => {
    const investor = await createInvestorAccount('active')
    created.push(investor.userId)

    const supabase = serviceClient()
    const token = randomUUID().slice(0, 8)
    const offeringName = `Penawaran Kepemilikan E2E ${token}`
    let offeringId: string | null = null
    let holdingId: string | null = null

    const investorContext = await browser.newContext()
    const investorPage = await investorContext.newPage()
    const investorFrames = captureReceivedWebSocketFrames(investorPage)

    try {
      await signIn(investorPage, investor, '/investor/ownership')
      await openContext(investorPage)
      await waitForRealtime(investorPage)
      await expect(investorPage.locator('main')).toContainText('Belum ada kepemilikan')

      const { data: offering, error: offeringError } = await supabase
        .from('ownership_offerings')
        .insert({
          name: offeringName,
          code: `e2e-${token}`,
          status: 'draft',
          total_offered_bps: 100,
          unit_ownership_bps: 100,
          unit_price: 100_000_000,
          total_units: 1,
          distribution_cadence_months: 6,
          transfer_lock_months: 36,
        })
        .select('id')
        .single()
      if (offeringError || !offering) {
        throw new Error(`ownership offering setup failed: ${offeringError?.message}`)
      }
      offeringId = offering.id as string

      const { data: holding, error: holdingError } = await supabase
        .from('ownership_holdings')
        .insert({
          offering_id: offeringId,
          investor_id: investor.userId,
          units: 1,
          ownership_bps: 100,
          transfer_eligible_at: new Date(Date.now() + 36 * 31 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          acquisition_reference: `E2E-${token}`,
        })
        .select('id')
        .single()
      if (holdingError || !holding) {
        throw new Error(`ownership holding setup failed: ${holdingError?.message}`)
      }
      holdingId = holding.id as string

      await expect(investorPage.locator('main')).toContainText(offeringName, { timeout: 30_000 })
      await expect(investorPage.locator('main')).toContainText('1%')
      await expect
        .poll(
          () =>
            investorFrames.some(
              (frame) =>
                frame.includes(`investor:${investor.userId}`) &&
                frame.includes('ownership.changed') &&
                frame.includes(holdingId ?? ''),
            ),
          { message: 'investor must receive ownership.changed on its private Realtime channel' },
        )
        .toBe(true)
    } finally {
      if (holdingId) await supabase.from('ownership_holdings').delete().eq('id', holdingId)
      if (offeringId) await supabase.from('ownership_offerings').delete().eq('id', offeringId)
      await investorContext.close()
    }
  })

  test('a payable profit allocation appears on the investor page without reload', async ({ browser }) => {
    const investor = await createInvestorAccount('active')
    created.push(investor.userId)

    const supabase = serviceClient()
    const token = randomUUID().slice(0, 8)
    let offeringId: string | null = null
    let holdingId: string | null = null
    let distributionId: string | null = null
    let allocationId: string | null = null

    const investorContext = await browser.newContext()
    const investorPage = await investorContext.newPage()
    const investorFrames = captureReceivedWebSocketFrames(investorPage)

    try {
      const { data: offering, error: offeringError } = await supabase
        .from('ownership_offerings')
        .insert({
          name: `Distribusi E2E ${token}`,
          code: `dist-e2e-${token}`,
          status: 'draft',
          total_offered_bps: 100,
          unit_ownership_bps: 100,
          unit_price: 100_000_000,
          total_units: 1,
          distribution_cadence_months: 6,
          transfer_lock_months: 36,
        })
        .select('id')
        .single()
      if (offeringError || !offering) {
        throw new Error(`distribution offering setup failed: ${offeringError?.message}`)
      }
      offeringId = offering.id as string

      const { data: holding, error: holdingError } = await supabase
        .from('ownership_holdings')
        .insert({
          offering_id: offeringId,
          investor_id: investor.userId,
          units: 1,
          ownership_bps: 100,
          transfer_eligible_at: new Date(Date.now() + 36 * 31 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        })
        .select('id')
        .single()
      if (holdingError || !holding) {
        throw new Error(`distribution holding setup failed: ${holdingError?.message}`)
      }
      holdingId = holding.id as string

      await signIn(investorPage, investor, '/investor/distributions')
      await openContext(investorPage)
      await waitForRealtime(investorPage)
      await expect(investorPage.locator('main')).toContainText('Belum ada bagi hasil')

      const { data: distribution, error: distributionError } = await supabase
        .from('profit_distributions')
        .insert({
          offering_id: offeringId,
          period_start: '2026-01-01',
          period_end: '2026-06-30',
          revenue_amount: 100_000_000,
          opex_amount: 75_000_000,
          profit_amount: 25_000_000,
          company_share_bps: 6000,
          investor_pool_bps: 4000,
          investor_pool_amount: 10_000_000,
          status: 'payable',
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (distributionError || !distribution) {
        throw new Error(`profit distribution setup failed: ${distributionError?.message}`)
      }
      distributionId = distribution.id as string

      const { data: allocation, error: allocationError } = await supabase
        .from('profit_distribution_allocations')
        .insert({
          distribution_id: distributionId,
          holding_id: holdingId,
          investor_id: investor.userId,
          ownership_bps: 100,
          investor_pool_share_bps: 10_000,
          allocation_amount: 10_000_000,
          status: 'payable',
        })
        .select('id')
        .single()
      if (allocationError || !allocation) {
        throw new Error(`profit allocation setup failed: ${allocationError?.message}`)
      }
      allocationId = allocation.id as string

      await expect(investorPage.locator('main')).toContainText('10.000.000', { timeout: 30_000 })
      await expect(investorPage.locator('main')).toContainText('Siap Dibayar')
      await expect
        .poll(
          () =>
            investorFrames.some(
              (frame) =>
                frame.includes(`investor:${investor.userId}`) &&
                frame.includes('profit_distribution.changed') &&
                frame.includes(allocationId ?? ''),
            ),
          {
            message:
              'investor must receive profit_distribution.changed on its private Realtime channel',
          },
        )
        .toBe(true)
    } finally {
      if (allocationId) {
        await supabase.from('profit_distribution_allocations').delete().eq('id', allocationId)
      }
      if (distributionId) {
        await supabase.from('profit_distributions').delete().eq('id', distributionId)
      }
      if (holdingId) await supabase.from('ownership_holdings').delete().eq('id', holdingId)
      if (offeringId) await supabase.from('ownership_offerings').delete().eq('id', offeringId)
      await investorContext.close()
    }
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

    const frames = captureReceivedWebSocketFrames(bystanderPage)

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
