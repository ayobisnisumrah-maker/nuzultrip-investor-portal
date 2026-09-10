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

test('distribution and allocation changes update an open admin detail page automatically', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const offeringName = `Distribusi Detail ${token}`
  const paymentReference = `ADMIN-PAY-${token}`

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
        name: offeringName,
        code: `dist-detail-${token}`,
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
        transfer_eligible_at: new Date(Date.now() + 86_400_000).toISOString(),
        status: 'active',
        acquisition_reference: `DIST-${token}`,
      })
      .select('id')
      .single()
    if (holdingError || !holding) throw new Error(`holding setup failed: ${holdingError?.message}`)
    holdingId = holding.id as string

    const { data: period, error: periodError } = await supabase
      .from('financial_periods')
      .insert({
        period_type: 'yearly',
        fiscal_year: 2198,
        period_index: 1,
        starts_on: '2198-01-01',
        ends_on: '2198-12-31',
        currency: 'IDR',
        status: 'closed',
      })
      .select('id')
      .single()
    if (periodError || !period) throw new Error(`financial period setup failed: ${periodError?.message}`)

    const { data: report, error: reportError } = await supabase
      .from('financial_reports')
      .insert({
        financial_period_id: period.id,
        title: `Realtime distribution snapshot ${token}`,
        visibility: 'investors',
        status: 'draft',
      })
      .select('id')
      .single()
    if (reportError || !report) throw new Error(`financial report setup failed: ${reportError?.message}`)

    const { data: version, error: versionError } = await supabase
      .from('financial_report_versions')
      .insert({
        financial_report_id: report.id,
        version_number: 1,
        status: 'draft',
        source: 'audited',
      })
      .select('id')
      .single()
    if (versionError || !version) throw new Error(`financial version setup failed: ${versionError?.message}`)

    const { error: linesError } = await supabase.from('financial_line_items').insert([
      {
        financial_report_version_id: version.id,
        statement: 'income',
        category: 'revenue',
        line_key: 'revenue',
        label: 'Revenue',
        amount: 100_000_000,
        currency: 'IDR',
        position: 0,
      },
      {
        financial_report_version_id: version.id,
        statement: 'income',
        category: 'expense',
        line_key: 'expenses',
        label: 'Expenses',
        amount: 75_000_000,
        currency: 'IDR',
        position: 1,
      },
    ])
    if (linesError) throw new Error(`financial lines setup failed: ${linesError.message}`)

    for (const status of ['review', 'approved', 'published'] as const) {
      const { error } = await supabase
        .from('financial_report_versions')
        .update({ status, ...(status === 'published' ? { published_at: new Date().toISOString() } : {}) })
        .eq('id', version.id)
      if (error) throw new Error(`financial version ${status} transition failed: ${error.message}`)
    }

    for (const status of ['review', 'approved'] as const) {
      const { error } = await supabase
        .from('financial_reports')
        .update({ status, current_version_id: version.id })
        .eq('id', report.id)
      if (error) throw new Error(`financial report ${status} transition failed: ${error.message}`)
    }
    const { error: reportPublishedError } = await supabase
      .from('financial_reports')
      .update({ status: 'published', current_version_id: version.id, published_version_id: version.id })
      .eq('id', report.id)
    if (reportPublishedError) {
      throw new Error(`financial report published transition failed: ${reportPublishedError.message}`)
    }

    const { data: distribution, error: distributionError } = await supabase
      .from('profit_distributions')
      .insert({
        offering_id: offeringId,
        financial_report_version_id: version.id,
        period_start: '2198-01-01',
        period_end: '2198-12-31',
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

    await signIn(page, admin, `/admin/profit-distributions/${distributionId}`)
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    await expect(page.locator('main')).toContainText(offeringName)
    await expect(page.locator('main')).toContainText('Payable / Paid:')
    await expect(page.locator('main')).toContainText('1 / 0')

    const { error: paidError } = await supabase
      .from('profit_distribution_allocations')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: paymentReference,
      })
      .eq('id', allocationId)
    if (paidError) throw new Error(`allocation paid update failed: ${paidError.message}`)

    await expect(page.locator('main')).toContainText('0 / 1', { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('paid')
    await expect(page).toHaveURL(new RegExp(`/admin/profit-distributions/${distributionId}$`))

    const { error: distributionPaidError } = await supabase
      .from('profit_distributions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', distributionId)
    if (distributionPaidError) {
      throw new Error(`distribution paid update failed: ${distributionPaidError.message}`)
    }

    await expect(page.locator('main')).toContainText('paid', { timeout: 30_000 })
    await expect(page).toHaveURL(new RegExp(`/admin/profit-distributions/${distributionId}$`))
  } finally {
    if (allocationId) await supabase.from('profit_distribution_allocations').delete().eq('id', allocationId)
    if (distributionId) await supabase.from('profit_distributions').delete().eq('id', distributionId)
    if (holdingId) await supabase.from('ownership_holdings').delete().eq('id', holdingId)
    if (offeringId) await supabase.from('ownership_offerings').delete().eq('id', offeringId)
    await context.close()
  }
})
