import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
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

async function authenticatedClient(account: { email: string; password: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Local Supabase public credentials are required for E2E.')

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword(account)
  if (error) throw new Error(`authenticated client sign-in failed: ${error.message}`)
  return client
}

async function advanceDocumentToPublished(
  client: Awaited<ReturnType<typeof authenticatedClient>>,
  documentId: string,
  versionId: string,
) {
  const { error: currentVersionError } = await client
    .from('documents')
    .update({ current_version_id: versionId })
    .eq('id', documentId)
  if (currentVersionError) throw new Error(`current document version setup failed: ${currentVersionError.message}`)

  for (const status of ['review', 'approved'] as const) {
    const { error: versionError } = await client
      .from('document_versions')
      .update({ status })
      .eq('id', versionId)
    if (versionError) throw new Error(`document version transition to ${status} failed: ${versionError.message}`)

    const { error: documentError } = await client.from('documents').update({ status }).eq('id', documentId)
    if (documentError) throw new Error(`document transition to ${status} failed: ${documentError.message}`)
  }

  const { error: publishVersionError } = await client
    .from('document_versions')
    .update({ status: 'published' })
    .eq('id', versionId)
  if (publishVersionError) throw new Error(`document version publish failed: ${publishVersionError.message}`)

  const { error: publishDocumentError } = await client
    .from('documents')
    .update({ status: 'published', published_version_id: versionId })
    .eq('id', documentId)
  if (publishDocumentError) throw new Error(`document publish failed: ${publishDocumentError.message}`)
}

test('restricted document grant and revoke update the open investor page automatically', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const adminClient = await authenticatedClient(admin)
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
        status: 'draft',
      })
      .select('id')
      .single()
    if (versionError || !version) throw new Error(`document version setup failed: ${versionError?.message}`)
    versionId = version.id as string

    await advanceDocumentToPublished(adminClient, documentId, versionId)

    await signIn(page, investor, '/investor/documents')
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)
    await expect(page.locator('main#main')).not.toContainText(title)

    const { data: grant, error: grantError } = await supabase
      .from('document_access_grants')
      .insert({
        document_id: documentId,
        investor_id: investor.userId,
        granted_by: admin.userId,
      })
      .select('id')
      .single()
    if (grantError || !grant) throw new Error(`grant setup failed: ${grantError?.message}`)
    grantId = grant.id as string

    await expect(page.locator('main#main')).toContainText(title, { timeout: 30_000 })
    await expect(page.locator('main#main')).toContainText('Akses khusus')

    const { error: revokeError } = await supabase
      .from('document_access_grants')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: admin.userId,
      })
      .eq('id', grantId)
    if (revokeError) throw new Error(`grant revoke failed: ${revokeError.message}`)

    await expect(page.locator('main#main')).not.toContainText(title, { timeout: 30_000 })
  } finally {
    if (grantId) await supabase.from('document_access_grants').delete().eq('id', grantId)
    if (documentId) await supabase.from('documents').delete().eq('id', documentId)
    if (versionId) await supabase.from('document_versions').delete().eq('id', versionId)
    await adminClient.auth.signOut()
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
    await expect(page.locator('main#main')).toContainText('Siap Dibayar')

    const { error: paidError } = await supabase
      .from('profit_distribution_allocations')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: paymentReference,
      })
      .eq('id', allocationId)
    if (paidError) throw new Error(`allocation paid update failed: ${paidError.message}`)

    await expect(page.locator('main#main')).toContainText(paymentReference, { timeout: 30_000 })
    await expect(page.locator('main#main')).toContainText('Sudah Dibayar')
  } finally {
    if (allocationId) await supabase.from('profit_distribution_allocations').delete().eq('id', allocationId)
    if (distributionId) await supabase.from('profit_distributions').delete().eq('id', distributionId)
    if (holdingId) await supabase.from('ownership_holdings').delete().eq('id', holdingId)
    if (offeringId) await supabase.from('ownership_offerings').delete().eq('id', offeringId)
    await context.close()
  }
})
