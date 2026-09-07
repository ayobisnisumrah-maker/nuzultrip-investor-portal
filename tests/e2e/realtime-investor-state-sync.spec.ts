import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

import {
  clearRateLimits,
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

test('restricted document grant and revoke update the open investor page automatically', async ({ browser }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const title = `Dokumen Akses Realtime ${token}`
  let documentId: string | null = null
  let versionId: string | null = null
  let grantId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        kind: 'supporting',
        title,
        slug: `restricted-realtime-${token}`,
        summary: 'Dokumen restricted untuk verifikasi grant dan revoke realtime.',
        visibility: 'restricted',
        status: 'draft',
      })
      .select('id')
      .single()
    if (documentError || !document) throw new Error(`document setup failed: ${documentError?.message}`)
    documentId = document.id as string

    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        version_number: 1,
        title,
        content: { type: 'doc', content: [] },
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (versionError || !version) throw new Error(`document version setup failed: ${versionError?.message}`)
    versionId = version.id as string

    const { error: publishError } = await supabase
      .from('documents')
      .update({
        status: 'published',
        current_version_id: versionId,
        published_version_id: versionId,
      })
      .eq('id', documentId)
    if (publishError) throw new Error(`document publish setup failed: ${publishError.message}`)

    await signIn(page, investor, '/investor/documents')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)
    await expect(page.locator('main')).not.toContainText(title)

    const { data: grant, error: grantError } = await supabase
      .from('document_access_grants')
      .insert({ document_id: documentId, investor_id: investor.userId })
      .select('id')
      .single()
    if (grantError || !grant) throw new Error(`grant setup failed: ${grantError?.message}`)
    grantId = grant.id as string

    await expect(page.locator('main')).toContainText(title, { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('Akses khusus')

    const { error: revokeError } = await supabase
      .from('document_access_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', grantId)
    if (revokeError) throw new Error(`grant revoke failed: ${revokeError.message}`)

    await expect(page.locator('main')).not.toContainText(title, { timeout: 30_000 })
  } finally {
    if (grantId) await supabase.from('document_access_grants').delete().eq('id', grantId)
    if (documentId) await supabase.from('documents').delete().eq('id', documentId)
    if (versionId) await supabase.from('document_versions').delete().eq('id', versionId)
    await context.close()
  }
})

test('payable allocation changing to paid updates the open investor page automatically', async ({ browser }) => {
  const investor = await createInvestorAccount('active')
  createdAccounts.push(investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const paymentReference = `PAY-${token}`
  let offeringId: string | null = null
  let holdingId: string | null = null
  let distributionId: string | null = null
  let allocationId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const { data: offering, error: offeringError } = await supabase
      .from('ownership_offerings')
      .insert({
        name: `Offering Payment ${token}`,
        code: `pay-${token}`,
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
    if (offeringError || !offering) throw new Error(`offering setup failed: ${offeringError?.message}`)
    offeringId = offering.id as string

    const { data: holding, error: holdingError } = await supabase
      .from('ownership_holdings')
      .insert({
        offering_id: offeringId,
        investor_id: investor.userId,
        units: 1,
        ownership_bps: 100,
        transfer_eligible_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      })
      .select('id')
      .single()
    if (holdingError || !holding) throw new Error(`holding setup failed: ${holdingError?.message}`)
    holdingId = holding.id as string

    const { data: distribution, error: distributionError } = await supabase
      .from('profit_distributions')
      .insert({
        offering_id: offeringId,
        period_start: '2026-01-01',
        period_end: '2026-06-30',
        revenue_amount: 100_000_000,
        opex_amount: 75_000_000,
        profit_amount: 25_000_000,
        company_share_bps: 6000,
        investor_pool_bps: 4000,
        investor_pool_amount: 10_000_000,
        status: 'payable',
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (distributionError || !distribution) throw new Error(`distribution setup failed: ${distributionError?.message}`)
    distributionId = distribution.id as string

    const { data: allocation, error: allocationError } = await supabase
      .from('profit_distribution_allocations')
      .insert({
        distribution_id: distributionId,
        holding_id: holdingId,
        investor_id: investor.userId,
        ownership_bps: 100,
        investor_pool_share_bps: 10_000,
        allocation_amount: 10_000_000,
        status: 'payable',
      })
      .select('id')
      .single()
    if (allocationError || !allocation) throw new Error(`allocation setup failed: ${allocationError?.message}`)
    allocationId = allocation.id as string

    await signIn(page, investor, '/investor/distributions')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)
    await expect(page.locator('main')).toContainText('Siap Dibayar')

    const { error: paidError } = await supabase
      .from('profit_distribution_allocations')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: paymentReference,
      })
      .eq('id', allocationId)
    if (paidError) throw new Error(`allocation paid update failed: ${paidError.message}`)

    await expect(page.locator('main')).toContainText(paymentReference, { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('Sudah Dibayar')
  } finally {
    if (allocationId) await supabase.from('profit_distribution_allocations').delete().eq('id', allocationId)
    if (distributionId) await supabase.from('profit_distributions').delete().eq('id', distributionId)
    if (holdingId) await supabase.from('ownership_holdings').delete().eq('id', holdingId)
    if (offeringId) await supabase.from('ownership_offerings').delete().eq('id', offeringId)
    await context.close()
  }
})
