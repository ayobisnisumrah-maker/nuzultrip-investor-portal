import { test, expect } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test.describe('Production Portal Page Restore and Delete', () => {
  test.skip(
    !adminEmail || !adminPassword,
    'E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD wajib tersedia.',
  )

  test('admin can archive, restore to draft, archive again, and permanently delete', async ({
    page,
  }) => {
    test.setTimeout(180_000)

    const runId = `restore-delete-${Date.now().toString(36)}`
    const title = `E2E Restore Delete ${runId}`
    const slug = `e2e-restore-delete-${runId}`

    console.log(`RUN_ID=${runId}`)

    page.setDefaultTimeout(30_000)
    page.setDefaultNavigationTimeout(60_000)

    page.on('dialog', async (dialog) => {
      console.log(`CONFIRM_DIALOG=${dialog.message()}`)
      await dialog.accept()
    })

    // LOGIN
    await page.goto('/masuk', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    await expect(
      page.locator('input[name="email"]'),
    ).toBeVisible()

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
      await seoDescription.fill(`Production restore-delete test ${runId}`)
    }

    await page.getByRole('button', {
      name: /Simpan Draf/i,
    }).click()

    await page.waitForURL(/\/admin\/portal\/pages\/[^/]+$/, {
      timeout: 60_000,
      waitUntil: 'commit',
    })

    await expect(
      page.getByRole('heading', { name: title }),
    ).toBeVisible()

    await expect(
      page.locator('span').filter({ hasText: /^Draf$/ }).first(),
    ).toBeVisible()

    console.log(`PAGE_URL=${page.url()}`)
    console.log('STEP=DRAFT_CREATED')

    // DRAFT -> REVIEW
    await page.getByRole('button', {
      name: /kirim untuk ditinjau/i,
    }).click()

    await expect(
      page.getByText('Ditinjau', { exact: true }).first(),
    ).toBeVisible()

    console.log('STEP=REVIEW')

    // REVIEW -> APPROVED
    await page.getByRole('button', {
      name: /setujui/i,
    }).click()

    await expect(
      page.getByText('Disetujui', { exact: true }).first(),
    ).toBeVisible()

    console.log('STEP=APPROVED')

    // APPROVED -> PUBLISHED
    await page.getByRole('button', {
      name: /terbitkan/i,
    }).click()

    await expect(
      page.getByText('Terbit', { exact: true }).first(),
    ).toBeVisible()

    console.log('STEP=PUBLISHED')

    // PUBLISHED -> ARCHIVED
    await page.getByRole('button', {
      name: /arsipkan/i,
    }).click()

    await expect(
      page.getByText('Diarsipkan', { exact: true }).first(),
    ).toBeVisible()

    console.log('STEP=ARCHIVED')

    // ARCHIVED -> DRAFT
    await page.getByRole('button', {
      name: /kembalikan ke draf/i,
    }).click()

    await expect(
      page.getByText('Draf', { exact: true }).first(),
    ).toBeVisible()

    console.log('STEP=RESTORED_TO_DRAFT')

    // DRAFT -> REVIEW
    await page.getByRole('button', {
      name: /kirim untuk ditinjau/i,
    }).click()

    await expect(
      page.getByText('Ditinjau', { exact: true }).first(),
    ).toBeVisible()

    // REVIEW -> APPROVED
    await page.getByRole('button', {
      name: /setujui/i,
    }).click()

    await expect(
      page.getByText('Disetujui', { exact: true }).first(),
    ).toBeVisible()

    // APPROVED -> PUBLISHED
    await page.getByRole('button', {
      name: /terbitkan/i,
    }).click()

    await expect(
      page.getByText('Terbit', { exact: true }).first(),
    ).toBeVisible()

    // PUBLISHED -> ARCHIVED AGAIN
    await page.getByRole('button', {
      name: /arsipkan/i,
    }).click()

    await expect(
      page.getByText('Diarsipkan', { exact: true }).first(),
    ).toBeVisible()

    console.log('STEP=ARCHIVED_AGAIN')

    // PERMANENT DELETE
    await page.getByRole('button', {
      name: /hapus permanen/i,
    }).click()

    await page.waitForURL(/\/admin\/portal\/pages$/, {
      timeout: 60_000,
    })

    console.log('STEP=PERMANENT_DELETE_PASS')
    console.log('RESULT=PORTAL_PAGE_RESTORE_DELETE_PASS')
  })
})
