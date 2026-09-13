// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, asCommitted, cleanup, closeDb, db, expectRejected } from './helpers/db'
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
      ${`sak-foundation-${fixtures.suffix}/report.pdf`},
      'laporan-sak-foundation.pdf',
      'application/pdf',
      2048,
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

const kpis = [
  {
    kpi_key: 'margin_bersih',
    label: 'Margin laba bersih',
    value: 12.5,
    unit: 'percent',
    basis: 'reported',
    position: 0,
  },
]

const incomeOnly = [
  {
    statement: 'income',
    category: 'revenue',
    line_key: 'pendapatan',
    label: 'Pendapatan',
    amount: 100000000,
    currency: 'IDR',
    position: 0,
    note: 'Pendapatan periode berjalan',
  },
]

describe('Indonesian financial reporting snapshot foundation', () => {
  it('fails closed when a framework is declared without changes in equity and CALK', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [period] = await tx<{ id: string }[]>`
        insert into public.financial_periods (
          period_type, fiscal_year, period_index, starts_on, ends_on, currency
        ) values ('monthly', 2196, 1, '2196-01-01', '2196-01-31', 'IDR') returning id
      `
      const [report] = await tx<{ report_id: string }[]>`
        select report_id from app.create_financial_report_with_draft(
          ${period!.id}, 'Framework incomplete', null, 'investors', 'internal', 'Tim Keuangan', null
        )
      `

      await tx`
        select * from app.save_financial_report_draft_content(
          ${report!.report_id}, ${assetId}, ${tx.json(incomeOnly)}, ${tx.json(kpis)},
          'sak_ep', 'Disusun berdasarkan basis akrual dan kelangsungan usaha.', '[]'::jsonb
        )
      `

      const rejected = await expectRejected(
        () => tx`select * from app.transition_financial_report(${report!.report_id}, 'review')`,
      )
      expect(rejected.code).toBe('23514')
    })
  })

  it('persists changes in equity, accounting basis, and CALK atomically', async () => {
    await as({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      const [period] = await tx<{ id: string }[]>`
        insert into public.financial_periods (
          period_type, fiscal_year, period_index, starts_on, ends_on, currency
        ) values ('monthly', 2196, 2, '2196-02-01', '2196-02-29', 'IDR') returning id
      `
      const [report] = await tx<{ report_id: string; version_id: string }[]>`
        select report_id, version_id from app.create_financial_report_with_draft(
          ${period!.id}, 'Framework complete', null, 'investors', 'internal', 'Tim Keuangan', null
        )
      `

      const lines = [
        ...incomeOnly,
        {
          statement: 'changes_in_equity',
          category: 'equity',
          line_key: 'saldo_laba_akhir',
          label: 'Saldo laba akhir',
          amount: 25000000,
          currency: 'IDR',
          position: 0,
          note: 'Saldo akhir setelah perubahan periode berjalan.',
        },
      ]
      const disclosures = [
        {
          disclosure_key: 'basis_penyusunan',
          title: 'Dasar penyusunan',
          content:
            'Disusun berdasarkan data akuntansi perusahaan yang telah direkonsiliasi untuk periode laporan.',
          position: 0,
        },
      ]

      const [saved] = await tx<
        { line_item_count: number; kpi_count: number; disclosure_count: number }[]
      >`
        select line_item_count, kpi_count, disclosure_count
        from app.save_financial_report_draft_content(
          ${report!.report_id}, ${assetId}, ${tx.json(lines)}, ${tx.json(kpis)},
          'sak_ep', 'Basis akrual dan asumsi kelangsungan usaha.', ${tx.json(disclosures)}
        )
      `
      expect(saved).toMatchObject({ line_item_count: 2, kpi_count: 1, disclosure_count: 1 })

      const [version] = await tx<
        { accounting_framework: string; basis_of_preparation: string }[]
      >`
        select accounting_framework, basis_of_preparation
        from public.financial_report_versions
        where id = ${report!.version_id}
      `
      expect(version?.accounting_framework).toBe('sak_ep')
      expect(version?.basis_of_preparation).toContain('Basis akrual')

      const [reviewed] = await tx<{ status: string }[]>`
        select status from app.transition_financial_report(${report!.report_id}, 'review')
      `
      expect(reviewed?.status).toBe('review')
    })
  })

  it('freezes CALK with the exact published version', async () => {
    const completedYear = 2000 + (Number.parseInt(fixtures.suffix.slice(0, 2), 16) % 20)

    const published = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) => {
        const [period] = await tx<{ id: string }[]>`
          insert into public.financial_periods (
            period_type, fiscal_year, period_index, starts_on, ends_on, currency, status
          ) values (
            'yearly', ${completedYear}, 1, ${`${completedYear}-01-01`},
            ${`${completedYear}-12-31`}, 'IDR', 'closed'
          ) returning id
        `
        const [report] = await tx<{ report_id: string; version_id: string }[]>`
          select report_id, version_id from app.create_financial_report_with_draft(
            ${period!.id}, 'Published framework report', null, 'investors', 'audited', 'Tim Keuangan', null
          )
        `
        const lines = [
          ...incomeOnly,
          {
            statement: 'changes_in_equity',
            category: 'equity',
            line_key: 'modal_akhir',
            label: 'Modal akhir',
            amount: 100000000,
            currency: 'IDR',
            position: 0,
            note: null,
          },
        ]
        await tx`
          select * from app.save_financial_report_draft_content(
            ${report!.report_id}, ${assetId}, ${tx.json(lines)}, ${tx.json(kpis)},
            'sak_ep', 'Basis akrual.',
            ${tx.json([
              {
                disclosure_key: 'kebijakan',
                title: 'Kebijakan akuntansi',
                content: 'Kebijakan yang telah direview.',
                position: 0,
              },
            ])}
          )
        `

        for (const target of ['review', 'approved', 'published'] as const) {
          await tx`select * from app.transition_financial_report(${report!.report_id}, ${target}::public.publication_status)`
        }

        const [disclosure] = await tx<{ id: string }[]>`
          select id from public.financial_report_disclosures
          where financial_report_version_id = ${report!.version_id}
        `
        if (!disclosure) throw new Error('Published disclosure fixture was not created.')

        return {
          periodId: period!.id,
          reportId: report!.report_id,
          versionId: report!.version_id,
          disclosureId: disclosure.id,
        }
      },
    )

    const [persisted] = await db()<[{ id: string; status: string }] | { id: string; status: string }[]>`
      select d.id, v.status
      from public.financial_report_disclosures d
      join public.financial_report_versions v on v.id = d.financial_report_version_id
      where d.id = ${published.disclosureId}
    `
    expect(persisted).toMatchObject({ id: published.disclosureId, status: 'published' })

    const updateMutation = await expectRejected(
      () => db()`
        update public.financial_report_disclosures
        set content = 'Mutasi setelah publish tidak boleh berhasil.'
        where id = ${published.disclosureId}
      `,
    )
    expect(updateMutation.code).toBe('42501')

    const deleteMutation = await expectRejected(
      () => db()`
        delete from public.financial_report_disclosures
        where id = ${published.disclosureId}
      `,
    )
    expect(deleteMutation.code).toBe('42501')

    const insertMutation = await expectRejected(
      () => db()`
        insert into public.financial_report_disclosures (
          financial_report_version_id, disclosure_key, title, content, position
        ) values (
          ${published.versionId}, 'tambahan_setelah_publish', 'Catatan tambahan',
          'Tidak boleh ditambahkan ke snapshot yang sudah dipublikasikan.', 99
        )
      `,
    )
    expect(insertMutation.code).toBe('42501')

    await cleanup(async (tx) => {
      await tx`delete from public.financial_reports where id = ${published.reportId}`
      await tx`delete from public.financial_periods where id = ${published.periodId}`
    })
  })
})
