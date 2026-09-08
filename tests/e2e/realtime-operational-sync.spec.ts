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

test('admin operational pages update automatically without manual refresh', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  createdAccounts.push(admin.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const year = 2090 + (Number.parseInt(token.slice(0, 1), 16) % 9)
  const periodLabel = `Bulanan 12 / ${year}`
  const reportTitle = `Laporan Realtime ${token}`
  const documentTitle = `Dokumen Realtime ${token}`
  const inquiryEmail = `realtime-${token}@example.test`

  let periodId: string | null = null
  let reportId: string | null = null
  let documentId: string | null = null
  let inquiryId: string | null = null

  const context = await browser.newContext()
  const loginPage = await context.newPage()

  try {
    await signIn(loginPage, admin, '/admin')

    const periodsPage = await context.newPage()
    const reportsPage = await context.newPage()
    const documentsPage = await context.newPage()
    const inquiriesPage = await context.newPage()

    // Establish each authenticated private-channel subscriber serially. All
    // four pages remain open afterwards, so the assertions still prove that
    // independent operational surfaces receive updates without manual reload.
    // Starting four RSC navigations and four private Realtime handshakes at the
    // same instant only stress-tests the local E2E stack rather than a real
    // user interaction pattern.
    await openLivePage(periodsPage, '/admin/financials/periods')
    await openLivePage(reportsPage, '/admin/financials/reports')
    await openLivePage(documentsPage, '/admin/documents')
    await openLivePage(inquiriesPage, '/admin/inquiries')

    const { data: period, error: periodError } = await supabase
      .from('financial_periods')
      .insert({
        period_type: 'monthly',
        fiscal_year: year,
        period_index: 12,
        starts_on: `${year}-12-01`,
        ends_on: `${year}-12-31`,
        currency: 'IDR',
        status: 'open',
      })
      .select('id')
      .single()
    if (periodError || !period) throw new Error(`period setup failed: ${periodError?.message}`)
    periodId = period.id as string

    await expect(periodsPage.locator('main')).toContainText(periodLabel, { timeout: 30_000 })

    const { data: report, error: reportError } = await supabase
      .from('financial_reports')
      .insert({
        financial_period_id: periodId,
        title: reportTitle,
        summary: 'Laporan dibuat untuk verifikasi sinkronisasi otomatis.',
        visibility: 'investors',
        status: 'draft',
      })
      .select('id')
      .single()
    if (reportError || !report) throw new Error(`report setup failed: ${reportError?.message}`)
    reportId = report.id as string

    await expect(reportsPage.locator('main')).toContainText(reportTitle, { timeout: 30_000 })

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        kind: 'supporting',
        title: documentTitle,
        slug: `realtime-${token}`,
        summary: 'Dokumen uji sinkronisasi realtime.',
        visibility: 'internal',
        status: 'draft',
      })
      .select('id')
      .single()
    if (documentError || !document) {
      throw new Error(`document setup failed: ${documentError?.message}`)
    }
    documentId = document.id as string

    await expect(documentsPage.locator('main')).toContainText(documentTitle, { timeout: 30_000 })

    const { data: inquiry, error: inquiryError } = await supabase
      .from('portal_inquiries')
      .insert({
        name: `Pemohon ${token}`,
        email: inquiryEmail,
        message: 'Permintaan realtime untuk verifikasi sinkronisasi otomatis.',
        status: 'new',
      })
      .select('id')
      .single()
    if (inquiryError || !inquiry) throw new Error(`inquiry setup failed: ${inquiryError?.message}`)
    inquiryId = inquiry.id as string

    const inquiryButton = inquiriesPage.getByRole('button').filter({ hasText: inquiryEmail })
    await expect(inquiryButton).toBeVisible({ timeout: 30_000 })
    await inquiryButton.click()
    const status = inquiriesPage.getByLabel(new RegExp(`Status permintaan Pemohon ${token}`))
    await expect(status).toHaveValue('new')

    const { error: updateError } = await supabase
      .from('portal_inquiries')
      .update({ status: 'in_progress' })
      .eq('id', inquiryId)
    if (updateError) throw new Error(`inquiry update failed: ${updateError.message}`)

    await expect(status).toHaveValue('in_progress', { timeout: 30_000 })
  } finally {
    if (inquiryId) await supabase.from('portal_inquiries').delete().eq('id', inquiryId)
    if (documentId) await supabase.from('documents').delete().eq('id', documentId)
    if (reportId) await supabase.from('financial_reports').delete().eq('id', reportId)
    if (periodId) await supabase.from('financial_periods').delete().eq('id', periodId)
    await context.close()
  }
})

test('investor notification list updates automatically without manual refresh', async ({ browser }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const title = `Pembaruan Realtime ${token}`
  let notificationId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await signIn(page, investor, '/investor/notifications')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: investor.userId,
        kind: 'company_update',
        title,
        body: 'Notifikasi ini harus muncul tanpa reload manual.',
      })
      .select('id')
      .single()
    if (error || !notification) throw new Error(`notification setup failed: ${error?.message}`)
    notificationId = notification.id as string

    await expect(page.locator('main')).toContainText(title, { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('Pembaruan perusahaan')
  } finally {
    if (notificationId) await supabase.from('notifications').delete().eq('id', notificationId)
    await context.close()
  }
})
