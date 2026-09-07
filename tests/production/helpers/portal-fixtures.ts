import { expect, type Page } from '@playwright/test'

const lifecycleButtons = [/^Kirim untuk Ditinjau$/i, /^Setujui$/i, /^Terbitkan$/i] as const

async function clickAndWaitForStateChange(page: Page, name: RegExp) {
  const button = page.getByRole('button', { name })

  await expect(button).toBeVisible({ timeout: 30_000 })
  await button.click()
  await expect(button).not.toBeVisible({ timeout: 30_000 })
}

async function resolvePortalFixtureIdBySlug(page: Page, slug: string): Promise<string | null> {
  await page.goto('/admin/portal/pages', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })

  const row = page
    .locator('div.divide-y > div')
    .filter({ hasText: `/${slug}` })
    .first()

  if (!(await row.isVisible().catch(() => false))) return null

  const href = await row.getByRole('link', { name: 'Kelola' }).getAttribute('href')
  const match = href?.match(/\/admin\/portal\/pages\/([^/?#]+)$/)
  return match?.[1] ?? null
}

/**
 * Remove a non-system portal page created by a production browser test.
 *
 * `slug` is a safety fallback for failures that happen after the create action
 * reaches production but before Playwright captures the redirected page id.
 * Without this fallback, a failed production test can leave an E2E page behind.
 *
 * Cleanup still uses only the Admin UI and the production test session: no
 * service-role key and no direct database mutation are required by the suite.
 */
export async function deleteProductionPortalFixture(
  page: Page,
  fixture: { pageId?: string | null; slug?: string | null },
) {
  let portalPageId = fixture.pageId ?? null

  if (!portalPageId && fixture.slug) {
    portalPageId = await resolvePortalFixtureIdBySlug(page, fixture.slug)
  }

  if (!portalPageId) return

  await page.goto(`/admin/portal/pages/${portalPageId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })

  const body = page.locator('body')
  if (await body.getByText(/404|not found|tidak ditemukan/i).count()) return

  for (let step = 0; step < 7; step += 1) {
    const deleteButton = page.getByRole('button', { name: /hapus permanen/i })

    if (await deleteButton.isVisible().catch(() => false)) {
      page.once('dialog', async (dialog) => dialog.accept())
      await deleteButton.click()
      await page.waitForURL(/\/admin\/portal\/pages\/?$/, { timeout: 60_000 })
      return
    }

    const archiveButton = page.getByRole('button', { name: /^Arsipkan$/i })

    if (await archiveButton.isVisible().catch(() => false)) {
      page.once('dialog', async (dialog) => dialog.accept())
      await archiveButton.click()
      await expect(archiveButton).not.toBeVisible({ timeout: 30_000 })
      continue
    }

    let advanced = false

    for (const name of lifecycleButtons) {
      const button = page.getByRole('button', { name })
      if (!(await button.isVisible().catch(() => false))) continue

      await clickAndWaitForStateChange(page, name)
      advanced = true
      break
    }

    if (!advanced) {
      throw new Error(
        `Tidak dapat membersihkan fixture portal ${portalPageId}: aksi lifecycle tidak ditemukan.`,
      )
    }
  }

  throw new Error(
    `Tidak dapat membersihkan fixture portal ${portalPageId}: batas transisi terlampaui.`,
  )
}
