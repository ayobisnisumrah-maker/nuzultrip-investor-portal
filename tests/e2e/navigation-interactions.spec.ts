import { expect, test, type Page, type Response } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  serviceClient,
  signIn,
  waitForRealtime,
} from './helpers/accounts'
import { createPublishedHomePortal } from './helpers/portal'

const createdAccounts: string[] = []
const createdFinancialPeriods: string[] = []

type DashboardScope = '/admin' | '/investor'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  const supabase = serviceClient()
  if (createdFinancialPeriods.length > 0) {
    const { error } = await supabase
      .from('financial_periods')
      .delete()
      .in('id', createdFinancialPeriods)
    if (error) throw new Error(`Failed to delete route-audit financial periods: ${error.message}`)
    createdFinancialPeriods.length = 0
  }

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

function normalizeDashboardHref(href: string, scope: DashboardScope): string | null {
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

async function collectDashboardLinks(page: Page, scope: DashboardScope): Promise<string[]> {
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

async function gotoDashboardPath(page: Page, pathname: string): Promise<Response | null> {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await page.goto(pathname, { waitUntil: 'domcontentloaded' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const interrupted = /navigation.+interrupted by another navigation/i.test(message)

      if (!interrupted || attempt === maxAttempts) throw error

      // WebKit can surface an App Router hydration/refresh navigation as a
      // competing navigation. Let that navigation settle, then retry the exact
      // path. Redirects are not accepted here: the caller still validates that
      // the final pathname exactly matches the requested pathname.
      await page.waitForLoadState('domcontentloaded').catch(() => undefined)
    }
  }

  return null
}

async function crawlDashboard(page: Page, scope: DashboardScope): Promise<string[]> {
  const pending: string[] = [scope]
  const visited = new Set<string>()
  const failures: string[] = []

  while (pending.length > 0) {
    const pathname = pending.shift()!
    if (visited.has(pathname)) continue
    visited.add(pathname)

    const response = await gotoDashboardPath(page, pathname)
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

    try {
      // App Router + realtime hydration can briefly replace the streamed tree,
      // especially in WebKit. Wait for the shared dashboard shell instead of
      // taking a single visibility snapshot during that transition.
      await expect(page.locator('main#main')).toBeVisible({ timeout: 30_000 })
    } catch {
      failures.push(`${pathname}: main#main is not visible after hydration`)
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

async function createRouteAuditFinancialPeriod(): Promise<string> {
  const supabase = serviceClient()
  const uniqueYear = 2098
  const { data, error } = await supabase
    .from('financial_periods')
    .insert({
      period_type: 'monthly',
      fiscal_year: uniqueYear,
      period_index: 12,
      starts_on: `${uniqueYear}-12-01`,
      ends_on: `${uniqueYear}-12-31`,
      currency: 'IDR',
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create route-audit financial period: ${error?.message}`)
  }

  createdFinancialPeriods.push(data.id as string)
  return data.id as string
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
  const financialPeriodId = await createRouteAuditFinancialPeriod()

  await signIn(page, admin, '/admin')
  const visited = await crawlDashboard(page, '/admin')

  expect(visited).toContain(`/admin/financials/periods/${financialPeriodId}`)
  expect(visited).toContain(`/admin/financials/periods/${financialPeriodId}/edit`)
})
