// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, asCommitted, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures | undefined
const createdRuleIds: string[] = []
const createdMatterIds: string[] = []
const createdDisclosureIds: string[] = []
const createdDecisionIds: string[] = []

beforeAll(async () => {
  fixtures = await createFixtures()

  // Governance authority is deliberately not inherited by admin_internal.
  // Give the fixture manager a narrow, explicit governance assignment so the
  // tests exercise a non-Super-Admin decision maker.
  await db()`
    insert into public.role_permissions (role_id, permission_id)
    select ${fixtures.managerAdmin.roleId}, p.id
    from public.permissions p
    where p.key in (
      'reserved_matters.view',
      'reserved_matters.create',
      'reserved_matters.submit',
      'reserved_matters.decide',
      'conflicts.view',
      'conflicts.disclose'
    )
    on conflict do nothing
  `
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    if (createdDecisionIds.length > 0) {
      await tx`delete from public.reserved_matter_decisions where id = any(${createdDecisionIds})`
    }
    if (createdDisclosureIds.length > 0) {
      await tx`delete from public.conflict_disclosures where id = any(${createdDisclosureIds})`
    }
    if (createdMatterIds.length > 0) {
      await tx`delete from public.reserved_matters where id = any(${createdMatterIds})`
    }
    if (createdRuleIds.length > 0) {
      await tx`delete from public.governance_rules where id = any(${createdRuleIds})`
    }
  })
  if (fixtures) await destroyFixtures(fixtures)
  await closeDb()
})

function requireFixtures(): Fixtures {
  if (!fixtures) throw new Error('Governance fixtures were not initialized.')
  return fixtures
}

async function createRule(options?: {
  quorum?: number | null
  approvals?: number | null
  ratio?: number | null
  action?: string
}): Promise<string> {
  const f = requireFixtures()
  const subject = randomUUID().replaceAll('-', '').slice(0, 10)
  const action = options?.action ?? `governance_test.execute_${subject}`
  const rows = await asCommitted(
    { kind: 'authenticated', userId: f.superAdmin.userId },
    (tx) => tx<{ id: string }[]>`
      select app.create_governance_rule(
        ${`rule_${subject}`},
        ${`Rule ${subject}`},
        'Live integration test rule',
        ${action},
        ${options?.quorum ?? 1},
        ${options?.approvals ?? 1},
        ${options?.ratio ?? 100},
        null
      ) as id
    `,
  )
  const id = rows[0]?.id
  if (!id) throw new Error('Failed to create governance rule.')
  createdRuleIds.push(id)
  return id
}

async function activateRule(ruleId: string): Promise<void> {
  const f = requireFixtures()
  await asCommitted({ kind: 'authenticated', userId: f.superAdmin.userId }, (tx) =>
    tx`select app.activate_governance_rule(${ruleId})`,
  )
}

async function createSubmittedMatter(ruleId: string, subjectId = randomUUID()): Promise<string> {
  const f = requireFixtures()
  const rows = await asCommitted(
    { kind: 'authenticated', userId: f.superAdmin.userId },
    (tx) => tx<{ id: string }[]>`
      select app.create_reserved_matter(
        ${ruleId},
        'Live governance test matter',
        'Exercises D05/D04 database enforcement.',
        'integration_subject',
        ${subjectId}
      ) as id
    `,
  )
  const matterId = rows[0]?.id
  if (!matterId) throw new Error('Failed to create Reserved Matter.')
  createdMatterIds.push(matterId)

  await asCommitted({ kind: 'authenticated', userId: f.superAdmin.userId }, (tx) =>
    tx`select app.submit_reserved_matter(${matterId})`,
  )
  return matterId
}

describe('D05/D04 live database governance enforcement', () => {
  it('withholds governance capabilities from admin_internal by default', async () => {
    const f = requireFixtures()
    const rows = await as(
      { kind: 'authenticated', userId: f.internalAdmin.userId },
      (tx) => tx<{ allowed: boolean }[]>`
        select app.has_permission('reserved_matters.decide') as allowed
      `,
    )
    expect(rows[0]?.allowed).toBe(false)
  })

  it('fails closed when a draft rule has no ratified thresholds', async () => {
    const f = requireFixtures()
    const subject = randomUUID().replaceAll('-', '').slice(0, 10)
    const rows = await asCommitted(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) => tx<{ id: string }[]>`
        select app.create_governance_rule(
          ${`incomplete_${subject}`},
          'Incomplete governance rule',
          '',
          ${`governance_test.incomplete_${subject}`},
          null,
          null,
          null,
          null
        ) as id
      `,
    )
    const ruleId = rows[0]?.id
    if (!ruleId) throw new Error('Failed to create incomplete rule.')
    createdRuleIds.push(ruleId)

    const rejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) => expectRejected(() => tx`select app.activate_governance_rule(${ruleId})`),
    )
    expect(rejection.code).toBe('22023')
    expect(rejection.message).toContain('Threshold quorum')
  })

  it('blocks direct authenticated mutation even for an admin', async () => {
    const f = requireFixtures()
    const rejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) =>
        expectRejected(() => tx`
          insert into public.governance_rules (
            key, name, controlled_action, created_by
          ) values (
            'direct_bypass', 'Direct bypass', 'governance_test.direct_bypass', ${f.superAdmin.userId}
          )
        `),
    )
    expect(rejection.code).toBe('42501')
  })

  it('prevents a proposer from deciding their own Reserved Matter', async () => {
    const f = requireFixtures()
    const ruleId = await createRule()
    await activateRule(ruleId)
    const matterId = await createSubmittedMatter(ruleId)

    const rejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) =>
        expectRejected(() =>
          tx`select app.record_reserved_matter_decision(${matterId}, 'approve', 'self vote')`,
        ),
    )
    expect(rejection.code).toBe('42501')
    expect(rejection.message).toContain('Pengusul Reserved Matter')
  })

  it('requires independent conflict review and enforces confirmed-conflict recusal', async () => {
    const f = requireFixtures()
    const ruleId = await createRule()
    await activateRule(ruleId)
    const matterId = await createSubmittedMatter(ruleId)

    const disclosureRows = await asCommitted(
      { kind: 'authenticated', userId: f.managerAdmin.userId },
      (tx) => tx<{ id: string }[]>`
        select app.disclose_reserved_matter_conflict(
          ${matterId},
          'potential',
          'Manager has a potential related-party interest.'
        ) as id
      `,
    )
    const disclosureId = disclosureRows[0]?.id
    if (!disclosureId) throw new Error('Failed to create conflict disclosure.')
    createdDisclosureIds.push(disclosureId)

    const selfReview = await as(
      { kind: 'authenticated', userId: f.managerAdmin.userId },
      (tx) =>
        expectRejected(() =>
          tx`select app.resolve_reserved_matter_conflict(${disclosureId}, 'cleared', 'self review')`,
        ),
    )
    // The manager role intentionally has no conflicts.resolve permission. Even
    // if it did, the RPC also independently prohibits self-review.
    expect(selfReview.code).toBe('42501')

    await asCommitted({ kind: 'authenticated', userId: f.superAdmin.userId }, (tx) =>
      tx`select app.resolve_reserved_matter_conflict(
        ${disclosureId},
        'confirmed',
        'Independent review confirms conflict; administrator is recused.'
      )`,
    )

    const [disclosure] = await db()<{
      status: string
      restriction: string
      reviewed_by: string | null
    }[]>`
      select status, restriction, reviewed_by
      from public.conflict_disclosures
      where id = ${disclosureId}
    `
    expect(disclosure).toMatchObject({
      status: 'confirmed',
      restriction: 'recused',
      reviewed_by: f.superAdmin.userId,
    })

    const [abstention] = await db()<{ id: string; decision: string }[]>`
      select id, decision
      from public.reserved_matter_decisions
      where reserved_matter_id = ${matterId}
        and admin_id = ${f.managerAdmin.userId}
    `
    expect(abstention?.decision).toBe('abstain')
    if (abstention) createdDecisionIds.push(abstention.id)

    const recusedDecision = await as(
      { kind: 'authenticated', userId: f.managerAdmin.userId },
      (tx) =>
        expectRejected(() =>
          tx`select app.record_reserved_matter_decision(${matterId}, 'approve', 'must be blocked')`,
        ),
    )
    expect(recusedDecision.code).toBe('42501')
  })

  it('approves only after quorum/threshold and exposes one consumable authorization', async () => {
    const f = requireFixtures()
    const action = `governance_test.execute_${randomUUID().replaceAll('-', '').slice(0, 10)}`
    const subjectId = randomUUID()
    const ruleId = await createRule({ action, quorum: 1, approvals: 1, ratio: 100 })
    await activateRule(ruleId)
    const matterId = await createSubmittedMatter(ruleId, subjectId)

    const beforeDecision = await expectRejected(() =>
      db()`select app.require_reserved_matter_authorization(${action}, 'integration_subject', ${subjectId})`,
    )
    expect(beforeDecision.code).toBe('55000')

    const decisions = await asCommitted(
      { kind: 'authenticated', userId: f.managerAdmin.userId },
      (tx) => tx<{ id: string }[]>`
        select app.record_reserved_matter_decision(${matterId}, 'approve', 'Independent approval') as id
      `,
    )
    const decisionId = decisions[0]?.id
    if (!decisionId) throw new Error('Failed to record governance decision.')
    createdDecisionIds.push(decisionId)

    await asCommitted({ kind: 'authenticated', userId: f.managerAdmin.userId }, (tx) =>
      tx`select app.finalise_reserved_matter(${matterId}, 'approved', 'Threshold met')`,
    )

    const [authorization] = await db()<{ id: string }[]>`
      select app.require_reserved_matter_authorization(
        ${action}, 'integration_subject', ${subjectId}
      ) as id
    `
    expect(authorization?.id).toBe(matterId)
  })

  it('keeps decision evidence append-only through privilege and trigger defense-in-depth', async () => {
    const f = requireFixtures()
    const decisionId = createdDecisionIds.find(Boolean)
    if (!decisionId) throw new Error('No decision fixture is available for immutability test.')

    const [privileges] = await db()<{
      can_update: boolean
      can_delete: boolean
    }[]>`
      select
        has_table_privilege(
          'authenticated',
          'public.reserved_matter_decisions',
          'UPDATE'
        ) as can_update,
        has_table_privilege(
          'authenticated',
          'public.reserved_matter_decisions',
          'DELETE'
        ) as can_delete
    `
    expect(privileges).toEqual({ can_update: false, can_delete: false })

    const [trigger] = await db()<{
      enabled: string
    }[]>`
      select t.tgenabled as enabled
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_class c on c.oid = t.tgrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'reserved_matter_decisions'
        and t.tgname = 'reserved_matter_decisions_append_only'
        and not t.tgisinternal
    `
    expect(trigger?.enabled).toBe('O')

    const updateRejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) =>
        expectRejected(() =>
          tx`update public.reserved_matter_decisions set rationale = 'rewritten' where id = ${decisionId}`,
        ),
    )
    expect(updateRejection.code).toBe('42501')

    const deleteRejection = await as(
      { kind: 'authenticated', userId: f.superAdmin.userId },
      (tx) =>
        expectRejected(() =>
          tx`delete from public.reserved_matter_decisions where id = ${decisionId}`,
        ),
    )
    expect(deleteRejection.code).toBe('42501')
  })
})