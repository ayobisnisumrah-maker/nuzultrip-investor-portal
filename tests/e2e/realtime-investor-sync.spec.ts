import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

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

async function openLivePage(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await waitForRealtime(page)
}

test('published document and financial report appear to investor automatically', async ({ browser }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const year = 2080 + (Number.parseInt(token.slice(0, 1), 16) % 10)
  const documentTitle = `Dokumen Investor Realtime ${token}`
  const reportTitle = `Laporan Investor Realtime ${token}`

  let documentId: string | null = null
  let periodId: string | null = null
  let reportId: string | null = null

  const context = await browser.newContext()
  const loginPage = await context.newPage()

  try {
    await signIn(loginPage, investor, '/investor')

    const documentsPage = await context.newPage()
    const financialsPage = await context.newPage()

    await Promise.all([
      openLivePage(documentsPage, '/investor/documents'),
      openLivePage(financialsPage, '/investor/financials'),
    ])

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        kind: 'supporting',
        title: documentTitle,
        slug: `investor-realtime-${token}`,
        summary: 'Dokumen ini harus muncul tanpa reload manual.',
        visibility: 'investors',
        status: 'published',
      })
      .select('id')
      .single()
    if (documentError || !document) {
      throw new Error(`published document setup failed: ${documentError?.message}`)
    }
    documentId = document.id as string

    await expect(documentsPage.locator('main')).toContainText(documentTitle, { timeout: 30_000 })

    const { data: period, error: periodError } = await supabase
      .from('financial_periods')
      .insert({
        period_type: 'yearly',
        fiscal_year: year,
        period_index: 1,
        starts_on: `${year}-01-01`,
        ends_on: `${year}-12-31`,
        currency: 'IDR',
        status: 'closed',
      })
      .select('id')
      .single()
    if (periodError || !period) throw new Error(`period setup failed: ${periodError?.message}`)
    periodId = period.id as string

    const { data: report, error: reportError } = await supabase
      .from('financial_reports')
      .insert({
        financial_period_id: periodId,
        title: reportTitle,
        summary: 'Laporan ini harus muncul tanpa reload manual.',
        visibility: 'investors',
        status: 'published',
      })
      .select('id')
      .single()
    if (reportError || !report) throw new Error(`published report setup failed: ${reportError?.message}`)
    reportId = report.id as string

    await expect(financialsPage.locator('main')).toContainText(reportTitle, { timeout: 30_000 })
    await expect(financialsPage.locator('main')).toContainText(`Tahunan ${year}`)
  } finally {
    if (reportId) await supabase.from('financial_reports').delete().eq('id', reportId)
    if (periodId) await supabase.from('financial_periods').delete().eq('id', periodId)
    if (documentId) await supabase.from('documents').delete().eq('id', documentId)
    await context.close()
  }
})

test('admin and investor chat stay synchronized automatically in separate browsers', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const subject = `Percakapan Realtime ${token}`
  const adminMessage = `Pesan admin realtime ${token}`
  const investorReply = `Balasan investor realtime ${token}`

  let threadId: string | null = null

  const adminContext = await browser.newContext()
  const investorContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  const investorPage = await investorContext.newPage()

  try {
    await signIn(adminPage, admin, '/admin/messages')
    await signIn(investorPage, investor, '/investor/messages')
    await Promise.all([adminPage.waitForLoadState('networkidle'), investorPage.waitForLoadState('networkidle')])
    await Promise.all([waitForRealtime(adminPage), waitForRealtime(investorPage)])

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        subject,
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
      body_text: adminMessage,
    })
    if (adminMessageError) throw new Error(`admin message setup failed: ${adminMessageError.message}`)

    await expect(adminPage.locator('main')).toContainText(subject, { timeout: 30_000 })
    await expect(adminPage.locator('main')).toContainText(adminMessage, { timeout: 30_000 })
    await expect(investorPage.locator('main')).toContainText(subject, { timeout: 30_000 })
    await expect(investorPage.locator('main')).toContainText(adminMessage, { timeout: 30_000 })

    const { error: investorReplyError } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: investor.userId,
      sender_label: 'Investor E2E',
      body_text: investorReply,
    })
    if (investorReplyError) throw new Error(`investor reply setup failed: ${investorReplyError.message}`)

    await expect(adminPage.locator('main')).toContainText(investorReply, { timeout: 30_000 })
    await expect(investorPage.locator('main')).toContainText(investorReply, { timeout: 30_000 })
  } finally {
    await adminContext.close()
    await investorContext.close()
  }
})
