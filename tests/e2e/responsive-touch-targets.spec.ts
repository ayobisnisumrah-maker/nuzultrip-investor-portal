import { expect, test } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  signIn,
} from './helpers/accounts'

const createdAccounts: string[] = []

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  await deleteAccounts(createdAccounts)
  createdAccounts.length = 0
})

async function expectMobileNavigationTouchTargets(page: import('@playwright/test').Page) {
  const width = page.viewportSize()?.width ?? 1440
  test.skip(width >= 1024, 'Mobile navigation touch targets only exist below lg.')

  const openButton = page.getByRole('button', { name: 'Buka navigasi' })
  await expect(openButton).toBeVisible()

  const openBox = await openButton.boundingBox()
  expect(openBox).not.toBeNull()
  expect(openBox?.width ?? 0).toBeGreaterThanOrEqual(40)
  expect(openBox?.height ?? 0).toBeGreaterThanOrEqual(40)

  await openButton.click()

  const closeButton = page.getByRole('button', { name: 'Tutup navigasi' })
  await expect(closeButton).toBeVisible()

  const closeBox = await closeButton.boundingBox()
  expect(closeBox).not.toBeNull()
  expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(40)
  expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(40)

  const overflow = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1)

  await closeButton.click()
}

test('investor mobile navigation keeps usable touch targets', async ({ page }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  await signIn(page, investor, '/investor')
  await page.waitForLoadState('networkidle')
  await expectMobileNavigationTouchTargets(page)
})

test('admin mobile navigation keeps usable touch targets', async ({ page }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Touch Target Admin E2E' })
  createdAccounts.push(admin.userId)

  await signIn(page, admin, '/admin')
  await page.waitForLoadState('networkidle')
  await expectMobileNavigationTouchTargets(page)
})
