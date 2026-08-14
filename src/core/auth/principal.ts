/**
 * The Principal — who is making this request.
 *
 * Deliberately a discriminated union rather than a single "user" object with
 * optional fields. Admins and investors are authorised by fundamentally
 * different mechanisms — role-based permissions versus record ownership — and
 * conflating them is how privilege-escalation bugs get written
 * (docs/RBAC.md §5).
 *
 * Framework-agnostic: this module knows nothing about Next.js or Supabase, so
 * the rules below are testable without a request.
 */
import { z } from 'zod'
import { INVESTOR_STATUSES, grantsDataAccess, type InvestorStatus } from '@/core/investors/status'
import { isPermission, type Permission } from '@/core/rbac/permissions'

export type AnonymousPrincipal = { kind: 'anonymous' }

export type AdminPrincipal = {
  kind: 'admin'
  userId: string
  adminId: string
  roleId: string
  roleKey: string
  roleName: string
  title: string | null
  /** Bumped when the role's permission set changes; drives client refresh. */
  permissionVersion: number
  permissions: ReadonlySet<Permission>
  email: string
  fullName: string
  locale: string
  timezone: string
  avatarPath: string | null
}

export type InvestorPrincipal = {
  kind: 'investor'
  userId: string
  investorId: string
  referenceCode: string
  status: InvestorStatus
  legalName: string
  /** True only while the lifecycle status grants access to investor data. */
  hasDataAccess: boolean
  email: string
  fullName: string
  locale: string
  timezone: string
  avatarPath: string | null
}

export type Principal = AnonymousPrincipal | AdminPrincipal | InvestorPrincipal

export const ANONYMOUS: AnonymousPrincipal = { kind: 'anonymous' }

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The shape returned by `public.current_principal()`.
 *
 * Parsed rather than cast. The database is trusted, but a schema change that
 * silently drops a field should fail loudly here rather than produce a
 * principal with `undefined` permissions that quietly denies everything — or,
 * worse, one whose `hasDataAccess` is `undefined` and therefore falsy in one
 * place and truthy after a `!` somewhere else.
 */
const principalRowSchema = z.object({
  userId: z.uuid(),
  accountType: z.enum(['admin', 'investor']),
  accountStatus: z.enum(['active', 'disabled']),
  email: z.string(),
  fullName: z.string(),
  locale: z.string(),
  timezone: z.string(),
  avatarPath: z.string().nullable(),
  admin: z
    .object({
      adminId: z.uuid(),
      roleId: z.uuid(),
      roleKey: z.string(),
      roleName: z.string(),
      title: z.string().nullable(),
      permissionVersion: z.number().int(),
      permissions: z.array(z.string()),
    })
    .optional(),
  investor: z
    .object({
      investorId: z.uuid(),
      referenceCode: z.string(),
      status: z.enum(INVESTOR_STATUSES),
      investorType: z.enum(['individual', 'institution']),
      legalName: z.string(),
      hasDataAccess: z.boolean(),
    })
    .optional(),
})

export type PrincipalRow = z.infer<typeof principalRowSchema>

export class PrincipalShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrincipalShapeError'
  }
}

export function parsePrincipal(raw: unknown): Principal {
  if (raw === null || raw === undefined) return ANONYMOUS

  const parsed = principalRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw new PrincipalShapeError(
      `current_principal() returned an unexpected shape: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')} ${issue.message}`)
        .join('; ')}`,
    )
  }

  const row = parsed.data
  if (row.accountStatus !== 'active') return ANONYMOUS

  if (row.accountType === 'admin') {
    // A missing `admin` block means the account is marked as an admin but the
    // admin record is absent or deactivated. That is not an admin.
    if (!row.admin) return ANONYMOUS

    return {
      kind: 'admin',
      userId: row.userId,
      adminId: row.admin.adminId,
      roleId: row.admin.roleId,
      roleKey: row.admin.roleKey,
      roleName: row.admin.roleName,
      title: row.admin.title,
      permissionVersion: row.admin.permissionVersion,
      // Unknown keys are dropped rather than trusted: a permission the code has
      // never heard of cannot be checked against, so keeping it would only
      // create the illusion of an authorisation.
      permissions: new Set(row.admin.permissions.filter(isPermission)),
      email: row.email,
      fullName: row.fullName,
      locale: row.locale,
      timezone: row.timezone,
      avatarPath: row.avatarPath,
    }
  }

  if (!row.investor) return ANONYMOUS

  return {
    kind: 'investor',
    userId: row.userId,
    investorId: row.investor.investorId,
    referenceCode: row.investor.referenceCode,
    status: row.investor.status,
    legalName: row.investor.legalName,
    // Recomputed from the status rather than trusted from the payload, so the
    // rule has exactly one definition (src/core/investors/status.ts).
    hasDataAccess: grantsDataAccess(row.investor.status),
    email: row.email,
    fullName: row.fullName,
    locale: row.locale,
    timezone: row.timezone,
    avatarPath: row.avatarPath,
  }
}

/* -------------------------------------------------------------------------- */
/* Predicates                                                                 */
/* -------------------------------------------------------------------------- */

export function isAdmin(principal: Principal): principal is AdminPrincipal {
  return principal.kind === 'admin'
}

export function isInvestor(principal: Principal): principal is InvestorPrincipal {
  return principal.kind === 'investor'
}

export function isAuthenticated(
  principal: Principal,
): principal is AdminPrincipal | InvestorPrincipal {
  return principal.kind !== 'anonymous'
}

/**
 * Does this principal hold the permission?
 *
 * Investors always get `false` — not because they lack the permission, but
 * because permissions are not how investor access works at all. Returning
 * `false` rather than throwing keeps call sites simple while making it
 * impossible for an investor to satisfy an admin-only check.
 */
export function hasPermission(principal: Principal, permission: Permission): boolean {
  return principal.kind === 'admin' && principal.permissions.has(permission)
}

export function hasAnyPermission(
  principal: Principal,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(principal, permission))
}

export function hasAllPermissions(
  principal: Principal,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(principal, permission))
}

/** The investor id to scope a query by, or null. Never read from a request. */
export function scopedInvestorId(principal: Principal): string | null {
  return principal.kind === 'investor' && principal.hasDataAccess ? principal.investorId : null
}

/** A short, non-identifying label for logs and audit records. */
export function principalLabel(principal: Principal): string {
  switch (principal.kind) {
    case 'anonymous':
      return 'anonymous'
    case 'admin':
      return `${principal.fullName} (${principal.roleKey})`
    case 'investor':
      return `${principal.fullName} (${principal.referenceCode})`
  }
}

export function principalActorType(principal: Principal): 'admin' | 'investor' | 'anonymous' {
  return principal.kind
}
