import { expect, test, type Page } from '@playwright/test'

import {
  advanceInvestor,
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  signIn,
  waitForRealtime,
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

function numericValue(text: string): number {
  const normalized = text.replace(/[^0-9-]/g, '')
  const value = Number(normalized)
  if (!Number.isFinite(value)) throw new Error(`Unable to parse dashboard value from: ${text}`)
  return value
}

async function expectHealthyDashboard(page: Page): Promise<void> {
  await expect(page.locator('main#main')).toBeVisible()
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/application error|halaman tidak ditemukan|page not found/i)
}

test('admin dashboard refreshes investor statistics from realtime events without reload', async ({
  page,
}) => {
  const admin = await createAdminAccount({
    roleKey: 'super_admin',
    fullName: 'Dashboard Realtime Admin E2E',
  })
  createdAccounts.push(admin.userId)

  await signIn(page, admin, '/admin')
  await page.waitForLoadState('networkidle')
  await waitForRealtime(page)
  await expectHealthyDashboard(page)

  const activeInvestors = page.getByTestId('stat-active-investors')
  await expect(activeInvestors).toBeVisible()
  const before = numericValue(await activeInvestors.innerText())

  // Provision the investor outside the Admin browser. The dashboard must update from
  // investor.applied / investor.status_changed broadcasts rather than a manual reload.
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  await expect
    .poll(async () => numericValue(await activeInvestors.innerText()), {
      message: 'Admin dashboard did not synchronize the new active investor via realtime',
      timeout: 30_000,
    })
    .toBe(before + 1)

  await expectHealthyDashboard(page)
})

test('investor dashboard grants data access from legal lifecycle events without reload and never renders blank', async ({
  page,
}) => {
  const investor = await createInvestorAccount('submitted')
  createdAccounts.push(investor.userId)

  await signIn(page, investor, '/investor')
  await page.waitForLoadState('networkidle')
  await waitForRealtime(page)
  await expectHealthyDashboard(page)

  await expect(page.getByText('Status: submitted', { exact: true })).toBeVisible()
  await expect(page.getByText('Unit aktif', { exact: true })).toHaveCount(0)

  // Walk the same legal lifecycle used by production. There is deliberately no
  // page.goto(), page.reload(), or user navigation after these mutations.
  await advanceInvestor(investor.userId, ['under_review', 'approved', 'active'])

  await expect(page.getByText('Unit aktif', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Bagi hasil siap dibayar', { exact: true })).toBeVisible()
  await expect(page.getByText('Status: submitted', { exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(/\/investor$/)
  await expectHealthyDashboard(page)
})
