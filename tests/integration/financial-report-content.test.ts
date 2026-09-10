// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let assetId: string

beforeAll(async () => {
  fixtures = await createFixtures()
  const [asset] = await db()<{ id: string }[]>`
    insert into public.media_assets (
      bucket, path, original_filename, mime_type, byte_size,
      visibility, uploaded_by, finalized_at
    ) values (
      'financial-documents',
      ${`financial-test-${fixtures.suffix}/report.pdf`},
      'laporan-uji.pdf',
      'application/pdf',
      1024,
      'restricted',
      ${fixtures.superAdmin.userId},
      now()
    ) returning id
  `
  if (!asset) throw new Error('Failed to create financial attachment fixture.')
  assetId = asset.id
})

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.media_assets where id = ${assetId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('financial report content workflow', () => {
  it('saves figures, KPIs, and attachment atomically before review', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [period] = await tx<{ id: string }[]>`
        insert into public.financial_periods (
          period_type, fiscal_year, period_index, starts_on, ends_on, currency
        ) values ('monthly', 2199, 12, '2199-12-01', '2199-12-31', 'IDR') returning id
      `
      const [report] = await tx<{ report_id: string }[]>`
        select report_id from app.create_financial_report_with_draft(
          ${period!.id}, 'Laporan belum lengkap', null, 'investors', 'internal', null, null
        )
      `
      const incomplete = await expectRejected(
        () => tx`select * from app.transition_financial_report(${report!.report_id}, 'review')`,
      )
      expect(incomplete.code).toBe('23514')
    })

    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [period] = await tx<{ id: string }[]>`
        insert into public.financial_periods (
          period_type, fiscal_year, period_index, starts_on, ends_on, currency
        ) values ('monthly', 2199, 12, '2199-12-01', '2199-12-31', 'IDR')
        returning id
      `
      if (!period) throw new Error('Failed to create financial period.')

      const [report] = await tx<{ report_id: string; version_id: string }[]>`
        select report_id, version_id
        from app.create_financial_report_with_draft(
          ${period.id}, 'Laporan lengkap', null, 'investors', 'audited', 'Tim Keuangan', null
        )
      `
      if (!report) throw new Error('Failed to create financial report.')

      const [saved] = await tx<
        { line_item_count: number; kpi_count: number; document_asset_id: string }[]
      >`
        select * from app.save_financial_report_draft_content(
          ${report.report_id},
          ${assetId},
          ${tx.json([
            {
              statement: 'income',
              category: 'revenue',
              line_key: 'pendapatan',
              label: 'Pendapatan',
              amount: 125000000,
              currency: 'IDR',
              position: 0,
              note: 'Pendapatan periode berjalan',
            },
          ])},
          ${tx.json([
            {
              kpi_key: 'margin_bersih',
              label: 'Margin laba bersih',
              value: 18.5,
              unit: 'percent',
              basis: 'reported',
              position: 0,
            },
          ])}
        )
      `

      expect(saved).toMatchObject({
        line_item_count: 1,
        kpi_count: 1,
        document_asset_id: assetId,
      })

      const [reviewed] = await tx<{ status: string }[]>`
        select status from app.transition_financial_report(${report.report_id}, 'review')
      `
      expect(reviewed?.status).toBe('review')
    })
  })

  it('blocks direct metadata changes after an official report is published', async () => {
    const completedYear = 2000 + (Number.parseInt(fixtures.suffix.slice(0, 2), 16) % 25)

    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [period] = await tx<{ id: string }[]>`
        insert into public.financial_periods (
          period_type, fiscal_year, period_index, starts_on, ends_on, currency, status
        ) values (
          'yearly',
          ${completedYear},
          1,
          ${`${completedYear}-01-01`},
          ${`${completedYear}-12-31`},
          'IDR',
          'closed'
        ) returning id
      `
      if (!period) throw new Error('Failed to create completed financial period.')

      const [report] = await tx<{ report_id: string }[]>`
        select report_id
        from app.create_financial_report_with_draft(
          ${period.id}, 'Laporan resmi immutable', null, 'investors', 'audited', 'Tim Keuangan', null
        )
      `
      if (!report) throw new Error('Failed to create immutable financial report fixture.')

      await tx`
        select * from app.save_financial_report_draft_content(
          ${report.report_id},
          ${assetId},
          ${tx.json([
            {
              statement: 'income',
              category: 'revenue',
              line_key: 'pendapatan',
              label: 'Pendapatan',
              amount: 125000000,
              currency: 'IDR',
              position: 0,
              note: 'Pendapatan periode berjalan',
            },
          ])},
          ${tx.json([
            {
              kpi_key: 'margin_bersih',
              label: 'Margin laba bersih',
              value: 18.5,
              unit: 'percent',
              basis: 'reported',
              position: 0,
            },
          ])}
        )
      `

      for (const target of ['review', 'approved', 'published'] as const) {
        await tx`select * from app.transition_financial_report(${report.report_id}, ${target}::public.publication_status)`
      }

      const directUpdate = await expectRejected(
        () => tx`
          update public.financial_reports
          set title = 'Laporan resmi yang diubah setelah publish'
          where id = ${report.report_id}
        `,
      )

      expect(directUpdate.code).toBe('42501')
    })
  })
})
