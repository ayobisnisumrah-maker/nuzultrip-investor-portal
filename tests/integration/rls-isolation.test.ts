// @vitest-environment node
/**
 * The single most important test suite in this project.
 *
 * It answers one question, from the database's own point of view:
 * **can one investor reach another investor's data?**
 *
 * Every assertion runs against the real schema with the real policies, as the
 * `anon` or `authenticated` role, with the application layer entirely absent.
 *
 * See docs/SECURITY.md §1 and docs/ARCHITECTURE.md §13.
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Sql } from 'postgres'
import { as, asCommitted, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'

let fixtures: Fixtures
let content: Content

type Content = {
  /** Published, visible to all investors. */
  sharedDocumentId: string
  /** Published, restricted, granted to investor A only. */
  restrictedDocumentId: string
  restrictedVersionId: string
  /** Draft — must be invisible to every investor. */
  draftDocumentId: string
  threadAId: string
  messageAId: string
  notificationAId: string
  notificationBId: string
}

async function createContent(sql: Sql, f: Fixtures): Promise<Content> {
  const owner = f.internalAdmin.userId

  async function publishedDocument(
    slug: string,
    visibility: 'investors' | 'restricted',
  ): Promise<{ documentId: string; versionId: string }> {
    const [document] = await sql<{ id: string }[]>`
      insert into public.documents (kind, title, slug, visibility, owner_admin_id)
      values ('investment_proposal', ${slug}, ${slug}, ${visibility}, ${owner})
      returning id
    `
    if (!document) throw new Error('Failed to create the document.')

    const [version] = await sql<{ id: string }[]>`
      insert into public.document_versions (document_id, title, content, created_by)
      values (${document.id}, ${slug}, ${sql.json({ body: 'uji' })}, ${owner})
      returning id
    `
    if (!version) throw new Error('Failed to create the document version.')

    // Walk the real authenticated publication path rather than bypassing the
    // permission-aware lifecycle trigger with the fixture connection.
    await asCommitted({ kind: 'authenticated', userId: f.superAdmin.userId }, async (tx) => {
      for (const status of ['review', 'approved', 'published']) {
        await tx`
            update public.document_versions
            set status = ${status}::public.publication_status
            where id = ${version.id}
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
          set status = 'published', published_version_id = ${version.id}, current_version_id = ${version.id}
          where id = ${document.id}
        `
    })
    return { documentId: document.id, versionId: version.id }
  }

  const shared = await publishedDocument(`proposal-shared-${f.suffix}`, 'investors')
  const restricted = await publishedDocument(`proposal-restricted-${f.suffix}`, 'restricted')

  await sql`
    insert into public.document_access_grants (document_id, investor_id, granted_by)
    values (${restricted.documentId}, ${f.investorA.userId}, ${owner})
  `

  const [draft] = await sql<{ id: string }[]>`
    insert into public.documents (kind, title, slug, visibility, owner_admin_id)
    values ('pitch_deck', ${`deck-draft-${f.suffix}`}, ${`deck-draft-${f.suffix}`}, 'investors', ${owner})
    returning id
  `
  if (!draft) throw new Error('Failed to create the draft document.')

  // A private thread between investor A and an admin.
  const [thread] = await sql<{ id: string }[]>`
    insert into public.message_threads (subject, thread_kind, investor_id, created_by)
    values (${`Percakapan A ${f.suffix}`}, 'investor_admin', ${f.investorA.userId}, ${owner})
    returning id
  `
  if (!thread) throw new Error('Failed to create the thread.')

  await sql`
    insert into public.thread_participants (thread_id, user_id, role) values
      (${thread.id}, ${f.investorA.userId}, 'investor'),
      (${thread.id}, ${owner}, 'admin')
  `

  const [message] = await sql<{ id: string }[]>`
    insert into public.messages (thread_id, sender_id, body_text)
    values (${thread.id}, ${owner}, 'Isi pesan rahasia untuk investor A.')
    returning id
  `
  if (!message) throw new Error('Failed to create the message.')

  const [notificationA] = await sql<{ id: string }[]>`
    insert into public.notifications (recipient_id, kind, title)
    values (${f.investorA.userId}, 'message_received', 'Pesan baru untuk A')
    returning id
  `
  const [notificationB] = await sql<{ id: string }[]>`
    insert into public.notifications (recipient_id, kind, title)
    values (${f.investorB.userId}, 'message_received', 'Pesan baru untuk B')
    returning id
  `
  if (!notificationA || !notificationB) throw new Error('Failed to create notifications.')

  return {
    sharedDocumentId: shared.documentId,
    restrictedDocumentId: restricted.documentId,
    restrictedVersionId: restricted.versionId,
    draftDocumentId: draft.id,
    threadAId: thread.id,
    messageAId: message.id,
    notificationAId: notificationA.id,
    notificationBId: notificationB.id,
  }
}

beforeAll(async () => {
  fixtures = await createFixtures()
  content = await createContent(db(), fixtures)
}, 60_000)

afterAll(async () => {
  // Published versions are immutable by trigger, so teardown suspends user
  // triggers rather than working around the rule the tests just proved.
  await cleanup(async (tx) => {
    await tx`delete from public.documents where slug like ${`%${fixtures.suffix}`}`
    await tx`delete from public.message_threads where id = ${content.threadAId}`
  })
  await destroyFixtures(fixtures)
  await closeDb()
})

/* ========================================================================== */

describe('investor ↔ investor isolation', () => {
  it('lets an investor read their own record', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx`select id, reference_code from public.investors`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!['id']).toBe(fixtures.investorA.userId)
  })

  it('returns zero rows — not an error — when reaching for another investor', async () => {
    // A policy hides rows; it does not raise. An error would itself leak the
    // fact that the row exists.
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx`select id from public.investors where id = ${fixtures.investorB.userId}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('hides another investor’s user account', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx`select id from public.user_accounts where id = ${fixtures.investorB.userId}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('hides another investor’s status history', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) =>
        tx`select id from public.investor_status_history where investor_id = ${fixtures.investorB.userId}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('shows an investor their own status history', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) =>
        tx<
          { to_status: string }[]
        >`select to_status from public.investor_status_history order by created_at`,
    )
    expect(rows.map((row) => row['to_status'])).toEqual([
      'prospective',
      'submitted',
      'under_review',
      'approved',
      'active',
    ])
  })

  it('hides another investor’s notifications', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx`select id from public.notifications`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!['id']).toBe(content.notificationAId)
  })

  it('hides a thread the investor does not participate in', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      (tx) => tx`select id from public.message_threads`,
    )
    expect(rows).toHaveLength(0)
  })

  it('hides messages in a thread the investor does not participate in', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      (tx) => tx`select id, body_text from public.messages`,
    )
    expect(rows).toHaveLength(0)
  })

  it('lets a participant read their own thread', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx`select id from public.messages`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!['id']).toBe(content.messageAId)
  })

  it('refuses to let an investor post into someone else’s thread', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.investorB.userId },
        (tx) =>
          tx`
          insert into public.messages (thread_id, sender_id, body_text)
          values (${content.threadAId}, ${fixtures.investorB.userId}, 'Menyusup')
        `,
      ),
    )
    expect(error.code).toBe('42501')
  })

  it('refuses to let an investor mark another investor’s notification as read', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) =>
        tx`update public.notifications set read_at = now() where id = ${content.notificationBId} returning id`,
    )
    // The row is invisible, so the UPDATE matches nothing rather than raising.
    expect(rows).toHaveLength(0)
  })
})

/* ========================================================================== */

describe('document visibility', () => {
  it('shows an investor a document published to all investors', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      (tx) => tx`select id from public.documents where id = ${content.sharedDocumentId}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('shows a restricted document only to the investor it was granted to', async () => {
    const granted = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx`select id from public.documents where id = ${content.restrictedDocumentId}`,
    )
    expect(granted).toHaveLength(1)

    const notGranted = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      (tx) => tx`select id from public.documents where id = ${content.restrictedDocumentId}`,
    )
    expect(notGranted).toHaveLength(0)
  })

  it('hides the version rows of a restricted document from an investor without a grant', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      (tx) =>
        tx`select id, content from public.document_versions where id = ${content.restrictedVersionId}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('hides draft documents from every investor', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      (tx) => tx`select id from public.documents where id = ${content.draftDocumentId}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('hides another investor’s access grants', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorB.userId },
      (tx) => tx`select id from public.document_access_grants`,
    )
    expect(rows).toHaveLength(0)
  })

  it('refuses to let an investor grant themselves access', async () => {
    const error = await expectRejected(() =>
      as(
        { kind: 'authenticated', userId: fixtures.investorB.userId },
        (tx) =>
          tx`
          insert into public.document_access_grants (document_id, investor_id)
          values (${content.restrictedDocumentId}, ${fixtures.investorB.userId})
        `,
      ),
    )
    expect(error.code).toBe('42501')
  })
})

/* ========================================================================== */

describe('investor status gates data access', () => {
  it('gives a submitted applicant no document access', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorPending.userId },
      (tx) => tx`select id from public.documents`,
    )
    expect(rows).toHaveLength(0)
  })

  it('still lets a submitted applicant see their own application', async () => {
    // They must be able to see where they stand; that is not a data leak.
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorPending.userId },
      (tx) => tx`select status from public.investors`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!['status']).toBe('submitted')
  })

  it('revokes document access when an investor is deactivated', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorInactive.userId },
      (tx) => tx`select id from public.documents`,
    )
    expect(rows).toHaveLength(0)
  })

  it('revokes financial access when an investor is deactivated', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.investorInactive.userId },
      (tx) => tx`select id from public.financial_reports`,
    )
    expect(rows).toHaveLength(0)
  })
})

/* ========================================================================== */

describe('the anonymous role', () => {
  /**
   * The allow-list is asserted by enumeration rather than by naming tables one
   * at a time: a table added in future is denied unless someone deliberately
   * adds it here *and* writes a policy for it.
   */
  const ANON_READABLE = new Set([
    'portal_pages',
    'portal_sections',
    'portal_section_versions',
    'portal_navigation',
    'portal_theme',
    'site_settings',
    'documents',
    'document_versions',
    'company_profiles',
    'company_profile_versions',
    'media_assets',
  ])

  it('can read only the tables on the allow-list', async () => {
    const tables = await db()<{ relname: string }[]>`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `

    const readable: string[] = []
    for (const { relname } of tables) {
      const allowed = await as({ kind: 'anon' }, async (tx) => {
        try {
          await tx.unsafe(`select 1 from public.${relname} limit 1`)
          return true
        } catch {
          return false
        }
      })
      if (allowed) readable.push(relname)
    }

    expect([...readable].sort()).toEqual([...ANON_READABLE].sort())
  })

  it('sees no investor, financial, message or audit data', async () => {
    for (const table of [
      'investors',
      'investor_status_history',
      'user_accounts',
      'admins',
      'roles',
      'role_permissions',
      'permissions',
      'financial_reports',
      'financial_report_versions',
      'financial_line_items',
      'financial_kpis',
      'financial_periods',
      'messages',
      'message_threads',
      'thread_participants',
      'notifications',
      'audit_logs',
      'portal_inquiries',
      'broadcasts',
    ]) {
      const allowed = await as({ kind: 'anon' }, async (tx) => {
        try {
          await tx.unsafe(`select 1 from public.${table} limit 1`)
          return true
        } catch {
          return false
        }
      })
      expect(allowed, `anon can read public.${table}`).toBe(false)
    }
  })

  it('sees only published portal content', async () => {
    // The seeded home page is a draft, so nothing is published yet.
    const rows = await as(
      { kind: 'anon' },
      (tx) => tx`select slug, status from public.portal_pages`,
    )
    expect(rows.every((row) => row['status'] === 'published')).toBe(true)
  })

  it('sees a public document but not an investor-only one', async () => {
    const rows = await as(
      { kind: 'anon' },
      (tx) => tx<{ id: string }[]>`select id from public.documents`,
    )
    const ids = rows.map((row) => row['id'])
    expect(ids).not.toContain(content.sharedDocumentId)
    expect(ids).not.toContain(content.restrictedDocumentId)
  })

  it('may submit an inquiry', async () => {
    const result = await as(
      { kind: 'anon' },
      (tx) =>
        tx`
        insert into public.portal_inquiries (name, email, message)
        values ('Calon Investor', ${`anon.${randomUUID().slice(0, 8)}@example.test`}, 'Saya tertarik.')
      `,
    )
    expect(result.count).toBe(1)
  })

  it('cannot read an inquiry back, even its own, even via RETURNING', async () => {
    // `anon` holds INSERT but not SELECT, so a RETURNING clause is refused at
    // the privilege layer before RLS is even consulted. The server therefore
    // never uses RETURNING on this table.
    const error = await expectRejected(() =>
      as(
        { kind: 'anon' },
        (tx) =>
          tx`
          insert into public.portal_inquiries (name, email, message)
          values ('Calon Investor', ${`anon.${randomUUID().slice(0, 8)}@example.test`}, 'Saya tertarik.')
          returning id
        `,
      ),
    )
    expect(error.code).toBe('42501')

    const readBack = await as({ kind: 'anon' }, async (tx) => {
      try {
        return await tx`select id from public.portal_inquiries`
      } catch {
        return []
      }
    })
    expect(readBack).toHaveLength(0)
  })
})

/* ========================================================================== */

describe('admin authorisation is granular', () => {
  it('lets an admin holding investors.view read every investor', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.viewerAdmin.userId },
      (tx) =>
        tx`select id from public.investors where id in (${fixtures.investorA.userId}, ${fixtures.investorB.userId})`,
    )
    expect(rows).toHaveLength(2)
  })

  it('does not let that same admin read documents — a different permission', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.viewerAdmin.userId },
      (tx) => tx`select id from public.documents where id = ${content.draftDocumentId}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('does not let that same admin read the audit log', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.viewerAdmin.userId },
      (tx) => tx`select id from public.audit_logs`,
    )
    expect(rows).toHaveLength(0)
  })

  it('does not let that same admin change an investor', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.viewerAdmin.userId },
      (tx) =>
        tx`update public.investors set city = 'Jakarta' where id = ${fixtures.investorA.userId} returning id`,
    )
    expect(rows).toHaveLength(0)
  })

  it('lets an internal admin read documents', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.internalAdmin.userId },
      (tx) => tx`select id from public.documents where id = ${content.draftDocumentId}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('gives a super admin every permission without any role_permissions rows', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      (tx) =>
        tx`
        select app.has_permission('settings.update') as settings,
               app.has_permission('investors.delete') as delete_investor,
               app.has_permission('audit_logs.export') as export_audit
      `,
    )
    expect(rows[0]).toMatchObject({ settings: true, delete_investor: true, export_audit: true })

    const grants = await db()`
      select count(*)::int as count
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      where r.key = 'super_admin'
    `
    expect(grants[0]!['count']).toBe(0)
  })

  it('denies an internal admin the permissions that are Super Admin only', async () => {
    const rows = await as(
      { kind: 'authenticated', userId: fixtures.internalAdmin.userId },
      (tx) =>
        tx`
        select app.has_permission('settings.update') as settings,
               app.has_permission('roles.assign') as assign_role,
               app.has_permission('admins.create') as create_admin,
               app.has_permission('documents.publish') as publish
      `,
    )
    expect(rows[0]).toMatchObject({
      settings: false,
      assign_role: false,
      create_admin: false,
      publish: true,
    })
  })
})
