/**
 * Committed fixtures for the RLS suite.
 *
 * Created once per file with the privileged connection, and removed afterwards.
 * Assertions themselves always run inside a rolled-back transaction (`as()`),
 * so no test can affect another.
 *
 * Every identifier is namespaced with a per-run suffix so parallel test files
 * never collide.
 */
import { randomUUID } from 'node:crypto'
import type { Sql } from 'postgres'
import { cleanup, db } from './db'

export type Fixtures = {
  suffix: string
  superAdmin: { userId: string; email: string }
  internalAdmin: { userId: string; email: string }
  /** Holds a custom role with a single permission: investors.view. */
  viewerAdmin: { userId: string; email: string; roleId: string }
  /**
   * Holds a custom role that *can* manage staff (admins.update, roles.assign)
   * but is not a Super Admin — the shape of caller the escalation guards exist
   * to constrain.
   */
  managerAdmin: { userId: string; email: string; roleId: string }
  /** Active — full data access. */
  investorA: { userId: string; email: string; referenceCode: string }
  /** Active — must never see investor A's data. */
  investorB: { userId: string; email: string; referenceCode: string }
  /** Submitted — signed in, but not yet granted data access. */
  investorPending: { userId: string; email: string }
  /** Approved but then deactivated. */
  investorInactive: { userId: string; email: string }
}

async function createAuthUser(sql: Sql, email: string): Promise<string> {
  const id = randomUUID()
  await sql`insert into auth.users (id, email) values (${id}, ${email})`
  return id
}

async function createAccount(
  sql: Sql,
  email: string,
  fullName: string,
  accountType: 'admin' | 'investor',
): Promise<string> {
  const userId = await createAuthUser(sql, email)
  await sql`
    insert into public.user_accounts (id, account_type, email, full_name)
    values (${userId}, ${accountType}, ${email}, ${fullName})
  `
  return userId
}

export async function createFixtures(): Promise<Fixtures> {
  const sql = db()
  const suffix = randomUUID().slice(0, 8)
  const email = (name: string) => `${name}.${suffix}@example.test`

  const [superAdminRole] = await sql<{ id: string }[]>`
    select id from public.roles where key = 'super_admin'
  `
  const [internalRole] = await sql<{ id: string }[]>`
    select id from public.roles where key = 'admin_internal'
  `
  if (!superAdminRole || !internalRole) {
    throw new Error('System roles are missing. Run `pnpm db:reset` first.')
  }

  // A deliberately narrow custom role: proves that permissions are granular and
  // not "admin means everything".
  const [viewerRole] = await sql<{ id: string }[]>`
    insert into public.roles (key, name, description)
    values (${`viewer_${suffix}`}, 'Peninjau', 'Hanya dapat melihat investor.')
    returning id
  `
  if (!viewerRole) throw new Error('Failed to create the viewer role.')

  await sql`
    insert into public.role_permissions (role_id, permission_id)
    select ${viewerRole.id}, p.id from public.permissions p where p.key = 'investors.view'
  `

  const [managerRole] = await sql<{ id: string }[]>`
    insert into public.roles (key, name, description)
    values (${`manager_${suffix}`}, 'Manajer', 'Dapat mengelola administrator, tetapi bukan Super Admin.')
    returning id
  `
  if (!managerRole) throw new Error('Failed to create the manager role.')

  await sql`
    insert into public.role_permissions (role_id, permission_id)
    select ${managerRole.id}, p.id
    from public.permissions p
    where p.key in ('investors.view', 'admins.view', 'admins.update', 'roles.view', 'roles.assign')
  `

  const superAdminId = await createAccount(sql, email('super'), 'Super Admin Uji', 'admin')
  await sql`insert into public.admins (id, role_id) values (${superAdminId}, ${superAdminRole.id})`

  const internalAdminId = await createAccount(sql, email('internal'), 'Admin Internal Uji', 'admin')
  await sql`insert into public.admins (id, role_id) values (${internalAdminId}, ${internalRole.id})`

  const viewerAdminId = await createAccount(sql, email('viewer'), 'Peninjau Uji', 'admin')
  await sql`insert into public.admins (id, role_id) values (${viewerAdminId}, ${viewerRole.id})`

  const managerAdminId = await createAccount(sql, email('manager'), 'Manajer Uji', 'admin')
  await sql`insert into public.admins (id, role_id) values (${managerAdminId}, ${managerRole.id})`

  const investorA = await createInvestor(sql, email('investor-a'), 'Investor A Uji', 'active')
  const investorB = await createInvestor(sql, email('investor-b'), 'Investor B Uji', 'active')
  const investorPending = await createInvestor(
    sql,
    email('investor-pending'),
    'Investor Menunggu',
    'submitted',
  )
  const investorInactive = await createInvestor(
    sql,
    email('investor-inactive'),
    'Investor Nonaktif',
    'inactive',
  )

  return {
    suffix,
    superAdmin: { userId: superAdminId, email: email('super') },
    internalAdmin: { userId: internalAdminId, email: email('internal') },
    viewerAdmin: { userId: viewerAdminId, email: email('viewer'), roleId: viewerRole.id },
    managerAdmin: { userId: managerAdminId, email: email('manager'), roleId: managerRole.id },
    investorA,
    investorB,
    investorPending: { userId: investorPending.userId, email: investorPending.email },
    investorInactive: { userId: investorInactive.userId, email: investorInactive.email },
  }
}

/**
 * Walks the investor through the real lifecycle rather than inserting a final
 * status directly, so the fixtures themselves prove the transition rules accept
 * a legitimate path.
 */
async function createInvestor(
  sql: Sql,
  email: string,
  legalName: string,
  target: 'submitted' | 'active' | 'inactive',
): Promise<{ userId: string; email: string; referenceCode: string }> {
  const userId = await createAccount(sql, email, legalName, 'investor')
  const [row] = await sql<{ reference_code: string }[]>`
    insert into public.investors (id, legal_name)
    values (${userId}, ${legalName})
    returning reference_code
  `
  if (!row) throw new Error('Failed to create the investor.')

  const path: Record<typeof target, string[]> = {
    submitted: ['submitted'],
    active: ['submitted', 'under_review', 'approved', 'active'],
    inactive: ['submitted', 'under_review', 'approved', 'active', 'inactive'],
  }

  for (const status of path[target]) {
    await sql`update public.investors set status = ${status}::public.investor_status where id = ${userId}`
  }

  return { userId, email, referenceCode: row.reference_code }
}

export async function destroyFixtures(fixtures: Fixtures): Promise<void> {
  const ids = [
    fixtures.superAdmin.userId,
    fixtures.internalAdmin.userId,
    fixtures.viewerAdmin.userId,
    fixtures.managerAdmin.userId,
    fixtures.investorA.userId,
    fixtures.investorB.userId,
    fixtures.investorPending.userId,
    fixtures.investorInactive.userId,
  ]

  // Teardown suspends user triggers rather than working around the rules the
  // tests just proved. The fixture Super Admin is the only one in a fresh
  // database, so the lockout guard would otherwise (correctly) refuse to remove
  // it — that guard is asserted directly in rls-guards.test.ts.
  await cleanup(async (tx) => {
    await tx`delete from public.admins where id = any(${ids})`
    await tx`delete from auth.users where id = any(${ids})`
    await tx`delete from public.roles where key = any(${[
      `viewer_${fixtures.suffix}`,
      `manager_${fixtures.suffix}`,
    ]})`
  })
}
