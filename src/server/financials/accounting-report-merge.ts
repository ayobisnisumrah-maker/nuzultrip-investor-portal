import type {
  GeneratedFinancialKpi,
  GeneratedFinancialLineItem,
  GeneratedTransactionReport,
} from '@/server/financials/transaction-report-service'

export type ExistingFinancialLineItem = {
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
  line_key: string
  label: string
  amount: number | string
  currency: string
  note: string | null
}

export type ExistingFinancialKpi = {
  kpi_key: string
  label: string
  value: number | string
  unit: 'ratio' | 'percent' | 'currency' | 'count' | 'days'
  basis: 'reported' | 'derived'
}

export type MergedFinancialReportContent = {
  lineItems: GeneratedFinancialLineItem[]
  kpis: GeneratedFinancialKpi[]
  preservedLineItemCount: number
  preservedKpiCount: number
}

function finite(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

export function mergeGeneratedWithManualAccounting(
  generated: GeneratedTransactionReport,
  existingLines: readonly ExistingFinancialLineItem[],
  existingKpis: readonly ExistingFinancialKpi[],
): MergedFinancialReportContent {
  const generatedLineKeys = new Set(generated.lineItems.map((item) => item.lineKey))
  const generatedKpiKeys = new Set(generated.kpis.map((item) => item.kpiKey))

  const preservedLines: GeneratedFinancialLineItem[] = existingLines
    .filter((item) => !generatedLineKeys.has(item.line_key))
    .map((item) => ({
      statement: item.statement,
      category: item.category,
      lineKey: item.line_key,
      label: item.label,
      amount: finite(item.amount),
      currency: item.currency.trim().toUpperCase(),
      note: item.note?.trim() || undefined,
    }))

  const preservedKpis: GeneratedFinancialKpi[] = existingKpis
    .filter((item) => !generatedKpiKeys.has(item.kpi_key))
    .map((item) => ({
      kpiKey: item.kpi_key,
      label: item.label,
      value: finite(item.value),
      unit: item.unit,
      basis: item.basis,
    }))

  return {
    lineItems: [...generated.lineItems, ...preservedLines],
    kpis: [...generated.kpis, ...preservedKpis],
    preservedLineItemCount: preservedLines.length,
    preservedKpiCount: preservedKpis.length,
  }
}
