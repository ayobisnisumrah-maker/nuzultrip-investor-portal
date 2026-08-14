// @vitest-environment node
/**
 * The authorisation matrix.
 *
 * Every access rule is checked against every principal kind, both directions:
 * a rule that lets the wrong caller through is a breach, and one that blocks
 * the right caller is an outage. Both are asserted.
 */
import { describe, expect, it } from 'vitest'
import { ANONYMOUS, parsePrincipal, type Principal } from '@/core/auth/principal'
import { ForbiddenError, UnauthenticatedError } from '@/core/errors'
import { PERMISSION_KEYS } from '@/core/rbac/permissions'
import {
  assertAccess,
  requireAdmin,
  requireAuthenticated,
  requireInvestorAccess,
  requirePermission,
  type AccessRule,
} from './guards'

function admin(permissions: string[], roleKey = 'admin_internal'): Principal {
  return parsePrincipal({
    userId: '11111111-1111-4111-8111-111111111111',
    accountType: 'admin',
    accountStatus: 'active',
    email: 'admin@example.test',
    fullName: 'Admin Uji',
    locale: 'id',
    timezone: 'Asia/Jakarta',
    avatarPath: null,
    admin: {
      adminId: '11111111-1111-4111-8111-111111111111',
      roleId: '22222222-2222-4222-8222-222222222222',
      roleKey,
      roleName: 'Admin Uji',
      title: null,
      permissionVersion: 1,
      permissions,
    },
  })
}

function investor(status = 'active'): Principal {
  return parsePrincipal({
    userId: '33333333-3333-4333-8333-333333333333',
    accountType: 'investor',
    accountStatus: 'active',
    email: 'investor@example.test',
    fullName: 'Investor Uji',
    locale: 'id',
    timezone: 'Asia/Jakarta',
    avatarPath: null,
    investor: {
      investorId: '33333333-3333-4333-8333-333333333333',
      referenceCode: 'NTI-2026-0001',
      status,
      investorType: 'individual',
      legalName: 'Investor Uji',
      hasDataAccess: true,
    },
  })
}

const superAdmin = admin([...PERMISSION_KEYS], 'super_admin')
const viewer = admin(['investors.view'])
const noPermissions = admin([])

/* -------------------------------------------------------------------------- */

describe('assertAccess', () => {
  const cases: ReadonlyArray<{
    rule: AccessRule
    allow: ReadonlyArray<[string, Principal]>
    deny: ReadonlyArray<[string, Principal]>
  }> = [
    {
      rule: 'public',
      allow: [
        ['anonymous', ANONYMOUS],
        ['investor', investor()],
        ['admin', viewer],
      ],
      deny: [],
    },
    {
      rule: 'authenticated',
      allow: [
        ['investor', investor()],
        ['pending investor', investor('submitted')],
        ['admin', noPermissions],
      ],
      deny: [['anonymous', ANONYMOUS]],
    },
    {
      rule: 'admin',
      allow: [
        ['admin without permissions', noPermissions],
        ['super admin', superAdmin],
      ],
      deny: [
        ['anonymous', ANONYMOUS],
        ['investor', investor()],
      ],
    },
    {
      rule: 'investor',
      allow: [['active investor', investor()]],
      deny: [
        ['anonymous', ANONYMOUS],
        ['admin', superAdmin],
        ['submitted investor', investor('submitted')],
        ['under review investor', investor('under_review')],
        ['rejected investor', investor('rejected')],
        ['deactivated investor', investor('inactive')],
      ],
    },
    {
      rule: { permission: 'investors.view' },
      allow: [
        ['admin holding it', viewer],
        ['super admin', superAdmin],
      ],
      deny: [
        ['anonymous', ANONYMOUS],
        ['investor', investor()],
        ['admin without it', noPermissions],
      ],
    },
    {
      rule: { permission: 'settings.update' },
      allow: [['super admin', superAdmin]],
      deny: [
        ['admin with a different permission', viewer],
        ['investor', investor()],
        ['anonymous', ANONYMOUS],
      ],
    },
  ]

  for (const { rule, allow, deny } of cases) {
    const label = typeof rule === 'object' ? `{ permission: ${rule.permission} }` : rule

    for (const [who, principal] of allow) {
      it(`${label} allows ${who}`, () => {
        expect(() => assertAccess(principal, rule)).not.toThrow()
      })
    }

    for (const [who, principal] of deny) {
      it(`${label} denies ${who}`, () => {
        expect(() => assertAccess(principal, rule)).toThrow()
      })
    }
  }

  it('reports an anonymous caller as unauthenticated, not forbidden', () => {
    // The distinction drives the UI: one means "sign in", the other means
    // "you cannot do this at all".
    expect(() => assertAccess(ANONYMOUS, 'admin')).toThrow(UnauthenticatedError)
    expect(() => assertAccess(investor(), 'admin')).toThrow(ForbiddenError)
  })
})

/* -------------------------------------------------------------------------- */

describe('requirePermission', () => {
  it('returns the admin principal when the permission is held', () => {
    expect(requirePermission(viewer, 'investors.view').kind).toBe('admin')
  })

  it('denies every permission to an admin with none', () => {
    for (const key of PERMISSION_KEYS) {
      expect(() => requirePermission(noPermissions, key as never)).toThrow(ForbiddenError)
    }
  })

  it('grants every permission to a super admin', () => {
    for (const key of PERMISSION_KEYS) {
      expect(() => requirePermission(superAdmin, key as never)).not.toThrow()
    }
  })

  it('names the missing permission in the error detail, not to the user', () => {
    try {
      requirePermission(noPermissions, 'investors.approve')
      throw new Error('expected a ForbiddenError')
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError)
      const forbidden = error as ForbiddenError
      expect(forbidden.message).toContain('investors.approve')
      // The public message stays generic — it must not enumerate the
      // permission model to a caller who has just been refused.
      expect(forbidden.publicMessage).not.toContain('investors.approve')
    }
  })
})

describe('requireInvestorAccess', () => {
  it('accepts an active investor', () => {
    expect(requireInvestorAccess(investor()).kind).toBe('investor')
  })

  it('rejects an investor whose status does not grant data access', () => {
    for (const status of ['prospective', 'submitted', 'under_review', 'rejected', 'inactive']) {
      expect(() => requireInvestorAccess(investor(status)), status).toThrow(ForbiddenError)
    }
  })

  it('rejects an admin, however privileged', () => {
    // A Super Admin is not an investor. Investor-scoped data is reached through
    // the admin surface with an explicit permission, never by impersonation.
    expect(() => requireInvestorAccess(superAdmin)).toThrow(ForbiddenError)
  })
})

describe('requireAdmin / requireAuthenticated', () => {
  it('requireAdmin rejects investors and anonymous callers', () => {
    expect(() => requireAdmin(investor())).toThrow(ForbiddenError)
    expect(() => requireAdmin(ANONYMOUS)).toThrow(UnauthenticatedError)
    expect(requireAdmin(noPermissions).kind).toBe('admin')
  })

  it('requireAuthenticated accepts any signed-in principal', () => {
    expect(requireAuthenticated(investor('submitted')).kind).toBe('investor')
    expect(requireAuthenticated(noPermissions).kind).toBe('admin')
    expect(() => requireAuthenticated(ANONYMOUS)).toThrow(UnauthenticatedError)
  })
})
