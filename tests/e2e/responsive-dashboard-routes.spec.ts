import { expect, test, type Page } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  signIn,
  waitForRealtime,
} from './helpers/accounts'

const createdAccounts: string[] = []

const investorRoutes = [
  '/investor',
  '/investor/ownership',
  '/investor/documents',
  '/investor/financials',
  '/investor/distributions',
  '/investor/messages',
  '/investor/notifications',
  '/investor/profile',
]

const adminRoutes = [
  '/admin',
  '/admin/investors',
  '/admin/administrators',
  '/admin/audit-logs',
  '/admin/company-profile',
  '/admin/data-room',
  '/admin/documents',
  '/admin/documents/verification',
  '/admin/financials',
  '/admin/financials/kpis',
  '/admin/financials/periods',
  '/admin/financials/reports',
  '/admin/messages',
]

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  await deleteAccounts(createdAccounts)
  createdAccounts.length = 0
})

async function expectMobileRouteStable(page: Page, expectedPrefix: string) {
  await expect(page).toHaveURL(new RegExp(`^https?://[^/]+${expectedPrefix.replaceAll('/', '\\/')}`))
  await expect(page.locator('main#main')).toHaveCount(1)
  await waitForRealtime(page)
  await expect(page.getByRole('button', { name: 'Buka navigasi' })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)

  const visibleControls = page.locator('main#main').locator('button:visible, a:visible, input:visible, textarea:visible, select:visible')
  const controlCount = await visibleControls.count()
  for (let index = 0; index < Math.min(controlCount, 40); index += 1) {
    const control = visibleControls.nth(index)
    const box = await control.boundingBox()
    if (!box) continue

    const insideHorizontalScroller = await control.evaluate((element) => {
      let ancestor = element.parentElement
      while (ancestor && ancestor !== document.body) {
        const style = window.getComputedStyle(ancestor)
        const scrollsHorizontally =
          (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
          ancestor.scrollWidth > ancestor.clientWidth + 1

        if (scrollsHorizontally) return true
        ancestor = ancestor.parentElement
      }
      return false
    })

    if (insideHorizontalScroller) continue

    expect(box.x + box.width).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
    expect(box.x).toBeGreaterThanOrEqual(-1)
  }
}

test('investor dashboard routes stay usable on mobile', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) >= 1024, 'Mobile route sweep only runs below lg.')

  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  await signIn(page, investor, '/investor')

  for (const route of investorRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expectMobileRouteStable(page, '/investor')
  }
})

test('super admin dashboard routes stay usable on mobile', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) >= 1024, 'Mobile route sweep only runs below lg.')

  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Responsive Route Admin E2E' })
  createdAccounts.push(admin.userId)

  await signIn(page, admin, '/admin')

  for (const route of adminRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expectMobileRouteStable(page, '/admin')
  }
})
