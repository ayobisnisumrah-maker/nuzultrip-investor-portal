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

test('financial report detail receives line item and KPI changes automatically', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  createdAccounts.push(admin.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const year = 2090 + (Number.parseInt(token.slice(0, 1), 16) % 8)
  const title = `Detail Keuangan Realtime ${token}`
  const lineLabel = `Pendapatan realtime ${token}`
  const kpiLabel = `Margin realtime ${token}`

  let periodId: string | null = null
  let reportId: string | null = null
  let versionId: string | null = null
  let lineId: string | null = null
  let kpiId: string | null = null

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const { data: period, error: periodError } = await supabase
      .from('financial_periods')
      .insert({
        period_type: 'yearly',
        fiscal_year: year,
        period_index: 1,
        starts_on: `${year}-01-01`,
        ends_on: `${year}-12-31`,
        currency: 'IDR',
        status: 'open',
      })
      .select('id')
      .single()
    if (periodError || !period) throw new Error(`period setup failed: ${periodError?.message}`)
    periodId = period.id as string

    const { data: report, error: reportError } = await supabase
      .from('financial_reports')
      .insert({
        financial_period_id: periodId,
        title,
        visibility: 'investors',
        status: 'draft',
      })
      .select('id')
      .single()
    if (reportError || !report) throw new Error(`report setup failed: ${reportError?.message}`)
    reportId = report.id as string

    const { data: version, error: versionError } = await supabase
      .from('financial_report_versions')
      .insert({
        financial_report_id: reportId,
        source: 'internal',
        status: 'draft',
        prepared_by: 'E2E',
      })
      .select('id')
      .single()
    if (versionError || !version) throw new Error(`version setup failed: ${versionError?.message}`)
    versionId = version.id as string

    const { error: currentVersionError } = await supabase
      .from('financial_reports')
      .update({ current_version_id: versionId })
      .eq('id', reportId)
    if (currentVersionError) throw new Error(`current version setup failed: ${currentVersionError.message}`)

    await signIn(page, admin, `/admin/financials/reports/${reportId}`)
    await page.waitForLoadState('networkidle')
    await waitForRealtime(page)

    await expect(page.locator('main')).toContainText(title)
    await expect(page.locator('main')).toContainText('Line items (0)')
    await expect(page.locator('main')).toContainText('KPI (0)')

    const { data: line, error: lineError } = await supabase
      .from('financial_line_items')
      .insert({
        financial_report_version_id: versionId,
        statement: 'income',
        category: 'revenue',
        line_key: `revenue_${token}`,
        label: lineLabel,
        amount: 125_000_000,
        currency: 'IDR',
        position: 1,
      })
      .select('id')
      .single()
    if (lineError || !line) throw new Error(`line setup failed: ${lineError?.message}`)
    lineId = line.id as string

    await expect(page.locator('main')).toContainText(lineLabel, { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('Line items (1)')
    await expect(page).toHaveURL(new RegExp(`/admin/financials/reports/${reportId}$`))

    const { data: kpi, error: kpiError } = await supabase
      .from('financial_kpis')
      .insert({
        financial_report_version_id: versionId,
        kpi_key: `margin_${token}`,
        label: kpiLabel,
        value: 12.5,
        unit: 'percent',
        basis: 'reported',
        position: 1,
      })
      .select('id')
      .single()
    if (kpiError || !kpi) throw new Error(`kpi setup failed: ${kpiError?.message}`)
    kpiId = kpi.id as string

    await expect(page.locator('main')).toContainText(kpiLabel, { timeout: 30_000 })
    await expect(page.locator('main')).toContainText('KPI (1)')
    await expect(page).toHaveURL(new RegExp(`/admin/financials/reports/${reportId}$`))
  } finally {
    if (kpiId) await supabase.from('financial_kpis').delete().eq('id', kpiId)
    if (lineId) await supabase.from('financial_line_items').delete().eq('id', lineId)
    if (reportId) {
      await supabase.from('financial_reports').update({ current_version_id: null }).eq('id', reportId)
    }
    if (versionId) await supabase.from('financial_report_versions').delete().eq('id', versionId)
    if (reportId) await supabase.from('financial_reports').delete().eq('id', reportId)
    if (periodId) await supabase.from('financial_periods').delete().eq('id', periodId)
    await context.close()
  }
})

test('offering metadata changes sync automatically to admin detail and investor ownership', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  const investor = await createInvestorAccount('active')
  createdAccounts.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const token = randomUUID().slice(0, 8)
  const originalName = `Offering Detail ${token}`
  const updatedName = `Offering Detail Updated ${token}`

  let offeringId: string | null = null
  let holdingId: string | null = null

  const adminContext = await browser.newContext()
  const investorContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  const investorPage = await investorContext.newPage()

  try {
    const { data: offering, error: offeringError } = await supabase
      .from('ownership_offerings')
      .insert({
        name: originalName,
        code: `detail-${token}`,
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
        acquisition_reference: `DETAIL-${token}`,
      })
      .select('id')
      .single()
    if (holdingError || !holding) throw new Error(`holding setup failed: ${holdingError?.message}`)
    holdingId = holding.id as string

    await signIn(adminPage, admin, `/admin/ownership/offerings/${offeringId}`)
    await signIn(investorPage, investor, '/investor/ownership')
    await Promise.all([adminPage.waitForLoadState('networkidle'), investorPage.waitForLoadState('networkidle')])
    await Promise.all([waitForRealtime(adminPage), waitForRealtime(investorPage)])

    await expect(adminPage.locator('main')).toContainText(originalName)
    await expect(investorPage.locator('main')).toContainText(originalName)

    const { error: updateError } = await supabase
      .from('ownership_offerings')
      .update({ name: updatedName, unit_price: 110_000_000 })
      .eq('id', offeringId)
    if (updateError) throw new Error(`offering update failed: ${updateError.message}`)

    await expect(adminPage.locator('main')).toContainText(updatedName, { timeout: 30_000 })
    await expect(adminPage.locator('main')).not.toContainText(originalName)
    await expect(investorPage.locator('main')).toContainText(updatedName, { timeout: 30_000 })
    await expect(adminPage).toHaveURL(new RegExp(`/admin/ownership/offerings/${offeringId}$`))
    await expect(investorPage).toHaveURL(/\/investor\/ownership$/)
  } finally {
    if (holdingId) await supabase.from('ownership_holdings').delete().eq('id', holdingId)
    if (offeringId) await supabase.from('ownership_offerings').delete().eq('id', offeringId)
    await adminContext.close()
    await investorContext.close()
  }
})
