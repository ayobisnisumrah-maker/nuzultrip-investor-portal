import { expect, type Page } from '@playwright/test'

const lifecycleButtons = [/^Kirim untuk Ditinjau$/i, /^Setujui$/i, /^Terbitkan$/i] as const

async function clickAndWaitForStateChange(page: Page, name: RegExp) {
  const button = page.getByRole('button', { name })

  await expect(button).toBeVisible({ timeout: 30_000 })
  await button.click()
  await expect(button).not.toBeVisible({ timeout: 30_000 })
}

/**
 * Remove a non-system portal page created by a production browser test.
 *
 * Portal pages can only be deleted after they are archived, so cleanup advances
 * an unfinished fixture through the same public lifecycle before deleting it.
 * This deliberately uses the UI and the production test admin session: the
 * production suite must never depend on the service-role key.
 */
export async function deleteProductionPortalFixture(page: Page, portalPageId: string | null) {
  if (!portalPageId) return

  await page.goto(`/admin/portal/pages/${portalPageId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })

  const body = page.locator('body')
  if (await body.getByText(/404|not found|tidak ditemukan/i).count()) return

  for (let step = 0; step < 6; step += 1) {
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
