import { expect, type Page } from '@playwright/test'

export function requireProductionAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD wajib tersedia.',
    )
  }

  return {
    email,
    password,
  }
}

export async function loginProductionAdmin(page: Page) {
  const { email, password } = requireProductionAdminCredentials()

  await page.goto('/masuk', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })

  const emailInput = page.locator('input[name="email"]')
  const passwordInput = page.locator('input[name="password"]')
  const submitButton = page.locator('button[type="submit"]')

  await expect(emailInput).toBeVisible({
    timeout: 30_000,
  })

  await expect(passwordInput).toBeVisible({
    timeout: 30_000,
  })

  await emailInput.fill(email)
  await passwordInput.fill(password)

  await expect(submitButton).toBeVisible({
    timeout: 30_000,
  })

  await expect(submitButton).toBeEnabled({
    timeout: 30_000,
  })

  await Promise.all([
    page.waitForURL(/\/admin(?:\/|$)/, {
      timeout: 60_000,
      waitUntil: 'commit',
    }),
    submitButton.click(),
  ])

  await expect(page).toHaveURL(/\/admin(?:\/|$)/, {
    timeout: 30_000,
  })
}
