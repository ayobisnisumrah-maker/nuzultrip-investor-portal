import { expect, test } from '@playwright/test'

test.describe('Production Portal Publication Smoke Test', () => {
  test.setTimeout(240_000)

  test(
    'published page is public, archived and draft page are not public',
    async ({ page }) => {
      const adminEmail = process.env.E2E_ADMIN_EMAIL
      const adminPassword = process.env.E2E_ADMIN_PASSWORD

      if (!adminEmail || !adminPassword) {
        throw new Error(
          'E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD wajib tersedia.',
        )
      }

      const runId = `public-smoke-${Date.now().toString(36)}`
      const title = `E2E Public Smoke ${runId}`
      const slug = `e2e-public-smoke-${runId}`
      const publicRoute = `/${slug}`

      console.log(`RUN_ID=${runId}`)

      page.on('dialog', async (dialog) => {
        console.log(`CONFIRM_DIALOG=${dialog.message()}`)
        await dialog.accept()
      })

      // =========================================================
      // LOGIN
      // =========================================================

      await page.goto('/masuk', {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })

      const emailInput = page.locator('input[name="email"]')
      const passwordInput = page.locator('input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()
      await expect(submitButton).toBeEnabled()

      await emailInput.fill(adminEmail)
      await passwordInput.fill(adminPassword)

      // Pastikan React hydration selesai.
      await passwordInput.press('Tab')
      await page.waitForTimeout(750)

      await Promise.all([
        page.waitForURL(/\/admin(?:\/|$)/, {
          timeout: 60_000,
          waitUntil: 'commit',
        }),
        submitButton.click(),
      ])

      console.log('STEP=LOGIN_PASS')
      console.log(`LOGIN_URL=${page.url()}`)

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

      await expect(page.locator('#slug')).toBeVisible({
        timeout: 30_000,
      })

      // =========================================================
      // CREATE DRAFT
      // =========================================================

      await page.locator('#title').fill(title)
      await page.locator('#slug').fill(slug)

      const seoDescription = page.locator('#seo_description')

      if (await seoDescription.count()) {
        await seoDescription.fill(
          `Production public smoke test ${runId}`,
        )
      }

      const saveDraftButton = page.getByRole('button', {
        name: /^Simpan Draf$/i,
      })

      await expect(saveDraftButton).toBeVisible({
        timeout: 30_000,
      })

      await expect(saveDraftButton).toBeEnabled()

      await saveDraftButton.click()

      // Tunggu client transition selesai.
      await page.waitForTimeout(1_500)

      console.log(`POST_CREATE_URL=${page.url()}`)

      // =========================================================
      // RESOLVE CREATED PAGE ID
      // =========================================================

      let portalPageId: string | null = null

      const currentUrl = new URL(page.url())

      const currentMatch = currentUrl.pathname.match(
        /\/admin\/portal\/pages\/([^/]+)$/,
      )

      const currentPageId = currentMatch?.[1]

      if (
        currentPageId &&
        currentPageId !== 'new'
      ) {
        portalPageId = currentPageId
      }

      // Recovery:
      // Jika router.push belum terjadi atau production navigation
      // tidak berpindah, cari halaman yang baru dibuat dari list admin.
      if (!portalPageId) {
        console.log('RECOVERY=FIND_CREATED_PAGE_FROM_LIST')

        await page.goto('/admin/portal/pages', {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        })

        console.log(`LIST_PAGE_URL=${page.url()}`)

        const titleLocator = page.getByText(title, {
          exact: true,
        })

        await expect(titleLocator.first()).toBeVisible({
          timeout: 30_000,
        })

        const count = await titleLocator.count()

        console.log(`TITLE_MATCH_COUNT=${count}`)

        let foundHref: string | null = null

        for (let index = 0; index < count; index += 1) {
          const item = titleLocator.nth(index)

          const link = item.locator(
            'xpath=ancestor::a[contains(@href, "/admin/portal/pages/")][1]',
          )

          if (await link.count()) {
            const href = await link.getAttribute('href')

            if (
              href &&
              !href.endsWith('/new')
            ) {
              foundHref = href
              break
            }
          }

          const row = item.locator(
            'xpath=ancestor::*[self::tr or self::li or @role="row"][1]',
          )

          if (await row.count()) {
            const rowLink = row.locator(
              'a[href*="/admin/portal/pages/"]',
            ).first()

            if (await rowLink.count()) {
              const href = await rowLink.getAttribute('href')

              if (
                href &&
                !href.endsWith('/new')
              ) {
                foundHref = href
                break
              }
            }
          }
        }

        if (!foundHref) {
          const bodyText = await page.locator('body').innerText()

          console.log(
            `LIST_PAGE_BODY=${bodyText
              .replace(/\s+/g, ' ')
              .slice(0, 3000)}`,
          )

          throw new Error(
            `Tidak dapat menemukan href detail untuk halaman: ${title}`,
          )
        }

        console.log(`FOUND_DETAIL_HREF=${foundHref}`)

        const hrefMatch = foundHref.match(
          /\/admin\/portal\/pages\/([^/?#]+)/,
        )

        const foundPageId = hrefMatch?.[1]

        if (
          foundPageId &&
          foundPageId !== 'new'
        ) {
          portalPageId = foundPageId
        }
      }

      if (
        !portalPageId ||
        portalPageId === 'new'
      ) {
        throw new Error(
          `PORTAL_PAGE_ID tidak valid: ${String(portalPageId)}`,
        )
      }

      console.log(`PORTAL_PAGE_ID=${portalPageId}`)

      const detailRoute =
        `/admin/portal/pages/${portalPageId}`

      // =========================================================
      // OPEN ACTUAL DETAIL PAGE
      // =========================================================

      await page.goto(detailRoute, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })

      console.log(`DETAIL_PAGE_URL=${page.url()}`)

      await expect(
        page.getByText(title, {
          exact: true,
        }).first(),
      ).toBeVisible({
        timeout: 30_000,
      })

      console.log('STEP=DRAFT_CREATED')

      // =========================================================
      // DRAFT -> REVIEW
      // =========================================================

      const reviewButton = page.getByRole('button', {
        name: /^Kirim untuk Ditinjau$/i,
      })

      await expect(reviewButton).toBeVisible({
        timeout: 30_000,
      })

      await expect(reviewButton).toBeEnabled()

      await reviewButton.click()

      await expect(
        page.getByRole('button', {
          name: /Setujui/i,
        }),
      ).toBeVisible({
        timeout: 30_000,
      })

      console.log('STEP=REVIEW')

      // =========================================================
      // REVIEW -> APPROVED
      // =========================================================

      const approveButton = page.getByRole('button', {
        name: /^Setujui$/i,
      })

      await expect(approveButton).toBeVisible({
        timeout: 30_000,
      })

      await approveButton.click()

      await expect(
        page.getByRole('button', {
          name: /^Publikasikan$/i,
        }),
      ).toBeVisible({
        timeout: 30_000,
      })

      console.log('STEP=APPROVED')

      // =========================================================
      // APPROVED -> PUBLISHED
      // =========================================================

      const publishButton = page.getByRole('button', {
        name: /^Publikasikan$/i,
      })

      await expect(publishButton).toBeVisible({
        timeout: 30_000,
      })

      await publishButton.click()

      // Published state harus memiliki aksi archive.
      const archiveButton = page.getByRole('button', {
        name: /^Arsipkan$/i,
      })

      await expect(archiveButton).toBeVisible({
        timeout: 30_000,
      })

      console.log('STEP=PUBLISHED')

      // =========================================================
      // VERIFY PUBLISHED PAGE IS PUBLIC
      // =========================================================

      await page.goto(publicRoute, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })

      console.log(`PUBLIC_URL=${page.url()}`)

      const publicBody = await page.locator('body').innerText()

      console.log(
        `PUBLIC_STATUS_BODY=${publicBody
          .replace(/\s+/g, ' ')
          .slice(0, 1000)}`,
      )

      await expect(
        page.getByText(title, {
          exact: true,
        }).first(),
      ).toBeVisible({
        timeout: 30_000,
      })

      console.log('STEP=PUBLIC_PUBLISHED_PASS')

      // =========================================================
      // RETURN TO REAL DETAIL PAGE
      // =========================================================

      await page.goto(detailRoute, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })

      console.log(`RETURN_ADMIN_PAGE_URL=${page.url()}`)

      const archiveButtonAfterReturn = page.getByRole('button', {
        name: /^Arsipkan$/i,
      })

      await expect(archiveButtonAfterReturn).toBeVisible({
        timeout: 30_000,
      })

      await expect(archiveButtonAfterReturn).toBeEnabled()

      // =========================================================
      // PUBLISHED -> ARCHIVED
      // =========================================================

      await archiveButtonAfterReturn.click()

      await expect(
        page.getByRole('button', {
          name: /^Kembalikan ke Draf$/i,
        }),
      ).toBeVisible({
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

      console.log(
        `ARCHIVED_PUBLIC_BODY=${archivedBody
          .replace(/\s+/g, ' ')
          .slice(0, 1000)}`,
      )

      await expect(
        page.getByText(title, {
          exact: true,
        }),
      ).not.toBeVisible({
        timeout: 15_000,
      })

      console.log('STEP=ARCHIVED_NOT_PUBLIC_PASS')

      // =========================================================
      // ARCHIVED -> DRAFT
      // =========================================================

      await page.goto(detailRoute, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })

      const restoreButton = page.getByRole('button', {
        name: /^Kembalikan ke Draf$/i,
      })

      await expect(restoreButton).toBeVisible({
        timeout: 30_000,
      })

      await restoreButton.click()

      await expect(
        page.getByRole('button', {
          name: /^Kirim untuk Ditinjau$/i,
        }),
      ).toBeVisible({
        timeout: 30_000,
      })

      console.log('STEP=RESTORED_TO_DRAFT')

      // =========================================================
      // VERIFY DRAFT PAGE IS NOT PUBLIC
      // =========================================================

      await page.goto(publicRoute, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })

      const draftBody = await page.locator('body').innerText()

      console.log(
        `DRAFT_PUBLIC_BODY=${draftBody
          .replace(/\s+/g, ' ')
          .slice(0, 1000)}`,
      )

      await expect(
        page.getByText(title, {
          exact: true,
        }),
      ).not.toBeVisible({
        timeout: 15_000,
      })

      console.log('STEP=DRAFT_NOT_PUBLIC_PASS')

      console.log(
        'RESULT=PORTAL_PUBLICATION_SMOKE_PASS',
      )
    },
  )
})
