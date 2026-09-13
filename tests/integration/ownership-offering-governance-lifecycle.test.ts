// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, asCommitted, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures | undefined
const offeringIds: string[] = []
const ruleIds: string[] = []
const matterIds: string[] = []
const decisionIds: string[] = []

beforeAll(async () => {
  fixtures = await createFixtures()

  await db()`
    insert into public.role_permissions (role_id, permission_id)
    select ${fixtures.managerAdmin.roleId}, p.id
    from public.permissions p
    where p.key in (
      'reserved_matters.view',
      'reserved_matters.create',
      'reserved_matters.submit'
    )
    on conflict do nothing
  `
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    if (decisionIds.length > 0) {
      await tx`delete from public.reserved_matter_decisions where id = any(${decisionIds})`
    }
    if (matterIds.length > 0) {
      await tx`delete from public.reserved_matters where id = any(${matterIds})`
    }
    if (ruleIds.length > 0) {
      await tx`delete from public.governance_rules where id = any(${ruleIds})`
    }
    if (offeringIds.length > 0) {
      await tx`delete from public.ownership_offerings where id = any(${offeringIds})`
    }
  })

  if (fixtures) await destroyFixtures(fixtures)
  await closeDb()
})

function requireFixtures(): Fixtures {
  if (!fixtures) throw new Error('Ownership offering governance fixtures were not initialized.')
  return fixtures
}

async function createDraftOffering(): Promise<string> {
  const f = requireFixtures()
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const rows = await asCommitted(
    { kind: 'authenticated', userId: f.superAdmin.userId },
    (tx) => tx<{ id: string }[]>`
      insert into public.ownership_offerings (
        name,
        code,
        status,
        total_offered_bps,
        unit_ownership_bps,
        unit_price,
        total_units,
        distribution_cadence_months,
        transfer_lock_months,
        created_by,
        updated_by
      ) values (
        ${`Governance Offering ${suffix}`},
        ${`governance-${suffix}`},
        'draft',
        80,
        8,
        100000000,
        10,
        6,
        36,
        ${f.superAdmin.userId},
        ${f.superAdmin.userId}
      )
      returning id
    `,
  )

  const id = rows[0]?.id
  if (!id) throw new Error('Failed to create ownership offering fixture.')
  offeringIds.push(id)
  return id
}

async function createApprovedPublishMatter(offeringId: string): Promise<string> {
  const f = requireFixtures()
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)

  const rules = await asCommitted(
    { kind: 'authenticated', userId: f.superAdmin.userId },
    (tx) => tx<{ id: string }[]>`
      select app.create_governance_rule(
        ${`ownership_publish_${suffix}`},
        ${`Ownership publish ${suffix}`},
        'Ratified test rule for publishing a new ownership offering.',
        'ownership_offerings.publish',
        1,
        1,
        100,
        null
      ) as id
    `,
  )
  const ruleId = rules[0]?.id
  if (!ruleId) throw new Error('Failed to create offering governance rule.')
  ruleIds.push(ruleId)

  await asCommitted({ kind: 'authenticated', userId: f.superAdmin.userId }, (tx) =>
    tx`select app.activate_governance_rule(${ruleId})`,
  )

  const matters = await asCommitted(
    { kind: 'authenticated', userId: f.managerAdmin.userId },
    (tx) => tx<{ id: string }[]>`
      select app.create_reserved_matter(
        ${ruleId},
        'Publish ownership offering',
        'Approve opening this specific ownership offering.',
        'ownership_offering',
        ${offeringId}
      ) as id
    `,
  )
  const matterId = matters[0]?.id
  if (!matterId) throw new Error('Failed to create offering Reserved Matter.')
  matterIds.push(matterId)

  await asCommitted({ kind: 'authenticated', userId: f.managerAdmin.userId }, (tx) =>
    tx`select app.submit_reserved_matter(${matterId})`,
  )

  const decisions = await asCommitted(
    { kind: 'authenticated', userId: f.superAdmin.userId },
    (tx) => tx<{ id: string }[]>`
      select app.record_reserved_matter_decision(
        ${matterId},
        'approve',
        'Independent approval for ownership offering publication.'
      ) as id
    `,
  )
  const decisionId = decisions[0]?.id
  if (!decisionId) throw new Error('Failed to record offering governance decision.')
  decisionIds.push(decisionId)

  await asCommitted({ kind: 'authenticated', userId: f.superAdmin.userId }, (tx) =>
    tx`select app.finalise_reserved_matter(${matterId}, 'approved', 'Threshold met')`,
  )

  return matterId
}

describe('ownership offering lifecycle governance enforcement', () => {
  it('removes table-level UPDATE while preserving editable-column grants', async () => {
    const [privileges] = await db()<{
      table_update: boolean
      description_update: boolean
      status_update: boolean
    }[]>`
      select
        has_table_privilege('authenticated', 'public.ownership_offerings', 'UPDATE') as table_update,
        has_column_privilege('authenticated', 'public.ownership_offerings', 'description', 'UPDATE') as description_update,
        has_column_privilege('authenticated', 'public.ownership_offerings', 'status', 'UPDATE') as status_update
    `

    expect(privileges).toEqual({
      table_update: false,
      description_update: true,
      status_update: false,
    })
  })

  it('blocks direct authenticated status mutation even for Super Admin', async () => {
    const f = requireFixtures()
    const offeringId = await createDraftOffering()

    const rejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) =>
        expectRejected(() => tx`
          update public.ownership_offerings
          set status = 'open'
          where id = ${offeringId}
        `),
    )

    expect(rejection.code).toBe('42501')
  })

  it('keeps ordinary offering edits working through the existing RLS permission', async () => {
    const f = requireFixtures()
    const offeringId = await createDraftOffering()

    const rows = await asCommitted(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) => tx<{ description: string | null }[]>`
        update public.ownership_offerings
        set description = 'Editable content remains available.'
        where id = ${offeringId}
        returning description
      `,
    )

    expect(rows[0]?.description).toBe('Editable content remains available.')
  })

  it('fails closed when publish has no active Reserved Matters rule', async () => {
    const f = requireFixtures()
    const offeringId = await createDraftOffering()

    const rejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) =>
        expectRejected(() => tx`
          select app.transition_ownership_offering(${offeringId}, 'open')
        `),
    )

    expect(rejection.code).toBe('55000')
    expect(rejection.message).toContain('tidak memiliki aturan Reserved Matters aktif')
  })

  it('requires reserved_matters.execute in addition to publish permission', async () => {
    const f = requireFixtures()
    const offeringId = await createDraftOffering()
    await createApprovedPublishMatter(offeringId)

    const rejection = await as(
      { kind: 'authenticated', userId: f.internalAdmin.userId },
      (tx) =>
        expectRejected(() => tx`
          select app.transition_ownership_offering(${offeringId}, 'open')
        `),
    )

    expect(rejection.code).toBe('42501')
    expect(rejection.message).toContain('Reserved Matters execute')
  })

  it('publishes only with approved governance and atomically consumes that approval', async () => {
    const f = requireFixtures()
    const offeringId = await createDraftOffering()
    const matterId = await createApprovedPublishMatter(offeringId)

    const rows = await asCommitted(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) => tx<{ id: string; status: string; effective_from: string | null }[]>`
        select id, status, effective_from
        from app.transition_ownership_offering(${offeringId}, 'open')
      `,
    )

    expect(rows[0]?.id).toBe(offeringId)
    expect(rows[0]?.status).toBe('open')
    expect(rows[0]?.effective_from).not.toBeNull()

    const [matter] = await db()<{
      status: string
      executed_by: string | null
      executed_at: string | null
    }[]>`
      select status, executed_by, executed_at
      from public.reserved_matters
      where id = ${matterId}
    `

    expect(matter).toMatchObject({
      status: 'executed',
      executed_by: f.superAdmin.userId,
    })
    expect(matter?.executed_at).not.toBeNull()
  })

  it('enforces legal lifecycle edges through the canonical RPC', async () => {
    const f = requireFixtures()
    const offeringId = await createDraftOffering()

    const rejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) =>
        expectRejected(() => tx`
          select app.transition_ownership_offering(${offeringId}, 'closed')
        `),
    )

    expect(rejection.code).toBe('55000')
    expect(rejection.message).toContain('tidak diizinkan')
  })
})
