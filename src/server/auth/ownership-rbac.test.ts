// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { ANONYMOUS, parsePrincipal, type Principal } from '@/core/auth/principal'
import { ForbiddenError, UnauthenticatedError } from '@/core/errors'
import { PERMISSION_KEYS } from '@/core/rbac/permissions'
import { requirePermission } from '@/server/auth/guards'

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

function investor(): Principal {
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
      status: 'active',
      investorType: 'individual',
      legalName: 'Investor Uji',
      hasDataAccess: true,
    },
  })
}

const OWNERSHIP_PERMISSIONS = [
  'ownership_offerings.view',
  'ownership_offerings.create',
  'ownership_offerings.update',
  'ownership_offerings.publish',
  'ownership_offerings.pause',
  'ownership_offerings.resume',
  'ownership_offerings.close',
  'ownership_offerings.archive',
] as const

const superAdmin = admin([...PERMISSION_KEYS], 'super_admin')

const internalAdmin = admin([...OWNERSHIP_PERMISSIONS], 'admin_internal')

const investorRelationsAdmin = admin(['ownership_offerings.view'], 'admin_investor_relations')

const noPermissionAdmin = admin([], 'admin_internal')

describe('Ownership Offering authorization matrix', () => {
  describe('super_admin', () => {
    for (const permission of OWNERSHIP_PERMISSIONS) {
      it(`allows ${permission}`, () => {
        expect(() => requirePermission(superAdmin, permission)).not.toThrow()
      })
    }
  })

  describe('admin_internal', () => {
    for (const permission of OWNERSHIP_PERMISSIONS) {
      it(`allows ${permission}`, () => {
        expect(() => requirePermission(internalAdmin, permission)).not.toThrow()
      })
    }
  })

  describe('admin_investor_relations', () => {
    it('allows ownership_offerings.view', () => {
      expect(() =>
        requirePermission(investorRelationsAdmin, 'ownership_offerings.view'),
      ).not.toThrow()
    })

    for (const permission of OWNERSHIP_PERMISSIONS.filter(
      (permission) => permission !== 'ownership_offerings.view',
    )) {
      it(`denies ${permission}`, () => {
        expect(() => requirePermission(investorRelationsAdmin, permission)).toThrow(ForbiddenError)
      })
    }
  })

  describe('admin without ownership permissions', () => {
    for (const permission of OWNERSHIP_PERMISSIONS) {
      it(`denies ${permission}`, () => {
        expect(() => requirePermission(noPermissionAdmin, permission)).toThrow(ForbiddenError)
      })
    }
  })

  describe('investor', () => {
    for (const permission of OWNERSHIP_PERMISSIONS) {
      it(`denies ${permission}`, () => {
        expect(() => requirePermission(investor(), permission)).toThrow(ForbiddenError)
      })
    }
  })

  describe('anonymous', () => {
    for (const permission of OWNERSHIP_PERMISSIONS) {
      it(`denies ${permission} as unauthenticated`, () => {
        expect(() => requirePermission(ANONYMOUS, permission)).toThrow(UnauthenticatedError)
      })
    }
  })
})
