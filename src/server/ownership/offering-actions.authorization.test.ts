// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  ANONYMOUS,
  parsePrincipal,
  type Principal,
} from '@/core/auth/principal'
import { ForbiddenError, UnauthenticatedError } from '@/core/errors'
import {
  archiveOwnershipOffering,
  closeOwnershipOffering,
  createOwnershipOffering,
  getOwnershipOffering,
  listOwnershipOfferings,
  pauseOwnershipOffering,
  publishOwnershipOffering,
  resumeOwnershipOffering,
  updateOwnershipOffering,
} from '@/server/ownership/offering-actions'

function admin(
  permissions: string[],
  roleKey = 'admin_internal',
): Principal {
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

const investorRelationsAdmin = admin(
  ['ownership_offerings.view'],
  'admin_investor_relations',
)

const noPermissionAdmin = admin([], 'admin_internal')

const offeringId = '44444444-4444-4444-8444-444444444444'

describe('Ownership server action authorization', () => {
  describe('listOwnershipOfferings', () => {
    it('requires ownership_offerings.view for an admin', async () => {
      await expect(
        listOwnershipOfferings({
          principal: investor(),
          input: {},
        } as never),
      ).rejects.toThrow(UnauthenticatedError)
    })

    it('rejects an admin without ownership view permission', async () => {
      await expect(
        listOwnershipOfferings({
          principal: noPermissionAdmin,
          input: {},
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects investor principal', async () => {
      await expect(
        listOwnershipOfferings({
          principal: investor(),
          input: {},
        } as never),
      ).rejects.toThrow()
    })

    it('rejects anonymous principal', async () => {
      await expect(
        listOwnershipOfferings({
          principal: ANONYMOUS,
          input: {},
        } as never),
      ).rejects.toThrow(UnauthenticatedError)
    })
  })

  describe('getOwnershipOffering', () => {
    it('rejects admin without ownership view permission', async () => {
      await expect(
        getOwnershipOffering({
          principal: noPermissionAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('allows authorization boundary for investor-relations admin', async () => {
      await expect(
        getOwnershipOffering({
          principal: investorRelationsAdmin,
          input: { offeringId },
        } as never),
      ).rejects.not.toThrow(ForbiddenError)
    })
  })

  describe('createOwnershipOffering', () => {
    it('rejects investor-relations admin', async () => {
      await expect(
        createOwnershipOffering({
          principal: investorRelationsAdmin,
          input: {},
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects admin without create permission', async () => {
      await expect(
        createOwnershipOffering({
          principal: noPermissionAdmin,
          input: {},
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects investor', async () => {
      await expect(
        createOwnershipOffering({
          principal: investor(),
          input: {},
        } as never),
      ).rejects.toThrow()
    })
  })

  describe('updateOwnershipOffering', () => {
    it('rejects investor-relations admin', async () => {
      await expect(
        updateOwnershipOffering({
          principal: investorRelationsAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects admin without update permission', async () => {
      await expect(
        updateOwnershipOffering({
          principal: noPermissionAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('publishOwnershipOffering', () => {
    it('rejects investor-relations admin', async () => {
      await expect(
        publishOwnershipOffering({
          principal: investorRelationsAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects admin without publish permission', async () => {
      await expect(
        publishOwnershipOffering({
          principal: noPermissionAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('pauseOwnershipOffering', () => {
    it('rejects investor-relations admin', async () => {
      await expect(
        pauseOwnershipOffering({
          principal: investorRelationsAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects admin without pause permission', async () => {
      await expect(
        pauseOwnershipOffering({
          principal: noPermissionAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('resumeOwnershipOffering', () => {
    it('rejects investor-relations admin', async () => {
      await expect(
        resumeOwnershipOffering({
          principal: investorRelationsAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects admin without resume permission', async () => {
      await expect(
        resumeOwnershipOffering({
          principal: noPermissionAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('closeOwnershipOffering', () => {
    it('rejects investor-relations admin', async () => {
      await expect(
        closeOwnershipOffering({
          principal: investorRelationsAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects admin without close permission', async () => {
      await expect(
        closeOwnershipOffering({
          principal: noPermissionAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('archiveOwnershipOffering', () => {
    it('rejects investor-relations admin', async () => {
      await expect(
        archiveOwnershipOffering({
          principal: investorRelationsAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })

    it('rejects admin without archive permission', async () => {
      await expect(
        archiveOwnershipOffering({
          principal: noPermissionAdmin,
          input: { offeringId },
        } as never),
      ).rejects.toThrow(ForbiddenError)
    })
  })
})
