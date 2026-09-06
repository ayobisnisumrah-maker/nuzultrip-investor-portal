// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asCommitted, cleanup, closeDb, db } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let pageId: string
let sectionId: string
let firstVersionId: string

async function transition(status: 'review' | 'approved' | 'published' | 'archived' | 'draft') {
  return asCommitted(
    { kind: 'authenticated', userId: fixtures.superAdmin.userId },
    (tx) => tx`
      select page_id, previous_status, status
      from app.transition_portal_page(
        ${pageId},
        ${status}::public.publication_status
      )
    `,
  )
}

beforeAll(async () => {
  fixtures = await createFixtures()
  const sql = db()

  const [page] = await sql<{ id: string }[]>`
    insert into public.portal_pages (
      title,
      slug,
      page_kind,
      status,
      is_system
    )
    values (
      'Portal Lifecycle Regression',
      ${`portal-lifecycle-${fixtures.suffix}`},
      'standard',
      'draft',
      false
    )
    returning id
  `
  if (!page) throw new Error('Failed to create portal lifecycle page fixture.')
  pageId = page.id

  const [section] = await sql<{ id: string }[]>`
    insert into public.portal_sections (
      page_id,
      section_kind,
      position,
      status,
      is_visible
    )
    values (${pageId}, 'intro', 0, 'draft', true)
    returning id
  `
  if (!section) throw new Error('Failed to create portal lifecycle section fixture.')
  sectionId = section.id

  const [version] = await sql<{ id: string }[]>`
    insert into public.portal_section_versions (
      section_id,
      status,
      content,
      created_by
    )
    values (
      ${sectionId},
      'draft',
      ${sql.json({ kind: 'intro', title: 'Regression lifecycle' })},
      ${fixtures.superAdmin.userId}
    )
    returning id
  `
  if (!version) throw new Error('Failed to create portal lifecycle version fixture.')
  firstVersionId = version.id

  await sql`
    update public.portal_sections
    set current_version_id = ${firstVersionId}
    where id = ${sectionId}
  `
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.portal_pages where id = ${pageId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('portal publication lifecycle', () => {
  it('can be archived, restored as a fresh draft, and submitted for review again', async () => {
    await transition('review')
    await transition('approved')
    await transition('published')
    await transition('archived')
    await transition('draft')

    const [restored] = await db()<
      {
        page_status: string
        section_status: string
        current_version_id: string
        current_version_status: string
        published_version_id: string
        published_version_status: string
      }[]
    >`
      select
        page.status::text as page_status,
        section.status::text as section_status,
        section.current_version_id,
        current_version.status::text as current_version_status,
        section.published_version_id,
        published_version.status::text as published_version_status
      from public.portal_pages as page
      join public.portal_sections as section on section.page_id = page.id
      join public.portal_section_versions as current_version
        on current_version.id = section.current_version_id
      join public.portal_section_versions as published_version
        on published_version.id = section.published_version_id
      where page.id = ${pageId}
        and section.id = ${sectionId}
    `

    expect(restored).toMatchObject({
      page_status: 'draft',
      section_status: 'draft',
      current_version_status: 'draft',
      published_version_status: 'published',
    })
    expect(restored?.current_version_id).not.toBe(firstVersionId)
    expect(restored?.published_version_id).toBe(firstVersionId)

    await transition('review')

    const [resubmitted] = await db()<
      { page_status: string; current_version_status: string; original_version_status: string }[]
    >`
      select
        page.status::text as page_status,
        current_version.status::text as current_version_status,
        original_version.status::text as original_version_status
      from public.portal_pages as page
      join public.portal_sections as section on section.page_id = page.id
      join public.portal_section_versions as current_version
        on current_version.id = section.current_version_id
      join public.portal_section_versions as original_version
        on original_version.id = ${firstVersionId}
      where page.id = ${pageId}
        and section.id = ${sectionId}
    `

    expect(resubmitted).toEqual({
      page_status: 'review',
      current_version_status: 'review',
      original_version_status: 'published',
    })
  })
})
