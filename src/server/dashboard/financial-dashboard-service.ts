import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

type FinancialLineItem = {
  statement: 'income' | 'balance' | 'cash_flow'
  category:
    | 'revenue'
    | 'expense'
    | 'asset'
    | 'liability'
    | 'equity'
    | 'operating'
    | 'investing'
    | 'financing'
  amount: number
  currency: string
}

type FinancialKpi = {
  kpi_key: string
  label: string
  value: number
  unit: string
  basis: string
  position: number
}

export type FinancialDashboardPeriod = {
  id: string
  periodType: 'monthly' | 'quarterly' | 'yearly'
  fiscalYear: number
  periodIndex: number
  startsOn: string
  endsOn: string
  currency: string
}

export type FinancialDashboardSnapshot = {
  reportId: string
  reportTitle: string
  reportStatus: string
  source: 'internal' | 'reviewed' | 'audited'
  versionId: string
  versionNumber: number
  publishedAt: string | null
  period: FinancialDashboardPeriod

  revenue: number
  expenses: number
  netProfit: number
  netProfitMargin: number | null

  assets: number
  liabilities: number
  equity: number

  operatingCashFlow: number
  investingCashFlow: number
  financingCashFlow: number
  netCashFlow: number

  kpis: FinancialKpi[]
}

export type FinancialDashboardTrendPoint = {
  reportId: string
  versionId: string
  fiscalYear: number
  periodIndex: number
  periodType: 'monthly' | 'quarterly' | 'yearly'
  startsOn: string
  endsOn: string
  revenue: number
  expenses: number
  netProfit: number
  netCashFlow: number
}

export type FinancialDashboardData = {
  latest: FinancialDashboardSnapshot | null
  previous: FinancialDashboardSnapshot | null
  trend: FinancialDashboardTrendPoint[]
  revenueGrowth: number | null
  netProfitGrowth: number | null
}

type ReportRow = {
  id: string
  title: string
  status: string
  published_version_id: string | null
  financial_periods:
    | {
        id: string
        period_type: 'monthly' | 'quarterly' | 'yearly'
        fiscal_year: number
        period_index: number
        starts_on: string
        ends_on: string
        currency: string
      }
    | Array<{
        id: string
        period_type: 'monthly' | 'quarterly' | 'yearly'
        fiscal_year: number
        period_index: number
        starts_on: string
        ends_on: string
        currency: string
      }>
    | null
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function sumCategory(
  lineItems: FinancialLineItem[],
  category: FinancialLineItem['category'],
) {
  return lineItems
    .filter((item) => item.category === category)
    .reduce((total, item) => total + Number(item.amount), 0)
}

function growth(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

async function buildSnapshot(
  supabase: DbClient,
  report: ReportRow,
): Promise<FinancialDashboardSnapshot | null> {
  const period = firstRelation(report.financial_periods)

  if (!period || !report.published_version_id) {
    return null
  }

  const { data: version, error: versionError } = await supabase
    .from('financial_report_versions')
    .select(
      'id, version_number, status, source, published_at',
    )
    .eq('id', report.published_version_id)
    .eq('financial_report_id', report.id)
    .maybeSingle()

  if (versionError || !version || version.status !== 'published') {
    return null
  }

  const [{ data: rawLineItems }, { data: rawKpis }] = await Promise.all([
    supabase
      .from('financial_line_items')
      .select('statement, category, amount, currency')
      .eq('financial_report_version_id', version.id),

    supabase
      .from('financial_kpis')
      .select('kpi_key, label, value, unit, basis, position')
      .eq('financial_report_version_id', version.id)
      .order('position'),
  ])

  const lineItems = (rawLineItems ?? []) as FinancialLineItem[]
  const kpis = (rawKpis ?? []) as FinancialKpi[]

  const revenue = sumCategory(lineItems, 'revenue')
  const expenses = sumCategory(lineItems, 'expense')
  const netProfit = revenue - expenses

  const assets = sumCategory(lineItems, 'asset')
  const liabilities = sumCategory(lineItems, 'liability')
  const equity = sumCategory(lineItems, 'equity')

  const operatingCashFlow = sumCategory(lineItems, 'operating')
  const investingCashFlow = sumCategory(lineItems, 'investing')
  const financingCashFlow = sumCategory(lineItems, 'financing')
  const netCashFlow =
    operatingCashFlow + investingCashFlow + financingCashFlow

  const netProfitMargin =
    revenue === 0 ? null : (netProfit / revenue) * 100

  return {
    reportId: report.id,
    reportTitle: report.title,
    reportStatus: report.status,
    source: version.source,
    versionId: version.id,
    versionNumber: version.version_number,
    publishedAt: version.published_at,

    period: {
      id: period.id,
      periodType: period.period_type,
      fiscalYear: period.fiscal_year,
      periodIndex: period.period_index,
      startsOn: period.starts_on,
      endsOn: period.ends_on,
      currency: period.currency,
    },

    revenue,
    expenses,
    netProfit,
    netProfitMargin,

    assets,
    liabilities,
    equity,

    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashFlow,

    kpis,
  }
}

export async function getPublishedFinancialDashboardData(
  supabase: DbClient,
): Promise<FinancialDashboardData> {
  const { data: reports, error } = await supabase
    .from('financial_reports')
    .select(
      `
        id,
        title,
        status,
        published_version_id,
        financial_periods (
          id,
          period_type,
          fiscal_year,
          period_index,
          starts_on,
          ends_on,
          currency
        )
      `,
    )
    .eq('status', 'published')
    .eq('visibility', 'investors')

  if (error || !reports?.length) {
    return {
      latest: null,
      previous: null,
      trend: [],
      revenueGrowth: null,
      netProfitGrowth: null,
    }
  }

  const sortedReports = (reports as ReportRow[])
    .filter(
      (report) =>
        report.published_version_id &&
        firstRelation(report.financial_periods),
    )
    .sort((a, b) => {
      const periodA = firstRelation(a.financial_periods)
      const periodB = firstRelation(b.financial_periods)

      if (!periodA || !periodB) return 0

      if (periodA.ends_on !== periodB.ends_on) {
        return periodB.ends_on.localeCompare(periodA.ends_on)
      }

      return periodB.period_index - periodA.period_index
    })

  const snapshots = (
    await Promise.all(
      sortedReports.map((report) => buildSnapshot(supabase, report)),
    )
  ).filter(
    (snapshot): snapshot is FinancialDashboardSnapshot =>
      snapshot !== null,
  )

  const latest = snapshots[0] ?? null
  const previous = snapshots[1] ?? null

  const trend = [...snapshots]
    .reverse()
    .map((snapshot) => ({
      reportId: snapshot.reportId,
      versionId: snapshot.versionId,
      fiscalYear: snapshot.period.fiscalYear,
      periodIndex: snapshot.period.periodIndex,
      periodType: snapshot.period.periodType,
      startsOn: snapshot.period.startsOn,
      endsOn: snapshot.period.endsOn,
      revenue: snapshot.revenue,
      expenses: snapshot.expenses,
      netProfit: snapshot.netProfit,
      netCashFlow: snapshot.netCashFlow,
    }))

  return {
    latest,
    previous,
    trend,
    revenueGrowth:
      latest && previous
        ? growth(latest.revenue, previous.revenue)
        : null,
    netProfitGrowth:
      latest && previous
        ? growth(latest.netProfit, previous.netProfit)
        : null,
  }
}
