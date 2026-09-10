const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })

export function formatFinancialKpi(value: number | string, unit: string, currency = 'IDR') {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  if (unit === 'percent' || unit === '%') return `${number.format(numeric)}%`
  if (unit === 'currency' || unit === currency) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(numeric)
  }
  if (unit === 'days') return `${number.format(numeric)} hari`
  if (unit === 'count') return number.format(numeric)
  return `${number.format(numeric)}×`
}

export const FINANCIAL_STATEMENT_LABELS: Record<string, string> = {
  income: 'Laba rugi',
  balance: 'Neraca',
  cash_flow: 'Arus kas',
}

export const FINANCIAL_CATEGORY_LABELS: Record<string, string> = {
  revenue: 'Pendapatan',
  expense: 'Beban',
  asset: 'Aset',
  liability: 'Liabilitas',
  equity: 'Ekuitas',
  operating: 'Operasional',
  investing: 'Investasi',
  financing: 'Pendanaan',
}

export const FINANCIAL_SOURCE_LABELS: Record<string, string> = {
  internal: 'Laporan internal manajemen',
  reviewed: 'Telah ditinjau',
  audited: 'Telah diaudit independen',
}

export const KPI_BASIS_LABELS: Record<string, string> = {
  reported: 'Dilaporkan',
  derived: 'Dihitung dari rincian laporan',
}
