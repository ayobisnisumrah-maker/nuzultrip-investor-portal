import { expect, test, type Page } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  signIn,
} from './helpers/accounts'
import { createPublishedHomePortal } from './helpers/portal'

const createdAccounts: string[] = []

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  await deleteAccounts(createdAccounts)
  createdAccounts.length = 0
})

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
}

async function expectResponsiveAppShell(page: Page) {
  await expect(page.locator('main#main')).toHaveCount(1)
  await expectNoHorizontalOverflow(page)

  const width = page.viewportSize()?.width ?? 1440
  const navButton = page.getByRole('button', { name: 'Buka navigasi' })

  if (width < 1024) {
    await expect(navButton).toBeVisible()
    await navButton.click()
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible()
    await page.getByRole('button', { name: 'Tutup navigasi' }).click()
  } else {
    await expect(navButton).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible()
  }
}

test('public portal remains usable without horizontal overflow', async ({ page }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Portal Responsive Admin E2E' })
  createdAccounts.push(admin.userId)
  const portal = await createPublishedHomePortal(admin)

  try {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Membangun Nilai')
    await expect(page.getByRole('link', { name: 'Penawaran Equity' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tentang Nuzultrip' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  } finally {
    await portal.cleanup()
  }
})

test('investor dashboard shell remains usable across responsive breakpoints', async ({ page }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  await signIn(page, investor, '/investor')
  await page.waitForLoadState('networkidle')

  await expectResponsiveAppShell(page)
  await expect(page.locator('main#main')).toContainText('Investor')
})

test('super admin dashboard shell remains usable across responsive breakpoints', async ({ page }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Responsive Admin E2E' })
  createdAccounts.push(admin.userId)

  await signIn(page, admin, '/admin')
  await page.waitForLoadState('networkidle')

  await expectResponsiveAppShell(page)
  await expect(page.locator('main#main')).toContainText('Admin Console')
})
