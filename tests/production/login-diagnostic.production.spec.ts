import { test, expect } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test.describe('Production Login Diagnostic', () => {
  test.skip(
    !adminEmail || !adminPassword,
    'E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD wajib tersedia.',
  )

  test('real production admin login succeeds', async ({ page }) => {
    test.setTimeout(90_000)

    await page.goto('/masuk', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()

    await page.locator('input[name="email"]').fill(adminEmail!)
    await page.locator('input[name="password"]').fill(adminPassword!)

    const submit = page.locator('button[type="submit"]')
    await expect(submit).toBeEnabled()

    await submit.click()

    await expect(page).toHaveURL(/\/admin(?:\/)?$/, {
      timeout: 60_000,
    })

    await expect(
      page.getByText(/Admin Console/i).first(),
    ).toBeVisible({
      timeout: 20_000,
    })

    console.log('RESULT=PRODUCTION_ADMIN_LOGIN_PASS')
    console.log('FINAL_URL=' + page.url())
  })
})
