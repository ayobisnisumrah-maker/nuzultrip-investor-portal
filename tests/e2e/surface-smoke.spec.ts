import { expect, test, type Page } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  signIn,
} from './helpers/accounts'

const SURFACE_PROJECTS = new Set(['chromium', 'tablet-chrome', 'mobile-chrome'])

const ADMIN_ROUTES = [
  '/admin',
  '/admin/administrators',
  '/admin/administrators/new',
  '/admin/audit-logs',
  '/admin/company-profile',
  '/admin/data-room',
  '/admin/documents',
  '/admin/documents/new',
  '/admin/documents/verification',
  '/admin/financials',
  '/admin/financials/kpis',
  '/admin/financials/periods',
  '/admin/financials/reports',
  '/admin/inquiries',
  '/admin/investor-documents',
  '/admin/investors',
  '/admin/investors/applications',
  '/admin/messages',
  '/admin/ownership',
  '/admin/ownership/inheritance',
  '/admin/ownership/offerings',
  '/admin/ownership/offerings/new',
  '/admin/ownership/transfers',
  '/admin/portal',
  '/admin/portal/cta',
  '/admin/portal/documents',
  '/admin/portal/faq',
  '/admin/portal/hero',
  '/admin/portal/media',
  '/admin/portal/navigation',
  '/admin/portal/pages',
  '/admin/portal/pages/new',
  '/admin/profit-distributions',
  '/admin/roles',
  '/admin/settings',
] as const

const INVESTOR_ROUTES = [
  '/investor',
  '/investor/documents',
  '/investor/financials',
  '/investor/messages',
  '/investor/notifications',
  '/investor/ownership',
  '/investor/profile',
] as const

const PUBLIC_ROUTES = ['/', '/hubungi', '/masuk', '/daftar-investor', '/lupa-sandi'] as const

function runtimeFailures(page: Page): string[] {
  const failures: string[] = []

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 500) failures.push(`${response.status()} ${response.url()}`)
  })

  return failures
}

async function expectHealthyRoutes(page: Page, routes: readonly string[], area: string) {
  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.status(), `${area}: ${route}`).toBeLessThan(500)
    await expect(page.locator('body'), `${area}: ${route}`).not.toContainText(
      /Application error|Internal Server Error|Kesalahan aplikasi/i,
    )

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflows, `${area}: ${route} has horizontal overflow`).toBe(false)
  }
}

test.describe.configure({ mode: 'serial' })

test.beforeEach(async (_fixtures, testInfo) => {
  test.skip(
    !SURFACE_PROJECTS.has(testInfo.project.name),
    'Surface matrix: desktop, tablet, mobile.',
  )
  await clearRateLimits()
})

test('public portal and authentication routes render cleanly', async ({ page }) => {
  const failures = runtimeFailures(page)
  await expectHealthyRoutes(page, PUBLIC_ROUTES, 'public')

  await page.goto('/hubungi')
  await expect(page.getByLabel('Nama lengkap')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Pesan')).toBeVisible()

  await page.goto('/masuk')
  await expect(page.getByLabel(/Surel/)).toBeVisible()
  await expect(page.getByLabel(/Kata sandi/)).toBeVisible()

  expect(failures).toEqual([])
})

test('every static Super Admin route renders without server or layout errors', async ({ page }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const failures = runtimeFailures(page)

  try {
    await signIn(page, admin, '/admin')
    await expectHealthyRoutes(page, ADMIN_ROUTES, 'admin')
    await expect(page).not.toHaveURL(/\/masuk/)
    expect(failures).toEqual([])
  } finally {
    await deleteAccounts([admin.userId])
  }
})

test('every static Investor route renders without server or layout errors', async ({ page }) => {
  const investor = await createInvestorAccount('active')
  const failures = runtimeFailures(page)

  try {
    await signIn(page, investor, '/investor')
    await expectHealthyRoutes(page, INVESTOR_ROUTES, 'investor')
    await expect(page).not.toHaveURL(/\/masuk/)
    expect(failures).toEqual([])
  } finally {
    await deleteAccounts([investor.userId])
  }
})
