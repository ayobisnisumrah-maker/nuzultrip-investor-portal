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

function normalizeDashboardHref(href: string, scope: '/admin' | '/investor'): string | null {
  try {
    const url = new URL(href, 'http://dashboard.local')
    if (url.origin !== 'http://dashboard.local') return null
    if (url.pathname !== scope && !url.pathname.startsWith(`${scope}/`)) return null

    // Hash-only and query variants do not represent distinct App Router pages.
    return url.pathname
  } catch {
    return null
  }
}

async function collectDashboardLinks(
  page: Page,
  scope: '/admin' | '/investor',
): Promise<string[]> {
  const hrefs = await page.locator(`a[href^="${scope}"]`).evaluateAll((anchors) =>
    anchors
      .map((anchor) => anchor.getAttribute('href'))
      .filter((href): href is string => Boolean(href)),
  )

  return [
    ...new Set(
      hrefs
        .map((href) => normalizeDashboardHref(href, scope))
        .filter((href): href is string => href !== null),
    ),
  ]
}

async function crawlDashboard(
  page: Page,
  scope: '/admin' | '/investor',
): Promise<string[]> {
  const pending = [scope]
  const visited = new Set<string>()
  const failures: string[] = []

  while (pending.length > 0) {
    const pathname = pending.shift()!
    if (visited.has(pathname)) continue
    visited.add(pathname)

    const response = await page.goto(pathname, { waitUntil: 'networkidle' })
    const status = response?.status() ?? 0
    const finalPath = new URL(page.url()).pathname

    if (status < 200 || status >= 400) {
      failures.push(`${pathname}: HTTP ${status || 'no-response'}`)
      continue
    }

    if (finalPath !== pathname) {
      failures.push(`${pathname}: redirected to ${finalPath}`)
      continue
    }

    if (!(await page.locator('main#main').isVisible())) {
      failures.push(`${pathname}: main#main is not visible`)
      continue
    }

    const body = await page.locator('body').innerText()
    if (/halaman tidak ditemukan|page not found|application error/i.test(body)) {
      failures.push(`${pathname}: rendered a not-found/error boundary`)
      continue
    }

    for (const discovered of await collectDashboardLinks(page, scope)) {
      if (!visited.has(discovered) && !pending.includes(discovered)) {
        pending.push(discovered)
      }
    }
  }

  expect(visited.size, `${scope} crawl should visit more than its landing page`).toBeGreaterThan(1)
  expect(failures, `Dashboard route failures:\n${failures.join('\n')}`).toEqual([])

  return [...visited].sort()
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

test('every reachable investor dashboard page resolves without 404 or error boundary', async ({ page }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  await signIn(page, investor, '/investor')
  await crawlDashboard(page, '/investor')
})

test('every reachable super admin dashboard page resolves without 404 or error boundary', async ({ page }) => {
  const admin = await createAdminAccount({
    roleKey: 'super_admin',
    fullName: 'Dashboard Route Audit Admin E2E',
  })
  createdAccounts.push(admin.userId)

  await signIn(page, admin, '/admin')
  await crawlDashboard(page, '/admin')
})
