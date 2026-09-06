import { expect, test } from '@playwright/test'

import { loginProductionAdmin } from './helpers/login'
import { deleteProductionPortalFixture } from './helpers/portal-fixtures'

test.describe('Production Portal Publication Smoke Test', () => {
  let portalPageId: string | null = null

  test.setTimeout(240_000)

  test.afterEach(async ({ page }) => {
    await deleteProductionPortalFixture(page, portalPageId)
    portalPageId = null
  })

  test('published page is public, archived and draft page are not public', async ({ page }) => {
    const runId = `public-smoke-${Date.now().toString(36)}`
    const title = `E2E Public Smoke ${runId}`
    const slug = `e2e-public-smoke-${runId}`
    const publicRoute = `/${slug}`

    console.log(`RUN_ID=${runId}`)

    // =========================================================
    // LOGIN
    // =========================================================

    await loginProductionAdmin(page)

    console.log('STEP=LOGIN_PASS')

    // =========================================================
    // OPEN CREATE PAGE
    // =========================================================

    await page.goto('/admin/portal/pages/new', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    console.log(`ADMIN_PAGE_URL=${page.url()}`)

    await expect(page.locator('#title')).toBeVisible({
      timeout: 30_000,
    })

    // =========================================================
    // CREATE DRAFT
    // =========================================================

    await page.locator('#title').fill(title)
    await page.locator('#slug').fill(slug)

    const seoDescription = page.locator('#seo_description')

    if (await seoDescription.count()) {
      await seoDescription.fill(`Production public smoke test ${runId}`)
    }

    const submitButton = page.getByRole('button', {
      name: /Simpan Draf/i,
    })

    await expect(submitButton).toBeEnabled({
      timeout: 30_000,
    })

    console.log('STEP=CREATE_SUBMIT_START')

    await submitButton.click()

    // Tunggu sampai benar-benar meninggalkan /new.
    await expect
      .poll(async () => page.url(), {
        timeout: 60_000,
        intervals: [500, 1000, 2000],
      })
      .not.toContain('/admin/portal/pages/new')

    const createdUrl = page.url()

    console.log(`CREATED_PAGE_URL=${createdUrl}`)

    const createdMatch = createdUrl.match(/\/admin\/portal\/pages\/([^/?#]+)$/)

    if (!createdMatch) {
      const body = await page.locator('body').innerText()

      console.log(`CREATE_FAILURE_BODY=${body.replace(/\s+/g, ' ').slice(0, 2000)}`)

      throw new Error(
        `Halaman berhasil submit tetapi URL detail tidak ditemukan. URL=${createdUrl}`,
      )
    }

    portalPageId = createdMatch[1] ?? null

    if (!portalPageId || portalPageId === 'new') {
      throw new Error(`PORTAL_PAGE_ID tidak valid: ${portalPageId}`)
    }

    console.log(`PORTAL_PAGE_ID=${portalPageId}`)
    console.log('STEP=DRAFT_CREATED')

    // =========================================================
    // SEND FOR REVIEW
    // =========================================================

    const reviewButton = page.getByRole('button', {
      name: /^Kirim untuk Ditinjau$/i,
    })

    await expect(reviewButton).toBeVisible({
      timeout: 30_000,
    })

    await reviewButton.click()

    await expect(
      page.getByRole('button', {
        name: /^Setujui$/i,
      }),
    ).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=REVIEW')

    // =========================================================
    // APPROVE
    // =========================================================

    const approveButton = page.getByRole('button', {
      name: /^Setujui$/i,
    })

    await expect(approveButton).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=APPROVE_SUBMIT_START')

    await approveButton.click()

    await page.waitForTimeout(1_000)

    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    console.log(`APPROVED_PAGE_URL=${page.url()}`)

    const approvedBody = await page.locator('body').innerText()

    console.log(`APPROVED_BODY=${approvedBody.replace(/\s+/g, ' ').slice(0, 1500)}`)

    const publishButton = page.getByRole('button', {
      name: /^Terbitkan$/i,
    })

    await expect(publishButton).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=APPROVED')

    // =========================================================
    // PUBLISH
    // =========================================================

    console.log('STEP=PUBLISH_SUBMIT_START')

    await publishButton.click()

    await page.waitForTimeout(1_000)

    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    console.log(`PUBLISHED_PAGE_URL=${page.url()}`)

    const archiveButton = page.getByRole('button', {
      name: /^Arsipkan$/i,
    })

    await expect(archiveButton).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=PUBLISHED')

    // =========================================================
    // VERIFY PUBLIC PAGE
    // =========================================================

    await page.goto(publicRoute, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    console.log(`PUBLIC_URL=${page.url()}`)

    const publicBody = await page.locator('body').innerText()

    console.log(`PUBLIC_STATUS_BODY=${publicBody.replace(/\s+/g, ' ').slice(0, 1000)}`)

    await expect(
      page
        .getByText(title, {
          exact: true,
        })
        .first(),
    ).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=PUBLIC_PUBLISHED_PASS')

    // =========================================================
    // RETURN DIRECTLY TO CREATED PAGE
    // IMPORTANT:
    // Jangan kembali ke /pages/new atau klik row ambigu.
    // =========================================================

    await page.goto(`/admin/portal/pages/${portalPageId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    console.log(`RETURN_ADMIN_PAGE_URL=${page.url()}`)

    await expect(
      page.getByRole('button', {
        name: /^Arsipkan$/i,
      }),
    ).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=ARCHIVE_PAGE_READY')

    // =========================================================
    // ARCHIVE
    // =========================================================

    page.once('dialog', async (dialog) => {
      console.log(`CONFIRM_DIALOG=${dialog.message()}`)
      await dialog.accept()
    })

    await page
      .getByRole('button', {
        name: /^Arsipkan$/i,
      })
      .click()

    const restoreButton = page.getByRole('button', {
      name: /^Kembalikan ke Draf$/i,
    })

    await expect(restoreButton).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=ARCHIVED')

    // =========================================================
    // VERIFY ARCHIVED PAGE IS NOT PUBLIC
    // =========================================================

    await page.goto(publicRoute, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    const archivedBody = await page.locator('body').innerText()

    console.log(`ARCHIVED_PUBLIC_BODY=${archivedBody.replace(/\s+/g, ' ').slice(0, 1000)}`)

    await expect(
      page.getByText(title, {
        exact: true,
      }),
    ).not.toBeVisible({
      timeout: 10_000,
    })

    console.log('STEP=ARCHIVED_NOT_PUBLIC_PASS')

    // =========================================================
    // RETURN TO CREATED PAGE
    // =========================================================

    await page.goto(`/admin/portal/pages/${portalPageId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    await expect(
      page.getByRole('button', {
        name: /^Kembalikan ke Draf$/i,
      }),
    ).toBeVisible({
      timeout: 30_000,
    })

    // =========================================================
    // RESTORE TO DRAFT
    // =========================================================

    await page
      .getByRole('button', {
        name: /^Kembalikan ke Draf$/i,
      })
      .click()

    await expect(
      page.getByRole('button', {
        name: /^Kirim untuk Ditinjau$/i,
      }),
    ).toBeVisible({
      timeout: 30_000,
    })

    console.log('STEP=RESTORED_TO_DRAFT')

    // =========================================================
    // VERIFY DRAFT IS NOT PUBLIC
    // =========================================================

    await page.goto(publicRoute, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    const draftBody = await page.locator('body').innerText()

    console.log(`DRAFT_PUBLIC_BODY=${draftBody.replace(/\s+/g, ' ').slice(0, 1000)}`)

    await expect(
      page.getByText(title, {
        exact: true,
      }),
    ).not.toBeVisible({
      timeout: 10_000,
    })

    console.log('STEP=DRAFT_NOT_PUBLIC_PASS')

    console.log('RESULT=PORTAL_PUBLICATION_SMOKE_PASS')
  })
})
