import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

import {
  createAdminAccount,
  deleteAccounts,
  serviceClient,
  waitForRealtime,
} from './helpers/accounts'
import { createPublishedHomePortal } from './helpers/portal'

const createdAccounts: string[] = []

test.afterAll(async () => {
  await deleteAccounts(createdAccounts)
  createdAccounts.length = 0
})

test('public portal logo updates automatically without manual reload', async ({ page }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Portal Realtime Admin E2E' })
  createdAccounts.push(admin.userId)
  const portal = await createPublishedHomePortal(admin)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const publicUrl = `/brand/nuzultrip-logo-portal.svg?realtime=${token}`

  const { data: previous, error: previousError } = await supabase
    .from('site_settings')
    .select('key, value, description, updated_by, is_public')
    .eq('key', 'brand.logo')
    .maybeSingle()

  if (previousError) {
    await portal.cleanup()
    throw new Error(`brand logo lookup failed: ${previousError.message}`)
  }

  try {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    const headerLogo = page.locator('header img[alt="Nuzultrip"]').first()
    await expect(headerLogo).toBeVisible()
    await expect(headerLogo).not.toHaveAttribute('src', new RegExp(token))

    const { error: updateError } = await supabase.from('site_settings').upsert({
      key: 'brand.logo',
      value: { public_url: publicUrl },
      description: 'Logo perusahaan untuk portal publik.',
      is_public: true,
    })

    if (updateError) throw new Error(`brand logo update failed: ${updateError.message}`)

    await expect(headerLogo).toHaveAttribute('src', new RegExp(token), { timeout: 30_000 })
    await expect(page).toHaveURL(/\/$/)
  } finally {
    if (previous) {
      await supabase.from('site_settings').upsert({
        key: previous.key,
        value: previous.value,
        description: previous.description,
        updated_by: previous.updated_by,
        is_public: previous.is_public,
      })
    } else {
      await supabase.from('site_settings').delete().eq('key', 'brand.logo')
    }
    await portal.cleanup()
  }
})
