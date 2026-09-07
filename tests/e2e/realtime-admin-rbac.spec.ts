import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  deleteAccounts,
  serviceClient,
  signIn,
  waitForRealtime,
} from './helpers/accounts'

const createdAccounts: string[] = []

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  await deleteAccounts(createdAccounts)
  createdAccounts.length = 0
})

test('administrator status changes update an open admin detail page automatically', async ({ browser }) => {
  const viewer = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Viewer Admin E2E' })
  const target = await createAdminAccount({ roleKey: 'admin_internal', fullName: 'Target Admin E2E' })
  createdAccounts.push(viewer.userId, target.userId)

  const supabase = serviceClient()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await signIn(page, viewer, `/admin/administrators/${target.userId}`)
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    await expect(page.locator('main')).toContainText('Target Admin E2E')
    await expect(page.locator('main')).toContainText('Aktif')

    const { error } = await supabase
      .from('admins')
      .update({
        is_active: false,
        disabled_at: new Date().toISOString(),
        disabled_reason: 'Realtime E2E',
      })
      .eq('id', target.userId)

    if (error) throw new Error(`admin status update failed: ${error.message}`)

    await expect(page.locator('main')).toContainText('Nonaktif', { timeout: 30_000 })
    await expect(page).toHaveURL(new RegExp(`/admin/administrators/${target.userId}$`))
  } finally {
    await context.close()
  }
})

test('role metadata changes update an open role detail editor automatically', async ({ browser }) => {
  const viewer = await createAdminAccount({ roleKey: 'super_admin', fullName: 'RBAC Viewer E2E' })
  createdAccounts.push(viewer.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const originalName = `Peran Realtime ${token}`
  const updatedName = `Peran Realtime Baru ${token}`
  let roleId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        key: `realtime_${token}`,
        name: originalName,
        description: 'Peran sementara untuk acceptance test realtime.',
        is_system: false,
      })
      .select('id')
      .single()

    if (roleError || !role) throw new Error(`role setup failed: ${roleError?.message}`)
    roleId = role.id as string

    await signIn(page, viewer, `/admin/roles/${roleId}`)
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    await expect(page.locator('main')).toContainText(originalName)
    await expect(page.locator('input').first()).toHaveValue(originalName)

    const { error: updateError } = await supabase
      .from('roles')
      .update({
        name: updatedName,
        description: `Deskripsi realtime ${token}`,
      })
      .eq('id', roleId)

    if (updateError) throw new Error(`role update failed: ${updateError.message}`)

    await expect(page.locator('main')).toContainText(updatedName, { timeout: 30_000 })
    await expect(page.locator('input').first()).toHaveValue(updatedName)
    await expect(page).toHaveURL(new RegExp(`/admin/roles/${roleId}$`))
  } finally {
    if (roleId) await supabase.from('roles').delete().eq('id', roleId)
    await context.close()
  }
})
