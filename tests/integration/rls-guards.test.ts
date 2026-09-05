// @vitest-environment node
/**
 * Guards that the database enforces on its own, independently of the
 * application: privilege escalation, immutability of published artefacts, and
 * lifecycle transition rules.
 *
 * These are the failure modes that matter most (docs/RBAC.md §3), so they are
 * tested where they are actually enforced.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { as, asCommitted, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let ids: {
  superAdminRoleId: string
  internalRoleId: string
  documentId: string
  publishedVersionId: string
  draftVersionId: string
}

beforeAll(async () => {
  fixtures = await createFixtures()
  const sql = db()

  const [superRole] = await sql<
    { id: string }[]
  >`select id from public.roles where key = 'super_admin'`
  const [internalRole] = await sql<
    { id: string }[]
  >`select id from public.roles where key = 'admin_internal'`
  if (!superRole || !internalRole) throw new Error('System roles are missing.')

  const slug = `guard-doc-${fixtures.suffix}`
  const [document] = await sql<{ id: string }[]>`
    insert into public.documents (kind, title, slug, visibility, owner_admin_id)
    values ('investment_proposal', ${slug}, ${slug}, 'investors', ${fixtures.internalAdmin.userId})
    returning id
  `
  if (!document) throw new Error('Failed to create the document.')

  const [published] = await sql<{ id: string }[]>`
    insert into public.document_versions (document_id, title, content, created_by)
    values (${document.id}, 'Versi 1', ${sql.json({ body: 'asli' })}, ${fixtures.internalAdmin.userId})
    returning id
  `
  if (!published) throw new Error('Failed to create the version.')

  await asCommitted({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
    for (const status of ['review', 'approved', 'published']) {
      await tx`
          update public.document_versions set status = ${status}::public.publication_status
          where id = ${published.id}
        `
    }
    for (const status of ['review', 'approved']) {
      await tx`
          update public.documents set status = ${status}::public.publication_status
          where id = ${document.id}
        `
    }
    await tx`
        update public.documents
        set status = 'published', published_version_id = ${published.id}, current_version_id = ${published.id}
        where id = ${document.id}
      `
  })

  const [draft] = await sql<{ id: string }[]>`
    insert into public.document_versions (document_id, title, content, created_by)
    values (${document.id}, 'Versi 2', ${sql.json({ body: 'draf' })}, ${fixtures.internalAdmin.userId})
    returning id
  `
  if (!draft) throw new Error('Failed to create the draft version.')

  ids = {
    superAdminRoleId: superRole.id,
    internalRoleId: internalRole.id,
    documentId: document.id,
    publishedVersionId: published.id,
    draftVersionId: draft.id,
  }
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    await tx`delete from public.documents where id = ${ids.documentId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

/* ========================================================================== */

describe('privilege escalation', () => {
  it('refuses to let an admin grant a permission they do not hold', async () => {
    // The internal admin lacks settings.update, so it cannot hand that to the
    // viewer role even though it can see the role.
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.internalAdmin.userId },
        (tx) =>
          tx`
          insert into public.role_permissions (role_id, permission_id)
          select ${fixtures.viewerAdmin.roleId}, p.id
          from public.permissions p where p.key = 'settings.update'
        `,
      ),
    )
    expect(error.code).toBe('42501')
  })

  it('refuses to let an admin edit the permissions of their own role', async () => {
    // Even a Super Admin cannot self-elevate through their own role. This is
    // the rule that stops "edit my role" being a one-step path to anything.
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.superAdmin.userId },
        (tx) =>
          tx`
          insert into public.role_permissions (role_id, permission_id)
          select ${ids.superAdminRoleId}, p.id from public.permissions p where p.key = 'settings.update'
        `,
      ),
    )
    expect(error.code).toBe('42501')
    expect(error.message).toMatch(/your own role/i)
  })

  it('refuses to let a non-Super-Admin confer the Super Admin role', async () => {
    // The manager holds admins.update and roles.assign. Super Admin has no
    // role_permissions rows at all, so a naive "does the target role hold
    // anything I lack?" comparison would find nothing to object to. It is
    // rejected explicitly instead.
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.managerAdmin.userId },
        (tx) =>
          tx`
          update public.admins set role_id = ${ids.superAdminRoleId}
          where id = ${fixtures.viewerAdmin.userId}
        `,
      ),
    )
    expect(error.code).toBe('42501')
    expect(error.message).toMatch(/Only a Super Admin/i)
  })

  it('refuses to let an admin change their own role', async () => {
    // The manager holds admins.update, so the policy lets the statement through
    // to the row — which is exactly where the self-elevation guard must catch
    // it. Using an admin without that permission would prove nothing, because
    // the policy would have hidden the row first.
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.managerAdmin.userId },
        (tx) =>
          tx`
          update public.admins set role_id = ${ids.superAdminRoleId}
          where id = ${fixtures.managerAdmin.userId}
        `,
      ),
    )
    expect(error.code).toBe('42501')
    expect(error.message).toMatch(/your own role/i)
  })

  it('refuses to let an admin disable their own account', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.superAdmin.userId },
        (tx) =>
          tx`
          update public.admins set is_active = false, disabled_at = now()
          where id = ${fixtures.superAdmin.userId}
        `,
      ),
    )
    expect(error.code).toBe('42501')
    expect(error.message).toMatch(/your own account/i)
  })

  it('refuses to let an admin assign a role holding permissions they lack', async () => {
    // The manager can manage staff, but does not hold documents.* or
    // financial_reports.*, which admin_internal does.
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.managerAdmin.userId },
        (tx) =>
          tx`
          update public.admins set role_id = ${ids.internalRoleId}
          where id = ${fixtures.viewerAdmin.userId}
        `,
      ),
    )
    expect(error.code).toBe('42501')
    expect(error.message).toMatch(/permissions you do not/i)
  })

  it('gives an admin without admins.update no rows to change', async () => {
    // A policy hides the row rather than raising, so the update is a no-op.
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.internalAdmin.userId },
      (tx) =>
        tx`
        update public.admins set title = 'Diubah'
        where id = ${fixtures.viewerAdmin.userId}
        returning id
      `,
    )
    expect(rows).toHaveLength(0)
  })

  it('refuses to disable the last active Super Admin', async () => {
    // Asserted through the privileged connection so the guard, not a policy, is
    // what does the rejecting. The fixture Super Admin is the only one in a
    // freshly reset database.
    const error = await expectRejected(
      () =>
        db()`
        update public.admins set is_active = false, disabled_at = now()
        where id = ${fixtures.superAdmin.userId}
      `,
    )
    expect(error.message).toMatch(/last active Super Admin/i)
  })

  it('refuses to demote the last active Super Admin', async () => {
    const error = await expectRejected(
      () =>
        db()`
        update public.admins set role_id = ${ids.internalRoleId}
        where id = ${fixtures.superAdmin.userId}
      `,
    )
    expect(error.message).toMatch(/last active Super Admin/i)
  })

  it('gives an admin no rows when deleting a system role', async () => {
    // The delete policy excludes system roles, so the row is simply not there
    // to delete.
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      (tx) => tx`delete from public.roles where key = 'admin_internal' returning id`,
    )
    expect(rows).toHaveLength(0)
  })

  it('refuses to delete a system role even with database privileges', async () => {
    const error = await expectRejected(
      () => db()`delete from public.roles where key = 'admin_internal'`,
    )
    expect(error.message).toMatch(/System role .* cannot be deleted/i)
  })

  it('refuses to let an investor read the RBAC tables at all', async () => {
    for (const table of ['roles', 'role_permissions', 'permissions', 'admins']) {
      const rows = await as(
        { kind: 'authenticated', userId: fixtures.investorA.userId },
        async (tx) => {
          try {
            return await tx.unsafe(`select 1 from public.${table} limit 1`)
          } catch {
            return []
          }
        },
      )
      expect(rows, `investor could read public.${table}`).toHaveLength(0)
    }
  })
})

/* ========================================================================== */

describe('published artefacts are immutable', () => {
  it('refuses to change the content of a published version', async () => {
    const error = await expectRejected(
      () =>
        db()`
        update public.document_versions
        set content = ${db().json({ body: 'diubah' })}
        where id = ${ids.publishedVersionId}
      `,
    )
    expect(error.message).toMatch(/published and cannot be modified/i)
  })

  it('refuses to change the title of a published version', async () => {
    const error = await expectRejected(
      () =>
        db()`update public.document_versions set title = 'Judul lain' where id = ${ids.publishedVersionId}`,
    )
    expect(error.message).toMatch(/published and cannot be modified/i)
  })

  it('refuses to delete a published version', async () => {
    const error = await expectRejected(
      () => db()`delete from public.document_versions where id = ${ids.publishedVersionId}`,
    )
    expect(error.message).toMatch(/cannot be deleted/i)
  })

  it('still permits the database to null an author reference', async () => {
    // Removing a staff account must not be blocked by immutability, and must not
    // erase the version. This is the one change a published row accepts.
    const rows = await db()`
      update public.document_versions set created_by = null
      where id = ${ids.publishedVersionId}
      returning id, title
    `
    expect(rows).toHaveLength(1)

    // Restore, so the rest of the suite sees the original state.
    await db()`
      update public.document_versions set created_by = ${fixtures.internalAdmin.userId}
      where id = ${ids.publishedVersionId}
    `.catch(async () => {
      // Setting it back to a non-null value is itself a content change and is
      // correctly refused; that is the expected outcome.
      await cleanup(async (tx) => {
        await tx`
          update public.document_versions set created_by = ${fixtures.internalAdmin.userId}
          where id = ${ids.publishedVersionId}
        `
      })
    })
  })

  it('permits editing a draft version of the same document', async () => {
    const rows = await db()`
      update public.document_versions set title = 'Versi 2 diperbarui'
      where id = ${ids.draftVersionId}
      returning id
    `
    expect(rows).toHaveLength(1)
  })

  it('assigns sequential version numbers automatically', async () => {
    const rows = await db()<{ version_number: number }[]>`
      select version_number from public.document_versions
      where document_id = ${ids.documentId} order by version_number
    `
    expect(rows.map((row) => Number(row['version_number']))).toEqual([1, 2])
  })

  it('refuses to skip the review and approval steps', async () => {
    const error = await expectRejected(
      () =>
        db()`
        update public.document_versions set status = 'published'
        where id = ${ids.draftVersionId}
      `,
    )
    expect(error.message).toMatch(/cannot move from draft to published/i)
  })
})

/* ========================================================================== */

describe('append-only tables', () => {
  it('refuses to update an audit record', async () => {
    const sql = db()
    const [row] = await sql<{ id: string }[]>`
      insert into public.audit_logs (actor_type, action, entity_type, summary)
      values ('system', 'test.write', 'test', 'uji')
      returning id
    `
    if (!row) throw new Error('Failed to insert the audit record.')

    const updateError = await expectRejected(
      () => sql`update public.audit_logs set summary = 'diubah' where id = ${row.id}`,
    )
    expect(updateError.message).toMatch(/append-only/i)

    const deleteError = await expectRejected(
      () => sql`delete from public.audit_logs where id = ${row.id}`,
    )
    expect(deleteError.message).toMatch(/append-only/i)

    await cleanup(async (tx) => {
      await tx`delete from public.audit_logs where id = ${row.id}`
    })
  })

  it('refuses to rewrite investor status history', async () => {
    const sql = db()
    const [row] = await sql<{ id: string }[]>`
      select id from public.investor_status_history
      where investor_id = ${fixtures.investorA.userId} limit 1
    `
    if (!row) throw new Error('Expected status history to exist.')

    const error = await expectRejected(
      () =>
        sql`update public.investor_status_history set to_status = 'active' where id = ${row.id}`,
    )
    expect(error.message).toMatch(/append-only/i)
  })

  it('refuses to let an admin forge an audit actor', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.internalAdmin.userId },
        (tx) =>
          tx`
          insert into public.audit_logs (actor_id, actor_type, action, entity_type)
          values (${fixtures.superAdmin.userId}, 'admin', 'investor.approve', 'investor')
        `,
      ),
    )
    expect(error.code).toBe('42501')
  })
})

/* ========================================================================== */

describe('investor lifecycle enforcement', () => {
  const illegal: ReadonlyArray<readonly [string, string]> = [
    ['prospective', 'approved'],
    ['prospective', 'active'],
    ['submitted', 'active'],
    ['under_review', 'active'],
    ['rejected', 'active'],
    ['active', 'approved'],
  ]

  it.each(illegal)('refuses %s → %s', async (from, to) => {
    const sql = db()
    // Force the starting status with triggers suspended — the point of the test
    // is the transition that follows, not how the row got there. A rejected
    // record also needs a reason to satisfy its check constraint.
    await cleanup(async (tx) => {
      await tx`
        update public.investors
        set status = ${from}::public.investor_status,
            rejection_reason = case when ${from} = 'rejected' then 'Uji' else rejection_reason end
        where id = ${fixtures.investorPending.userId}
      `
    })

    const error = await expectRejected(
      () =>
        sql`update public.investors set status = ${to}::public.investor_status where id = ${fixtures.investorPending.userId}`,
    )
    expect(error.message).toMatch(/cannot move from/i)
  })

  it('records every legal transition in history', async () => {
    const rows = await db()<{ from_status: string | null; to_status: string }[]>`
      select from_status, to_status from public.investor_status_history
      where investor_id = ${fixtures.investorB.userId}
      order by created_at
    `
    expect(rows.map((row) => row['to_status'])).toEqual([
      'prospective',
      'submitted',
      'under_review',
      'approved',
      'active',
    ])
    expect(rows[0]!['from_status']).toBeNull()
  })

  it('refuses a rejection without a reason', async () => {
    const sql = db()
    await cleanup(async (tx) => {
      await tx`
        update public.investors
        set status = 'under_review'::public.investor_status, rejection_reason = null
        where id = ${fixtures.investorPending.userId}
      `
    })

    const error = await expectRejected(
      () =>
        sql`update public.investors set status = 'rejected'::public.investor_status where id = ${fixtures.investorPending.userId}`,
    )
    expect(error.code).toBe('23514')
  })
})

/* ========================================================================== */

describe('financial provenance and figures', () => {
  it('requires a provenance value on every report version', async () => {
    const sql = db()
    const [period] = await sql<{ id: string }[]>`
      insert into public.financial_periods (period_type, fiscal_year, period_index, starts_on, ends_on)
      values ('quarterly', 2150, 1, '2150-01-01', '2150-03-31')
      returning id
    `
    if (!period) throw new Error('Failed to create the period.')

    const [report] = await sql<{ id: string }[]>`
      insert into public.financial_reports (financial_period_id, title)
      values (${period.id}, 'Uji provenance')
      returning id
    `
    if (!report) throw new Error('Failed to create the report.')

    const error = await expectRejected(
      () =>
        sql`insert into public.financial_report_versions (financial_report_id) values (${report.id})`,
    )
    // NOT NULL violation on `source`.
    expect(error.code).toBe('23502')

    await cleanup(async (tx) => {
      await tx`delete from public.financial_periods where id = ${period.id}`
    })
  })

  it('refuses a line item whose category does not belong to its statement', async () => {
    const sql = db()
    const [period] = await sql<{ id: string }[]>`
      insert into public.financial_periods (period_type, fiscal_year, period_index, starts_on, ends_on)
      values ('quarterly', 2150, 2, '2150-04-01', '2150-06-30')
      returning id
    `
    if (!period) throw new Error('Failed to create the period.')

    const [report] = await sql<{ id: string }[]>`
      insert into public.financial_reports (financial_period_id, title)
      values (${period.id}, 'Uji kategori')
      returning id
    `
    const [version] = await sql<{ id: string }[]>`
      insert into public.financial_report_versions (financial_report_id, source)
      values (${report!.id}, 'internal')
      returning id
    `

    const error = await expectRejected(
      () =>
        sql`
        insert into public.financial_line_items
          (financial_report_version_id, statement, category, line_key, label, amount)
        values (${version!.id}, 'income', 'asset', 'kas', 'Kas', 1000)
      `,
    )
    expect(error.code).toBe('23514')

    await cleanup(async (tx) => {
      await tx`delete from public.financial_periods where id = ${period.id}`
    })
  })

  it('refuses a period index that does not match its period type', async () => {
    const error = await expectRejected(
      () =>
        db()`
        insert into public.financial_periods (period_type, fiscal_year, period_index, starts_on, ends_on)
        values ('quarterly', 2150, 7, '2150-01-01', '2150-03-31')
      `,
    )
    expect(error.code).toBe('23514')
  })
})
