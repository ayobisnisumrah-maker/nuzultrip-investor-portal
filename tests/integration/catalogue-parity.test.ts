// @vitest-environment node
/**
 * Keeps the TypeScript domain vocabulary and the database in agreement.
 *
 * Several rules are deliberately expressed twice — once in `src/core` for the
 * application, once in SQL so the database enforces them even if the
 * application is wrong. Duplication is the point; drift is the danger. These
 * tests compare the two against the *live database*, which is stronger than
 * parsing the migration text.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { closeDb, db } from './helpers/db'
import {
  ADMIN_INTERNAL_EXCLUSIONS,
  DANGEROUS_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_KEYS,
  SYSTEM_ROLE_KEYS,
  adminInternalPermissions,
  permissionKey,
} from '@/core/rbac/permissions'
import { INVESTOR_STATUSES, canTransition, type InvestorStatus } from '@/core/investors/status'
import {
  PUBLICATION_STATUSES,
  canPublicationTransition,
  VISIBILITIES,
  type PublicationStatus,
} from '@/core/documents/publication'
import { FINANCIAL_SOURCES, PERIOD_TYPES } from '@/core/financials/provenance'

afterAll(async () => {
  await closeDb()
})

describe('permission catalogue', () => {
  it('contains exactly the permissions defined in TypeScript', async () => {
    const rows = await db()<{ key: string }[]>`select key from public.permissions order by key`
    expect(rows.map((row) => row['key'])).toEqual([...PERMISSION_KEYS].sort())
  })

  it('agrees on every description and danger flag', async () => {
    const rows = await db()<
      { key: string; module: string; action: string; description: string; is_dangerous: boolean }[]
    >`select key, module, action, description, is_dangerous from public.permissions`

    const byKey = new Map(rows.map((row) => [row['key'], row]))

    for (const definition of PERMISSIONS) {
      const key = permissionKey(definition)
      const row = byKey.get(key)
      expect(row, `${key} is missing from the database`).toBeDefined()
      expect(row!['module']).toBe(definition.module)
      expect(row!['action']).toBe(definition.action)
      expect(row!['description']).toBe(definition.description)
      expect(row!['is_dangerous']).toBe('dangerous' in definition)
    }
  })

  it('marks the same permissions dangerous on both sides', async () => {
    const rows = await db()<{ key: string }[]>`
      select key from public.permissions where is_dangerous order by key
    `
    expect(rows.map((row) => row['key'])).toEqual([...DANGEROUS_PERMISSIONS].sort())
  })

  it('has no permission key that breaks the module.action shape', () => {
    for (const key of PERMISSION_KEYS) {
      expect(key, key).toMatch(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/)
    }
  })

  it('has no duplicate keys', () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length)
  })
})

describe('system roles', () => {
  it('seeds exactly the system roles TypeScript knows about', async () => {
    const rows = await db()<{ key: string }[]>`
      select key from public.roles where is_system order by key
    `
    expect(rows.map((row) => row['key'])).toEqual([...SYSTEM_ROLE_KEYS].sort())
  })

  it('grants Admin Internal exactly the computed permission set', async () => {
    const rows = await db()<{ key: string }[]>`
      select p.key
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      join public.permissions p on p.id = rp.permission_id
      where r.key = 'admin_internal'
      order by p.key
    `
    expect(rows.map((row) => row['key'])).toEqual([...adminInternalPermissions()].sort())
  })

  it('withholds exactly the documented exclusions from Admin Internal', async () => {
    const rows = await db()<{ key: string }[]>`
      select p.key
      from public.permissions p
      where not exists (
        select 1
        from public.role_permissions rp
        join public.roles r on r.id = rp.role_id
        where rp.permission_id = p.id and r.key = 'admin_internal'
      )
      order by p.key
    `
    expect(rows.map((row) => row['key'])).toEqual([...ADMIN_INTERNAL_EXCLUSIONS].sort())
  })

  it('gives Super Admin no explicit grants at all', async () => {
    const [row] = await db()<{ count: number }[]>`
      select count(*)::int as count
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      where r.key = 'super_admin'
    `
    expect(row!['count']).toBe(0)
  })
})

describe('enum parity', () => {
  async function enumValues(name: string): Promise<string[]> {
    const rows = await db()<{ label: string }[]>`
      select e.enumlabel as label
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = ${name}
      order by e.enumsortorder
    `
    return rows.map((row) => row['label'])
  }

  it('investor_status matches src/core/investors/status.ts', async () => {
    expect(await enumValues('investor_status')).toEqual([...INVESTOR_STATUSES])
  })

  it('publication_status matches src/core/documents/publication.ts', async () => {
    expect(await enumValues('publication_status')).toEqual([...PUBLICATION_STATUSES])
  })

  it('visibility matches src/core/documents/publication.ts', async () => {
    expect(await enumValues('visibility')).toEqual([...VISIBILITIES])
  })

  it('financial_source matches src/core/financials/provenance.ts', async () => {
    expect(await enumValues('financial_source')).toEqual([...FINANCIAL_SOURCES])
  })

  it('period_type matches src/core/financials/provenance.ts', async () => {
    expect(await enumValues('period_type')).toEqual([...PERIOD_TYPES])
  })
})

describe('state machine parity', () => {
  it('agrees on every investor transition, in both directions', async () => {
    // All 49 ordered pairs, not just the legal ones — a transition the database
    // permits but TypeScript does not is just as much a bug as the reverse.
    const pairs = INVESTOR_STATUSES.flatMap((from) => INVESTOR_STATUSES.map((to) => ({ from, to })))

    const rows = await db()<{ from_status: string; to_status: string; allowed: boolean }[]>`
      select f.status as from_status, t.status as to_status,
             app.investor_transition_allowed(
               f.status::public.investor_status,
               t.status::public.investor_status
             ) as allowed
      from unnest(${pairs.map((pair) => pair.from)}::text[]) as f(status)
      cross join unnest(${INVESTOR_STATUSES}::text[]) as t(status)
    `

    const disagreements: string[] = []
    for (const row of rows) {
      const from = row['from_status'] as InvestorStatus
      const to = row['to_status'] as InvestorStatus
      const inCode = canTransition(from, to)
      const inDb = row['allowed']
      if (inCode !== inDb) {
        disagreements.push(`${from} → ${to}: code=${inCode} db=${inDb}`)
      }
    }
    expect(disagreements).toEqual([])
  })

  it('agrees on every publication transition, in both directions', async () => {
    const rows = await db()<{ from_status: string; to_status: string; allowed: boolean }[]>`
      select f.status as from_status, t.status as to_status,
             app.publication_transition_allowed(
               f.status::public.publication_status,
               t.status::public.publication_status
             ) as allowed
      from unnest(${PUBLICATION_STATUSES}::text[]) as f(status)
      cross join unnest(${PUBLICATION_STATUSES}::text[]) as t(status)
    `

    const disagreements: string[] = []
    for (const row of rows) {
      const from = row['from_status'] as PublicationStatus
      const to = row['to_status'] as PublicationStatus
      const inCode = canPublicationTransition(from, to)
      const inDb = row['allowed']
      if (inCode !== inDb) {
        disagreements.push(`${from} → ${to}: code=${inCode} db=${inDb}`)
      }
    }
    expect(disagreements).toEqual([])
  })
})

describe('schema hygiene', () => {
  it('has row level security enabled and forced on every public table', async () => {
    const rows = await db()<{ relname: string }[]>`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (not c.relrowsecurity or not c.relforcerowsecurity)
      order by c.relname
    `
    expect(rows.map((row) => row['relname'])).toEqual([])
  })

  it('leaves no table both policy-free and reachable', async () => {
    // A table with no policies is closed, which is correct — but it must be a
    // deliberate choice, so the exceptions are named here.
    const INTENTIONALLY_UNREACHABLE = ['notification_deliveries']

    const rows = await db()<{ relname: string }[]>`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
      order by c.relname
    `
    expect(rows.map((row) => row['relname'])).toEqual(INTENTIONALLY_UNREACHABLE)
  })

  it('indexes every foreign key a policy filters on', async () => {
    // An unindexed policy predicate turns every query into a sequential scan.
    const rows = await db()<{ table_name: string; column_name: string }[]>`
      select cl.relname as table_name, att.attname as column_name
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join lateral unnest(con.conkey) as k(attnum) on true
      join pg_attribute att on att.attrelid = cl.oid and att.attnum = k.attnum
      where con.contype = 'f'
        and n.nspname = 'public'
        and array_length(con.conkey, 1) = 1
        and not exists (
          select 1 from pg_index i
          where i.indrelid = cl.oid and i.indkey[0] = k.attnum
        )
      order by 1, 2
    `

    // Columns that are genuinely not used as a lookup path. Each is listed
    // deliberately rather than the assertion being weakened.
    const ACCEPTED = new Set([
      'company_profiles.current_version_id',
      'company_profiles.published_version_id',
      'company_profile_versions.approved_by',
      'company_profile_versions.created_by',
      'documents.current_version_id',
      'document_versions.approved_by',
      'document_versions.created_by',
      'document_access_grants.granted_by',
      'document_access_grants.revoked_by',
      'financial_reports.current_version_id',
      'financial_reports.published_version_id',
      'financial_reports.owner_admin_id',
      'financial_report_versions.approved_by',
      'financial_report_versions.created_by',
      'financial_report_versions.document_asset_id',
      'investors.reviewed_by',
      'message_threads.broadcast_id',
      'message_threads.closed_by',
      'message_threads.created_by',
      'message_attachments.media_asset_id',
      'broadcasts.created_by',
      'portal_inquiries.converted_investor_id',
      'portal_inquiries.handled_by',
      'portal_inquiries.thread_id',
      'portal_sections.current_version_id',
      'portal_sections.published_version_id',
      'portal_section_versions.approved_by',
      'portal_section_versions.created_by',
      'portal_theme.favicon_asset_id',
      'portal_theme.logo_asset_id',
      'portal_theme.logo_dark_asset_id',
      'portal_theme.og_image_asset_id',
      'site_settings.updated_by',
      'admins.created_by',
      'audit_logs.actor_id',
      'notifications.recipient_id',
    ])

    const unindexed = rows
      .map((row) => `${row['table_name']}.${row['column_name']}`)
      .filter((name) => !ACCEPTED.has(name))

    expect(unindexed).toEqual([])
  })
})
