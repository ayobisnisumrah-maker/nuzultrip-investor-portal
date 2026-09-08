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

test('notification navigation badge appears automatically without manual refresh', async ({ browser }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  let notificationId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await signIn(page, investor, '/investor/profile')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    const notificationsLink = page.getByRole('link', { name: /Notifikasi/ })
    await expect(notificationsLink).toBeVisible()
    await expect(notificationsLink.locator('[aria-label$="belum dibaca"]')).toHaveCount(0)

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: investor.userId,
        kind: 'company_update',
        title: `Badge realtime ${token}`,
        body: 'Badge navigasi harus muncul otomatis tanpa reload manual.',
      })
      .select('id')
      .single()

    if (error || !notification) {
      throw new Error(`notification setup failed: ${error?.message}`)
    }
    notificationId = notification.id as string

    await expect(notificationsLink.locator('[aria-label="1 belum dibaca"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page).toHaveURL(/\/investor\/profile$/)
  } finally {
    if (notificationId) await supabase.from('notifications').delete().eq('id', notificationId)
    await context.close()
  }
})

test('ownership transfer lifecycle changes appear automatically on investor page', async ({ browser }) => {
  const investor = await createInvestorAccount('active')
  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Transfer Realtime Admin E2E' })
  createdAccounts.push(investor.userId, admin.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const offeringName = `Transfer Realtime ${token}`
  let offeringId: string | null = null
  let holdingId: string | null = null
  let transferId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const { data: offering, error: offeringError } = await supabase
      .from('ownership_offerings')
      .insert({
        name: offeringName,
        code: `transfer-${token}`,
        status: 'draft',
        total_offered_bps: 100,
        unit_ownership_bps: 100,
        unit_price: 100_000_000,
        total_units: 1,
        distribution_cadence_months: 6,
        transfer_lock_months: 36,
      })
      .select('id')
      .single()

    if (offeringError || !offering) {
      throw new Error(`offering setup failed: ${offeringError?.message}`)
    }
    offeringId = offering.id as string

    const acquisitionAt = new Date(Date.now() - 120_000).toISOString()
    const transferEligibleAt = new Date(Date.now() - 60_000).toISOString()
    const { data: holding, error: holdingError } = await supabase
      .from('ownership_holdings')
      .insert({
        offering_id: offeringId,
        investor_id: investor.userId,
        units: 1,
        ownership_bps: 100,
        acquisition_at: acquisitionAt,
        transfer_eligible_at: transferEligibleAt,
        status: 'active',
        acquisition_reference: `TRANSFER-${token}`,
      })
      .select('id')
      .single()

    if (holdingError || !holding) {
      throw new Error(`holding setup failed: ${holdingError?.message}`)
    }
    holdingId = holding.id as string

    await signIn(page, investor, '/investor/ownership')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)
    await expect(page.locator('main#main')).toContainText(offeringName)
    await expect(page.locator('main#main')).toContainText('Belum ada pengajuan penjualan saham.')

    const { data: transfer, error: transferError } = await supabase
      .from('ownership_transfers')
      .insert({
        holding_id: holdingId,
        from_investor_id: investor.userId,
        units: 1,
        eligible_at: transferEligibleAt,
        status: 'pending',
        transfer_kind: 'sale',
        requested_unit_price: 100_000_000,
        notes: `Transfer lifecycle ${token}`,
      })
      .select('id')
      .single()

    if (transferError || !transfer) {
      throw new Error(`transfer setup failed: ${transferError?.message}`)
    }
    transferId = transfer.id as string

    await expect(page.locator('main#main')).toContainText('Menunggu Persetujuan', { timeout: 30_000 })
    await expect(page.locator('main#main')).toContainText(`Transfer lifecycle ${token}`)

    const { error: approveError } = await supabase
      .from('ownership_transfers')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: admin.userId,
      })
      .eq('id', transferId)
    if (approveError) throw new Error(`transfer approval failed: ${approveError.message}`)

    await expect(page.locator('main#main')).toContainText('Disetujui', { timeout: 30_000 })
    await expect(page.locator('main#main')).not.toContainText('Menunggu Persetujuan')

    const { error: processingError } = await supabase
      .from('ownership_transfers')
      .update({
        status: 'processing',
        processing_at: new Date().toISOString(),
        processing_by: admin.userId,
        agreed_unit_price: 100_000_000,
      })
      .eq('id', transferId)
    if (processingError) {
      throw new Error(`transfer processing failed: ${processingError.message}`)
    }

    await expect(page.locator('main#main')).toContainText('Dalam Proses', { timeout: 30_000 })
    await expect(page).toHaveURL(/\/investor\/ownership$/)
  } finally {
    if (transferId) await supabase.from('ownership_transfers').delete().eq('id', transferId)
    if (holdingId) await supabase.from('ownership_holdings').delete().eq('id', holdingId)
    if (offeringId) await supabase.from('ownership_offerings').delete().eq('id', offeringId)
    await context.close()
  }
})
