import { randomUUID } from 'node:crypto'
import { expect, test, type Locator } from '@playwright/test'

import {
  advanceInvestor,
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

async function unreadBadgeCount(link: Locator, suffix: string): Promise<number> {
  const badge = link.locator(`[aria-label$="${suffix}"]`)
  if ((await badge.count()) === 0) return 0

  const label = await badge.first().getAttribute('aria-label')
  const match = label?.match(/^(\d+)/)
  return match ? Number.parseInt(match[1] ?? '0', 10) : 0
}

test('message badges on investor and admin navigation update automatically', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  let threadId: string | null = null

  const adminContext = await browser.newContext()
  const investorContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  const investorPage = await investorContext.newPage()

  try {
    await signIn(adminPage, admin, '/admin')
    await signIn(investorPage, investor, '/investor/profile')
    await Promise.all([
      adminPage.waitForLoadState('networkidle'),
      investorPage.waitForLoadState('networkidle'),
    ])
    await Promise.all([waitForRealtime(adminPage), waitForRealtime(investorPage)])

    const adminMessagesLink = adminPage.getByRole('link', { name: /Pesan/ })
    const investorMessagesLink = investorPage.getByRole('link', { name: /Pesan/ })
    const adminBaseline = await unreadBadgeCount(adminMessagesLink, 'pesan belum dibaca')
    const investorBaseline = await unreadBadgeCount(investorMessagesLink, 'belum dibaca')

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        subject: `Badge Pesan ${token}`,
        investor_id: investor.userId,
        created_by: admin.userId,
        initiated_by: 'admin',
      })
      .select('id')
      .single()

    if (threadError || !thread) throw new Error(`message thread setup failed: ${threadError?.message}`)
    threadId = thread.id as string

    const { error: adminMessageError } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: admin.userId,
      sender_label: 'Admin E2E',
      body_text: `Pesan untuk badge investor ${token}`,
    })
    if (adminMessageError) throw new Error(`admin message setup failed: ${adminMessageError.message}`)

    await expect
      .poll(() => unreadBadgeCount(investorMessagesLink, 'belum dibaca'), { timeout: 30_000 })
      .toBe(investorBaseline + 1)
    await expect(investorPage).toHaveURL(/\/investor\/profile$/)

    const { error: investorMessageError } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: investor.userId,
      sender_label: 'Investor E2E',
      body_text: `Pesan untuk badge admin ${token}`,
    })
    if (investorMessageError) {
      throw new Error(`investor message setup failed: ${investorMessageError.message}`)
    }

    await expect
      .poll(() => unreadBadgeCount(adminMessagesLink, 'pesan belum dibaca'), { timeout: 30_000 })
      .toBe(adminBaseline + 1)
    await expect(adminPage).toHaveURL(/\/admin$/)
  } finally {
    if (threadId) await supabase.from('message_threads').delete().eq('id', threadId)
    await adminContext.close()
    await investorContext.close()
  }
})

test('admin investor detail updates status and history automatically without reload', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await signIn(page, admin, `/admin/investors/${investor.userId}`)
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    await expect(page.locator('main')).toContainText('Aktif')

    await advanceInvestor(investor.userId, ['inactive'])

    await expect(page.locator('main')).toContainText('Nonaktif', { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('Riwayat Status')
    await expect(page).toHaveURL(new RegExp(`/admin/investors/${investor.userId}$`))
  } finally {
    await context.close()
  }
})
