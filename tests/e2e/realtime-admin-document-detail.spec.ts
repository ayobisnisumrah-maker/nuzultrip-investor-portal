import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
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

test('restricted document access grant and revoke sync to an open admin detail page', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const title = `Dokumen Akses Admin ${token}`
  const note = `Grant realtime admin ${token}`
  let documentId: string | null = null
  let grantId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        kind: 'supporting',
        title,
        slug: `admin-access-${token}`,
        summary: 'Pengujian sinkronisasi akses dokumen antar admin.',
        visibility: 'restricted',
        status: 'draft',
      })
      .select('id')
      .single()

    if (documentError || !document) {
      throw new Error(`document setup failed: ${documentError?.message}`)
    }
    documentId = document.id as string

    await signIn(page, admin, `/admin/documents/${documentId}`)
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    await expect(page.locator('main')).toContainText(title)
    await expect(page.locator('main')).toContainText('Belum ada investor dengan akses khusus.')

    const { data: grant, error: grantError } = await supabase
      .from('document_access_grants')
      .insert({
        document_id: documentId,
        investor_id: investor.userId,
        granted_by: admin.userId,
        note,
      })
      .select('id')
      .single()

    if (grantError || !grant) throw new Error(`grant setup failed: ${grantError?.message}`)
    grantId = grant.id as string

    await expect(page.locator('main')).toContainText(note, { timeout: 30_000 })
    await expect(page.locator('main')).toContainText(investor.referenceCode)
    await expect(page).toHaveURL(new RegExp(`/admin/documents/${documentId}$`))

    const { error: revokeError } = await supabase
      .from('document_access_grants')
      .update({ revoked_at: new Date().toISOString(), revoked_by: admin.userId })
      .eq('id', grantId)

    if (revokeError) throw new Error(`grant revoke failed: ${revokeError.message}`)

    await expect(page.locator('main')).not.toContainText(note, { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('Belum ada investor dengan akses khusus.')
    await expect(page).toHaveURL(new RegExp(`/admin/documents/${documentId}$`))
  } finally {
    if (grantId) await supabase.from('document_access_grants').delete().eq('id', grantId)
    if (documentId) await supabase.from('documents').delete().eq('id', documentId)
    await context.close()
  }
})
