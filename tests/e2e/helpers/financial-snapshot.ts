import { serviceClient } from './accounts'

export type E2EFinancialSnapshot = {
  periodId: string
  reportId: string
  versionId: string
  startsOn: string
  endsOn: string
}

function fiscalYearFromToken(token: string): number {
  const numeric = Number.parseInt(token.slice(0, 8), 16)
  const offset = Number.isFinite(numeric) ? numeric % 100 : Math.floor(Math.random() * 100)

  // financial_periods_year_sane constrains fiscal_year to 2000..2200.
  // Keep E2E fixtures in a valid future-only band that does not overlap normal
  // application data while retaining enough entropy to avoid parallel collisions.
  return 2101 + offset
}

export async function createPublishedFinancialSnapshot({
  token,
  revenue = 100_000_000,
  expenses = 75_000_000,
}: {
  token: string
  revenue?: number
  expenses?: number
}): Promise<E2EFinancialSnapshot> {
  const supabase = serviceClient()
  const fiscalYear = fiscalYearFromToken(token)
  const startsOn = `${fiscalYear}-01-01`
  const endsOn = `${fiscalYear}-12-31`

  const { data: period, error: periodError } = await supabase
    .from('financial_periods')
    .insert({
      period_type: 'yearly',
      fiscal_year: fiscalYear,
      period_index: 1,
      starts_on: startsOn,
      ends_on: endsOn,
      currency: 'IDR',
      status: 'closed',
    })
    .select('id')
    .single()
  if (periodError || !period) {
    throw new Error(`financial period setup failed: ${periodError?.message}`)
  }

  const { data: report, error: reportError } = await supabase
    .from('financial_reports')
    .insert({
      financial_period_id: period.id,
      title: `E2E authoritative financial snapshot ${token}`,
      visibility: 'investors',
      status: 'draft',
    })
    .select('id')
    .single()
  if (reportError || !report) {
    throw new Error(`financial report setup failed: ${reportError?.message}`)
  }

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
  if (versionError || !version) {
    throw new Error(`financial version setup failed: ${versionError?.message}`)
  }

  const { error: linesError } = await supabase.from('financial_line_items').insert([
    {
      financial_report_version_id: version.id,
      statement: 'income',
      category: 'revenue',
      line_key: 'revenue',
      label: 'Revenue',
      amount: revenue,
      currency: 'IDR',
      position: 0,
    },
    {
      financial_report_version_id: version.id,
      statement: 'income',
      category: 'expense',
      line_key: 'expenses',
      label: 'Expenses',
      amount: expenses,
      currency: 'IDR',
      position: 1,
    },
  ])
  if (linesError) throw new Error(`financial lines setup failed: ${linesError.message}`)

  for (const status of ['review', 'approved', 'published'] as const) {
    const { error } = await supabase
      .from('financial_report_versions')
      .update({
        status,
        ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
      })
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

  const { error: publishedError } = await supabase
    .from('financial_reports')
    .update({
      status: 'published',
      current_version_id: version.id,
      published_version_id: version.id,
    })
    .eq('id', report.id)
  if (publishedError) {
    throw new Error(`financial report published transition failed: ${publishedError.message}`)
  }

  return {
    periodId: period.id as string,
    reportId: report.id as string,
    versionId: version.id as string,
    startsOn,
    endsOn,
  }
}
