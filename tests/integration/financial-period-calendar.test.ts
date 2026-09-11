// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { closeDb, db, expectRejected } from './helpers/db'

const TEST_YEARS = [2091, 2092, 2093, 2094, 2095, 2096]

function toDateOnly(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value
}

afterAll(async () => {
  await db()`
    delete from public.financial_periods
    where fiscal_year = any(${TEST_YEARS}::int[])
  `
  await closeDb()
})

describe('financial period calendar integrity', () => {
  it('accepts calendar-aligned monthly, quarterly, and yearly periods', async () => {
    await db()`
      insert into public.financial_periods (
        period_type, fiscal_year, period_index, starts_on, ends_on
      ) values
        ('monthly', 2091, 2, date '2091-02-01', date '2091-02-28'),
        ('quarterly', 2092, 3, date '2092-07-01', date '2092-09-30'),
        ('yearly', 2093, 1, date '2093-01-01', date '2093-12-31')
    `

    const rows = await db()<{
      period_type: string
      fiscal_year: number
      period_index: number
      starts_on: Date | string
      ends_on: Date | string
    }[]>`
      select period_type, fiscal_year, period_index, starts_on, ends_on
      from public.financial_periods
      where fiscal_year in (2091, 2092, 2093)
      order by fiscal_year
    `

    expect(rows).toHaveLength(3)
    expect({ ...rows[0], starts_on: toDateOnly(rows[0]!.starts_on), ends_on: toDateOnly(rows[0]!.ends_on) }).toMatchObject({
      period_type: 'monthly',
      fiscal_year: 2091,
      period_index: 2,
      starts_on: '2091-02-01',
      ends_on: '2091-02-28',
    })
    expect({ ...rows[1], starts_on: toDateOnly(rows[1]!.starts_on), ends_on: toDateOnly(rows[1]!.ends_on) }).toMatchObject({
      period_type: 'quarterly',
      fiscal_year: 2092,
      period_index: 3,
      starts_on: '2092-07-01',
      ends_on: '2092-09-30',
    })
    expect({ ...rows[2], starts_on: toDateOnly(rows[2]!.starts_on), ends_on: toDateOnly(rows[2]!.ends_on) }).toMatchObject({
      period_type: 'yearly',
      fiscal_year: 2093,
      period_index: 1,
      starts_on: '2093-01-01',
      ends_on: '2093-12-31',
    })
  })

  it('rejects a monthly period whose dates do not match its month index', async () => {
    const error = await expectRejected(() => db()`
      insert into public.financial_periods (
        period_type, fiscal_year, period_index, starts_on, ends_on
      ) values ('monthly', 2094, 1, date '2094-09-09', date '2094-12-09')
    `)

    expect(error.code).toBe('23514')
    expect(error.message).toContain('must span 2094-01-01 to 2094-01-31')
  })

  it('rejects a quarterly period with non-calendar quarter boundaries', async () => {
    const error = await expectRejected(() => db()`
      insert into public.financial_periods (
        period_type, fiscal_year, period_index, starts_on, ends_on
      ) values ('quarterly', 2095, 2, date '2095-04-02', date '2095-06-30')
    `)

    expect(error.code).toBe('23514')
    expect(error.message).toContain('must span 2095-04-01 to 2095-06-30')
  })

  it('rejects a yearly period that does not cover the fiscal calendar year', async () => {
    const error = await expectRejected(() => db()`
      insert into public.financial_periods (
        period_type, fiscal_year, period_index, starts_on, ends_on
      ) values ('yearly', 2096, 1, date '2096-09-10', date '2097-02-10')
    `)

    expect(error.code).toBe('23514')
    expect(error.message).toContain('must span 2096-01-01 to 2096-12-31')
  })

  it('limits the semantic guard to structural period fields', async () => {
    const rows = await db()<Array<{ definition: string }>>`
      select pg_catalog.pg_get_triggerdef(t.oid) as definition
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_class c on c.oid = t.tgrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'financial_periods'
        and t.tgname = 'trg_financial_period_semantic_guard'
        and not t.tgisinternal
    `

    expect(rows).toHaveLength(1)
    expect(rows[0]!.definition).toContain(
      'UPDATE OF period_type, fiscal_year, period_index, starts_on, ends_on',
    )
    expect(rows[0]!.definition).not.toContain('updated_at')
  })
})
