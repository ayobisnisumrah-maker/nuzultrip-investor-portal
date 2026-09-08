import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
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

async function authenticatedClient(account: { email: string; password: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Local Supabase public credentials are required for E2E.')

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword(account)
  if (error) throw new Error(`authenticated client sign-in failed: ${error.message}`)
  return client
}

test('published document and financial report appear to investor automatically', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const adminClient = await authenticatedClient(admin)
  const token = randomUUID().slice(0, 8)
  const year = 2080 + (Number.parseInt(token.slice(0, 1), 16) % 10)
  const documentTitle = `Dokumen Investor Realtime ${token}`
  const reportTitle = `Laporan Investor Realtime ${token}`

  let documentId: string | null = null
  let documentVersionId: string | null = null
  let periodId: string | null = null
  let reportId: string | null = null
  let reportVersionId: string | null = null

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
        status: 'draft',
      })
      .select('id')
      .single()
    if (documentError || !document) {
      throw new Error(`document setup failed: ${documentError?.message}`)
    }
    documentId = document.id as string

    const { data: documentVersion, error: documentVersionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        version_number: 1,
        title: documentTitle,
        content: { type: 'doc', content: [] },
        status: 'draft',
      })
      .select('id')
      .single()
    if (documentVersionError || !documentVersion) {
      throw new Error(`document version setup failed: ${documentVersionError?.message}`)
    }
    documentVersionId = documentVersion.id as string

    const { error: currentDocumentVersionError } = await adminClient
      .from('documents')
      .update({ current_version_id: documentVersionId })
      .eq('id', documentId)
    if (currentDocumentVersionError) {
      throw new Error(`document current version setup failed: ${currentDocumentVersionError.message}`)
    }

    for (const target of ['review', 'approved', 'published'] as const) {
      const { error } = await adminClient.schema('app').rpc('transition_document_publication', {
        p_document_id: documentId,
        p_target: target,
      })
      if (error) throw new Error(`document transition to ${target} failed: ${error.message}`)
    }

    await expect(documentsPage.locator('main#main')).toContainText(documentTitle, { timeout: 30_000 })

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
        status: 'draft',
      })
      .select('id')
      .single()
    if (reportError || !report) throw new Error(`report setup failed: ${reportError?.message}`)
    reportId = report.id as string

    const { data: reportVersion, error: reportVersionError } = await supabase
      .from('financial_report_versions')
      .insert({
        financial_report_id: reportId,
        source: 'internal',
        status: 'draft',
        prepared_by: 'E2E',
      })
      .select('id')
      .single()
    if (reportVersionError || !reportVersion) {
      throw new Error(`financial report version setup failed: ${reportVersionError?.message}`)
    }
    reportVersionId = reportVersion.id as string

    const { error: currentReportVersionError } = await adminClient
      .from('financial_reports')
      .update({ current_version_id: reportVersionId })
      .eq('id', reportId)
    if (currentReportVersionError) {
      throw new Error(`financial report current version setup failed: ${currentReportVersionError.message}`)
    }

    for (const target of ['review', 'approved', 'published'] as const) {
      const { error } = await adminClient.schema('app').rpc('transition_financial_report', {
        p_report_id: reportId,
        p_target: target,
      })
      if (error) throw new Error(`financial report transition to ${target} failed: ${error.message}`)
    }

    await expect(financialsPage.locator('main#main')).toContainText(reportTitle, { timeout: 30_000 })
    await expect(financialsPage.locator('main#main')).toContainText(`Tahunan ${year}`)
  } finally {
    if (reportId) await supabase.from('financial_reports').delete().eq('id', reportId)
    if (reportVersionId) await supabase.from('financial_report_versions').delete().eq('id', reportVersionId)
    if (periodId) await supabase.from('financial_periods').delete().eq('id', periodId)
    if (documentId) await supabase.from('documents').delete().eq('id', documentId)
    if (documentVersionId) await supabase.from('document_versions').delete().eq('id', documentVersionId)
    await adminClient.auth.signOut()
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

    await expect(adminPage.locator('main#main')).toContainText(subject, { timeout: 30_000 })
    await expect(adminPage.locator('main#main')).toContainText(adminMessage, { timeout: 30_000 })
    await expect(investorPage.locator('main#main')).toContainText(subject, { timeout: 30_000 })
    await expect(investorPage.locator('main#main')).toContainText(adminMessage, { timeout: 30_000 })

    const { error: investorReplyError } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: investor.userId,
      sender_label: 'Investor E2E',
      body_text: investorReply,
    })
    if (investorReplyError) throw new Error(`investor reply setup failed: ${investorReplyError.message}`)

    await expect(adminPage.locator('main#main')).toContainText(investorReply, { timeout: 30_000 })
    await expect(investorPage.locator('main#main')).toContainText(investorReply, { timeout: 30_000 })
  } finally {
    await adminContext.close()
    await investorContext.close()
  }
})
