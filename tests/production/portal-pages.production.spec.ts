import { test, expect } from '@playwright/test'

import { deleteProductionPortalFixture } from './helpers/portal-fixtures'

/**
 * REAL PRODUCTION CMS SMOKE TEST
 *
 * SAFETY RULES:
 * - No globalSetup
 * - No database reset
 * - No service role
 * - No rate limit deletion
 * - Browser-only interaction
 *
 * Required environment variables:
 * E2E_ADMIN_EMAIL
 * E2E_ADMIN_PASSWORD
 */

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test.describe('Production Portal CMS', () => {
  let portalPageId: string | null = null

  test.skip(
    !adminEmail || !adminPassword,
    'Set E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD sebelum menjalankan production smoke test.',
  )

  test.afterEach(async ({ page }) => {
    await deleteProductionPortalFixture(page, portalPageId)
    portalPageId = null
  })

  test('admin can login and create portal page draft', async ({ page }) => {
    const runId = `e2e-${Date.now().toString(36)}`
    const title = `E2E Production ${runId}`
    const slug = `e2e-production-${runId}`

    await test.step('Open production login', async () => {
      await page.goto('/masuk', {
        waitUntil: 'networkidle',
      })

      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
    })

    await test.step('Login as production test admin', async () => {
      await page.locator('input[name="email"]').fill(adminEmail!)
      await page.locator('input[name="password"]').fill(adminPassword!)

      await page.locator('button[type="submit"]').click()

      await page.waitForURL(/\/admin/, {
        timeout: 60_000,
      })

      await expect(page).toHaveURL(/\/admin/)
    })

    await test.step('Open portal page creation', async () => {
      await page.goto('/admin/portal/pages/new', {
        waitUntil: 'networkidle',
      })

      await expect(page.locator('#title')).toBeVisible()
      await expect(page.locator('#slug')).toBeVisible()
    })

    await test.step('Create real draft page', async () => {
      await page.locator('#title').fill(title)
      await page.locator('#slug').fill(slug)

      await page.locator('#seo_description').fill(`Real production smoke test ${runId}`)

      await page
        .getByRole('button', {
          name: /Simpan Draf/i,
        })
        .click()

      await page.waitForURL(/\/admin\/portal\/pages\/[^/]+$/, {
        timeout: 60_000,
      })

      portalPageId = page.url().match(/\/admin\/portal\/pages\/([^/?#]+)$/)?.[1] ?? null

      expect(portalPageId).not.toBeNull()

      await expect(page.getByRole('heading', { name: title })).toBeVisible()

      await expect(
        page
          .locator('span')
          .filter({ hasText: /^Draf$/ })
          .first(),
      ).toBeVisible()
    })

    // IMPORTANT:
    // Test ini sengaja berhenti di CREATE + READ Draft.
    // Setelah hasil real ini PASS, kita tambah lifecycle:
    // Review -> Approve -> Publish -> Public Verify -> Archive/Delete.
  })
})
