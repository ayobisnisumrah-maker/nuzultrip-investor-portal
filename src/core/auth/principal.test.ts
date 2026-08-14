// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  ANONYMOUS,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAdmin,
  isAuthenticated,
  isInvestor,
  parsePrincipal,
  principalLabel,
  PrincipalShapeError,
  scopedInvestorId,
  type Principal,
} from './principal'

const adminRow = {
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
    roleKey: 'admin_internal',
    roleName: 'Admin Internal',
    title: null,
    permissionVersion: 3,
    permissions: ['investors.view', 'documents.view'],
  },
}

const investorRow = {
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
    status: 'active',
    investorType: 'individual',
    legalName: 'Investor Uji',
    hasDataAccess: true,
  },
}

describe('parsePrincipal', () => {
  it('returns anonymous for null and undefined', () => {
    expect(parsePrincipal(null)).toEqual(ANONYMOUS)
    expect(parsePrincipal(undefined)).toEqual(ANONYMOUS)
  })

  it('builds an admin principal with its permission set', () => {
    const principal = parsePrincipal(adminRow)
    expect(principal.kind).toBe('admin')
    if (principal.kind !== 'admin') throw new Error('expected an admin')
    expect(principal.roleKey).toBe('admin_internal')
    expect(principal.permissions.has('investors.view')).toBe(true)
    expect(principal.permissions.has('settings.update')).toBe(false)
  })

  it('drops permission keys the code does not recognise', () => {
    // Keeping an unknown key would create the illusion of an authorisation
    // that nothing can ever check against.
    const principal = parsePrincipal({
      ...adminRow,
      admin: { ...adminRow.admin, permissions: ['investors.view', 'legacy.superpower'] },
    })
    if (principal.kind !== 'admin') throw new Error('expected an admin')
    expect([...principal.permissions]).toEqual(['investors.view'])
  })

  it('treats a disabled account as anonymous', () => {
    expect(parsePrincipal({ ...adminRow, accountStatus: 'disabled' })).toEqual(ANONYMOUS)
    expect(parsePrincipal({ ...investorRow, accountStatus: 'disabled' })).toEqual(ANONYMOUS)
  })

  it('treats an admin row with no admin record as anonymous', () => {
    // The account is marked as an admin but the admin record is absent or
    // deactivated. That is not an admin.
    const { admin: _admin, ...withoutAdmin } = adminRow
    expect(parsePrincipal(withoutAdmin)).toEqual(ANONYMOUS)
  })

  it('treats an investor row with no investor record as anonymous', () => {
    const { investor: _investor, ...withoutInvestor } = investorRow
    expect(parsePrincipal(withoutInvestor)).toEqual(ANONYMOUS)
  })

  it('recomputes data access from the status rather than trusting the payload', () => {
    // If these ever disagree, the status is the truth: it is what RLS uses.
    const principal = parsePrincipal({
      ...investorRow,
      investor: { ...investorRow.investor, status: 'submitted', hasDataAccess: true },
    })
    if (principal.kind !== 'investor') throw new Error('expected an investor')
    expect(principal.status).toBe('submitted')
    expect(principal.hasDataAccess).toBe(false)
  })

  it.each([
    ['approved', true],
    ['active', true],
    ['prospective', false],
    ['submitted', false],
    ['under_review', false],
    ['rejected', false],
    ['inactive', false],
  ] as const)('grants data access for %s = %s', (status, expected) => {
    const principal = parsePrincipal({
      ...investorRow,
      investor: { ...investorRow.investor, status, hasDataAccess: true },
    })
    if (principal.kind !== 'investor') throw new Error('expected an investor')
    expect(principal.hasDataAccess).toBe(expected)
  })

  it('raises on an unexpected shape rather than degrading quietly', () => {
    expect(() => parsePrincipal({ userId: 'not-a-uuid' })).toThrow(PrincipalShapeError)
    expect(() => parsePrincipal({ ...adminRow, accountType: 'wizard' })).toThrow(
      PrincipalShapeError,
    )
  })
})

describe('predicates', () => {
  const admin = parsePrincipal(adminRow)
  const investor = parsePrincipal(investorRow)

  it('classifies each principal kind', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isInvestor(admin)).toBe(false)
    expect(isInvestor(investor)).toBe(true)
    expect(isAdmin(investor)).toBe(false)
    expect(isAuthenticated(ANONYMOUS)).toBe(false)
    expect(isAuthenticated(admin)).toBe(true)
    expect(isAuthenticated(investor)).toBe(true)
  })

  it('never grants a permission to an investor or an anonymous caller', () => {
    // Permissions are not how investor access works. Returning false keeps call
    // sites simple while making it impossible for an investor to satisfy an
    // admin-only check.
    expect(hasPermission(investor, 'investors.view')).toBe(false)
    expect(hasPermission(ANONYMOUS, 'investors.view')).toBe(false)
    expect(hasPermission(admin, 'investors.view')).toBe(true)
  })

  it('supports any/all permission checks', () => {
    expect(hasAnyPermission(admin, ['settings.update', 'investors.view'])).toBe(true)
    expect(hasAnyPermission(admin, ['settings.update', 'roles.assign'])).toBe(false)
    expect(hasAllPermissions(admin, ['investors.view', 'documents.view'])).toBe(true)
    expect(hasAllPermissions(admin, ['investors.view', 'settings.update'])).toBe(false)
  })

  it('scopes queries by the session, and only when access is granted', () => {
    expect(scopedInvestorId(investor)).toBe(investorRow.investor.investorId)
    expect(scopedInvestorId(admin)).toBeNull()
    expect(scopedInvestorId(ANONYMOUS)).toBeNull()

    const pending = parsePrincipal({
      ...investorRow,
      investor: { ...investorRow.investor, status: 'submitted' },
    })
    expect(scopedInvestorId(pending)).toBeNull()
  })

  it('labels principals for the audit trail', () => {
    expect(principalLabel(ANONYMOUS)).toBe('anonymous')
    expect(principalLabel(admin)).toContain('admin_internal')
    expect(principalLabel(investor)).toContain('NTI-2026-0001')
  })

  it('covers every principal kind in the label switch', () => {
    const kinds: Principal[] = [ANONYMOUS, admin, investor]
    for (const principal of kinds) expect(principalLabel(principal)).toBeTruthy()
  })
})
