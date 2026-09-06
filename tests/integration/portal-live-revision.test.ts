// @vitest-environment node
import { randomUUID } from 'node:crypto'
import type { TransactionSql } from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, cleanup, closeDb, db } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

type Tx = TransactionSql<Record<string, never>>

let fixtures: Fixtures
let pageId: string
let sectionId: string
let publishedV1: string

async function asCommitted(userId: string, run: (tx: Tx) => Promise<void>) {
  await db().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({
      sub: userId,
      role: 'authenticated',
    })}, true)`
    await tx`set local role authenticated`
    await run(tx)
  })
}

async function transition(status: 'draft' | 'review' | 'approved' | 'published' | 'archived') {
  await asCommitted(fixtures.superAdmin.userId, async (tx) => {
    await tx`
      select *
      from app.transition_portal_page(
        ${pageId}::uuid,
        ${status}::public.publication_status
      )
    `
  })
}

beforeAll(async () => {
  fixtures = await createFixtures()
  const sql = db()
  const slug = `portal-live-${fixtures.suffix}`

  const [page] = await sql<{ id: string }[]>`
    insert into public.portal_pages (slug, title, page_kind, status)
    values (${slug}, 'Portal Live Revision Test', 'standard', 'draft')
    returning id
  `
  if (!page) throw new Error('Failed to create portal page fixture.')
  pageId = page.id

  const [section] = await sql<{ id: string }[]>`
    insert into public.portal_sections (
      page_id,
      section_kind,
      position,
      is_visible,
      status
    )
    values (${pageId}, 'intro', 0, true, 'draft')
    returning id
  `
  if (!section) throw new Error('Failed to create portal section fixture.')
  sectionId = section.id

  const [version] = await sql<{ id: string }[]>`
    insert into public.portal_section_versions (
      section_id,
      version_number,
      status,
      content,
      created_by
    )
    values (
      ${sectionId},
      1,
      'draft',
      ${sql.json({ kind: 'intro', eyebrow: 'Awal', title: 'Versi Publik 1', description: 'Konten awal.' })},
      ${fixtures.superAdmin.userId}
    )
    returning id
  `
  if (!version) throw new Error('Failed to create portal version fixture.')
  publishedV1 = version.id

  await sql`
    update public.portal_sections
    set current_version_id = ${publishedV1}
    where id = ${sectionId}
  `

  await transition('review')
  await transition('approved')
  await transition('published')
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.portal_pages where id = ${pageId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('portal live revision lifecycle', () => {
  it('keeps the last published snapshot readable while a new content revision is drafted', async () => {
    await transition('draft')

    const publicPageCount = await as({ kind: 'anon' }, async (tx) => {
      const rows = await tx<{ count: string }[]>`
        select count(*)::text as count
        from public.portal_pages
        where id = ${pageId}
      `
      return Number(rows[0]?.count ?? 0)
    })
    expect(publicPageCount).toBe(1)

    const publicSection = await as({ kind: 'anon' }, async (tx) => {
      const rows = await tx<{ published_version_id: string }[]>`
        select published_version_id
        from public.portal_sections
        where id = ${sectionId}
      `
      return rows[0] ?? null
    })
    expect(publicSection?.published_version_id).toBe(publishedV1)

    let draftV2 = ''
    await asCommitted(fixtures.superAdmin.userId, async (tx) => {
      const [version] = await tx<{ id: string }[]>`
        insert into public.portal_section_versions (
          section_id,
          version_number,
          status,
          content,
          created_by
        )
        values (
          ${sectionId},
          2,
          'draft',
          ${tx.json({ kind: 'intro', eyebrow: 'Revisi', title: 'Versi Publik 2', description: 'Konten revisi.' })},
          ${fixtures.superAdmin.userId}
        )
        returning id
      `
      if (!version) throw new Error('Failed to create revision version.')
      draftV2 = version.id

      await tx`
        update public.portal_sections
        set current_version_id = ${draftV2}
        where id = ${sectionId}
      `
    })

    const stillPublicV1 = await as({ kind: 'anon' }, async (tx) => {
      const rows = await tx<{ published_version_id: string }[]>`
        select published_version_id
        from public.portal_sections
        where id = ${sectionId}
      `
      return rows[0]?.published_version_id ?? null
    })
    expect(stillPublicV1).toBe(publishedV1)

    await transition('review')
    await transition('approved')
    await transition('published')

    const nowPublicV2 = await as({ kind: 'anon' }, async (tx) => {
      const rows = await tx<{ published_version_id: string }[]>`
        select published_version_id
        from public.portal_sections
        where id = ${sectionId}
      `
      return rows[0]?.published_version_id ?? null
    })
    expect(nowPublicV2).toBe(draftV2)
  })

  it('stages visibility changes until publication and archive takes the page offline', async () => {
    await transition('draft')

    await asCommitted(fixtures.superAdmin.userId, async (tx) => {
      await tx`
        update public.portal_sections
        set is_visible = false
        where id = ${sectionId}
      `
    })

    const sectionDuringDraft = await as({ kind: 'anon' }, async (tx) => {
      const rows = await tx<{ id: string }[]>`
        select id from public.portal_sections where id = ${sectionId}
      `
      return rows[0] ?? null
    })
    expect(sectionDuringDraft?.id).toBe(sectionId)

    await transition('review')
    await transition('approved')
    await transition('published')

    const hiddenAfterPublish = await as({ kind: 'anon' }, async (tx) => {
      const rows = await tx<{ count: string }[]>`
        select count(*)::text as count
        from public.portal_sections
        where id = ${sectionId}
      `
      return Number(rows[0]?.count ?? 0)
    })
    expect(hiddenAfterPublish).toBe(0)

    await transition('archived')

    const pageAfterArchive = await as({ kind: 'anon' }, async (tx) => {
      const rows = await tx<{ count: string }[]>`
        select count(*)::text as count
        from public.portal_pages
        where id = ${pageId}
      `
      return Number(rows[0]?.count ?? 0)
    })
    expect(pageAfterArchive).toBe(0)
  })
})
