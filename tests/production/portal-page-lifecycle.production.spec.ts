import { test, expect } from '@playwright/test'

import { deleteProductionPortalFixture } from './helpers/portal-fixtures'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test.describe('Production Portal Page Lifecycle', () => {
  let portalPageId: string | null = null

  test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD wajib tersedia.')

  test.afterEach(async ({ page }) => {
    await deleteProductionPortalFixture(page, portalPageId)
    portalPageId = null
  })

  test('admin can execute Draft to Review to Approved to Published to Archived lifecycle', async ({
    page,
  }) => {
    test.setTimeout(180_000)

    const runId = `lifecycle-${Date.now().toString(36)}`
    const title = `E2E Lifecycle ${runId}`
    const slug = `e2e-lifecycle-${runId}`

    console.log(`RUN_ID=${runId}`)

    page.setDefaultTimeout(30_000)
    page.setDefaultNavigationTimeout(60_000)

    // LOGIN
    await page.goto('/masuk', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    await expect(page.locator('input[name="email"]')).toBeVisible()

    await page.locator('input[name="email"]').fill(adminEmail!)
    await page.locator('input[name="password"]').fill(adminPassword!)

    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\/admin/, {
      timeout: 60_000,
      waitUntil: 'commit',
    })

    console.log('STEP=LOGIN_PASS')

    // CREATE DRAFT
    await page.goto('/admin/portal/pages/new', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    await expect(page.locator('#title')).toBeVisible()

    await page.locator('#title').fill(title)
    await page.locator('#slug').fill(slug)

    const seoDescription = page.locator('#seo_description')

    if (await seoDescription.count()) {
      await seoDescription.fill(`Production lifecycle test ${runId}`)
    }

    await page
      .getByRole('button', {
        name: /Simpan Draf/i,
      })
      .click()

    await page.waitForURL(/\/admin\/portal\/pages\/[^/]+$/, {
      timeout: 60_000,
      waitUntil: 'commit',
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

    console.log('STEP=DRAFT_CREATED')
    console.log(`PAGE_URL=${page.url()}`)

    // DRAFT -> REVIEW
    await page
      .getByRole('button', {
        name: /^Kirim untuk Ditinjau$/i,
      })
      .click()

    await expect(page.getByRole('button', { name: /^Setujui$/i })).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=REVIEW')

    // REVIEW -> APPROVED
    await page
      .getByRole('button', {
        name: /^Setujui$/i,
      })
      .click()

    await expect(page.getByRole('button', { name: /^Terbitkan$/i })).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=APPROVED')

    // APPROVED -> PUBLISHED
    await page
      .getByRole('button', {
        name: /^Terbitkan$/i,
      })
      .click()

    await expect(page.getByRole('button', { name: /^Arsipkan$/i })).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=PUBLISHED')

    // PUBLISHED -> ARCHIVED
    page.once('dialog', async (dialog) => {
      console.log(`CONFIRM_DIALOG=${dialog.message()}`)
      await dialog.accept()
    })

    await page
      .getByRole('button', {
        name: /^Arsipkan$/i,
      })
      .click()

    // ARCHIVED state verification.
    // Do not depend on restore button because visibility is permission-dependent.
    // Diagnostic: inspect actual UI after archive action.
    await page.waitForTimeout(3_000)

    console.log(`AFTER_ARCHIVE_URL=${page.url()}`)
    console.log(
      `AFTER_ARCHIVE_BODY=${(await page.locator('body').innerText())
        .replace(/\\s+/g, ' ')
        .slice(0, 3000)}`,
    )

    await expect(page.locator('strong.text-fg').filter({ hasText: 'Diarsipkan' })).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=ARCHIVED')

    await expect(page.getByText('Halaman telah diarsipkan', { exact: true })).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=ARCHIVED')
    console.log('RESULT=PORTAL_PAGE_LIFECYCLE_PASS')

    console.log('STEP=ARCHIVED')
    console.log('RESULT=PORTAL_PAGE_LIFECYCLE_PASS')
  })
})
