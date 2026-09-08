import { expect, test, type Page } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  signIn,
  waitForRealtime,
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

async function clickShellLink(page: Page, href: string): Promise<void> {
  const width = page.viewportSize()?.width ?? 1440
  if (width < 1024) {
    const openButton = page.getByRole('button', { name: 'Buka navigasi' })
    await expect(openButton).toBeVisible()
    await openButton.click()
  }

  const navigation = page.getByRole('navigation', { name: 'Navigasi utama' })
  await expect(navigation).toBeVisible()

  const link = navigation.locator(`a[href="${href}"]`).first()
  await expect(link).toBeVisible()
  await link.click()

  await page.waitForURL((url) => url.pathname === href, { timeout: 60_000 })
  await expect(page.locator('main#main')).toBeVisible()
  await waitForRealtime(page)
}

test('public portal CTA links scroll to their published targets', async ({ page }) => {
  const admin = await createAdminAccount({
    roleKey: 'super_admin',
    fullName: 'Portal Navigation Admin E2E',
  })
  createdAccounts.push(admin.userId)
  const portal = await createPublishedHomePortal(admin)

  try {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    const equityCta = page.getByRole('link', { name: 'Penawaran Equity' })
    await expect(equityCta).toBeVisible()
    await equityCta.click()
    await expect(page).toHaveURL(/#penawaran$/)
    await expect(page.locator('#penawaran')).toBeVisible()
    await waitForRealtime(page)

    const aboutCta = page.getByRole('link', { name: 'Tentang Nuzultrip' })
    await expect(aboutCta).toBeVisible()
    await aboutCta.click()
    await expect(page).toHaveURL(/#tentang$/)
    await expect(page.locator('#tentang')).toBeVisible()
    await waitForRealtime(page)
  } finally {
    await portal.cleanup()
  }
})

test('investor navigation opens key pages and reconnects live data after each click', async ({ page }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  await signIn(page, investor, '/investor')
  await page.waitForLoadState('networkidle')
  await waitForRealtime(page)

  for (const href of [
    '/investor/ownership',
    '/investor/documents',
    '/investor/financials',
    '/investor/messages',
    '/investor/profile',
  ]) {
    await clickShellLink(page, href)
  }
})

test('super admin navigation opens key pages and reconnects live data after each click', async ({ page }) => {
  const admin = await createAdminAccount({
    roleKey: 'super_admin',
    fullName: 'Admin Navigation E2E',
  })
  createdAccounts.push(admin.userId)

  await signIn(page, admin, '/admin')
  await page.waitForLoadState('networkidle')
  await waitForRealtime(page)

  for (const href of [
    '/admin/investors',
    '/admin/inquiries',
    '/admin/financials',
    '/admin/documents',
    '/admin/portal',
    '/admin/company-profile',
  ]) {
    await clickShellLink(page, href)
  }
})
