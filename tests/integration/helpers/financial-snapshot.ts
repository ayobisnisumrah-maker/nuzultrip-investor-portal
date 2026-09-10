import { db } from './db'

export type FinancialSnapshotFixture = {
  periodId: string
  reportId: string
  versionId: string
}

export async function createPublishedFinancialSnapshot({
  suffix,
  revenue,
  expenses,
}: {
  suffix: string
  revenue: number
  expenses: number
}): Promise<FinancialSnapshotFixture> {
  const fiscalYear =
    3000 +
    [...suffix].reduce(
      (hash, character) => (hash * 31 + character.charCodeAt(0)) % 6000,
      0,
    )
  const startsOn = `${fiscalYear}-01-01`
  const endsOn = `${fiscalYear}-12-31`

  const [period] = await db()<{ id: string }[]>`
    insert into public.financial_periods (
      period_type, fiscal_year, period_index, starts_on, ends_on, currency, status
    ) values ('yearly', ${fiscalYear}, 1, ${startsOn}, ${endsOn}, 'IDR', 'closed')
    returning id
  `
  if (!period) throw new Error('Failed to create financial period fixture.')

  const [report] = await db()<{ id: string }[]>`
    insert into public.financial_reports (
      financial_period_id, title, visibility, status
    ) values (${period.id}, ${`Published financial snapshot ${suffix}`}, 'investors', 'draft')
    returning id
  `
  if (!report) throw new Error('Failed to create financial report fixture.')

  const [version] = await db()<{ id: string }[]>`
    insert into public.financial_report_versions (
      financial_report_id, version_number, status, source, published_at
    ) values (${report.id}, 1, 'draft', 'audited', null)
    returning id
  `
  if (!version) throw new Error('Failed to create financial report version fixture.')

  await db()`
    insert into public.financial_line_items (
      financial_report_version_id, statement, category, line_key, label, amount, currency, position
    ) values
      (${version.id}, 'income', 'revenue', 'revenue', 'Revenue', ${revenue}, 'IDR', 0),
      (${version.id}, 'income', 'expense', 'expenses', 'Expenses', ${expenses}, 'IDR', 1)
  `

  await db()`
    update public.financial_report_versions
    set status = 'published', published_at = now()
    where id = ${version.id}
  `

  await db()`
    update public.financial_reports
    set status = 'published', current_version_id = ${version.id}, published_version_id = ${version.id}
    where id = ${report.id}
  `

  return { periodId: period.id, reportId: report.id, versionId: version.id }
}

export async function destroyFinancialSnapshot(snapshot: FinancialSnapshotFixture | null) {
  if (!snapshot) return
  await db()`delete from public.financial_reports where id = ${snapshot.reportId}`
  await db()`delete from public.financial_periods where id = ${snapshot.periodId}`
}
