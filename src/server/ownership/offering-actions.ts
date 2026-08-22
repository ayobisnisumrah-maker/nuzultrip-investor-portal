'use server'

import { z } from 'zod'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

import {
  createOwnershipOffering as createOwnershipOfferingService,
  getOwnershipOffering as getOwnershipOfferingService,
  listOwnershipOfferings as listOwnershipOfferingsService,
  publishOwnershipOffering as publishOwnershipOfferingService,
  pauseOwnershipOffering as pauseOwnershipOfferingService,
  resumeOwnershipOffering as resumeOwnershipOfferingService,
  closeOwnershipOffering as closeOwnershipOfferingService,
  archiveOwnershipOffering as archiveOwnershipOfferingService,
  updateOwnershipOffering as updateOwnershipOfferingService,
} from './offering-service'

const offeringIdSchema = z.object({
  offeringId: z.uuid('Penawaran kepemilikan tidak valid.'),
})

const createOwnershipOfferingSchema = z.object({
  name: z.string().trim().min(1, 'Nama penawaran kepemilikan wajib diisi.'),
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Kode penawaran harus menggunakan lowercase kebab-case.'),
  total_offered_bps: z.number().int().min(1).max(10000),
  unit_ownership_bps: z.number().int().min(1).max(10000),
  unit_price: z.number().finite().positive(),
  total_units: z.number().int().positive(),
  distribution_cadence_months: z.number().int().min(1).max(24).optional(),
  transfer_lock_months: z.number().int().min(36).max(120).optional(),
  effective_from: z.string().datetime().nullable().optional(),
  effective_until: z.string().datetime().nullable().optional(),
  description: z.string().trim().nullable().optional(),
})

const updateOwnershipOfferingSchema = createOwnershipOfferingSchema.partial().extend({
  offeringId: z.uuid('Penawaran kepemilikan tidak valid.'),
})

export const listOwnershipOfferings = defineAction({
  access: { permission: 'ownership_offerings.view' },
  input: z.object({}),
  audit: {
    action: 'ownership_offering.list',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    return await listOwnershipOfferingsService(supabase)
  },
})

export const getOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.view' },
  input: offeringIdSchema,
  audit: {
    action: 'ownership_offering.view',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const offering = await getOwnershipOfferingService(supabase, input.offeringId)

    if (!offering) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    return offering
  },
})

export const createOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.create' },
  input: createOwnershipOfferingSchema,
  audit: {
    action: 'ownership_offering.create',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    return await createOwnershipOfferingService(supabase, {
      ...input,
      created_by: principal.adminId,
    })
  },
})

export const updateOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.update' },
  input: updateOwnershipOfferingSchema,
  audit: {
    action: 'ownership_offering.update',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const offering = await getOwnershipOfferingService(supabase, input.offeringId)

    if (!offering) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    return await updateOwnershipOfferingService(supabase, {
      ...input,
      updated_by: principal.adminId,
    })
  },
})

export const publishOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.publish' },
  input: offeringIdSchema,
  audit: {
    action: 'ownership_offering.publish',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const offering = await getOwnershipOfferingService(supabase, input.offeringId)

    if (!offering) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    return await publishOwnershipOfferingService(supabase, input.offeringId, principal.adminId)
  },
})

export const pauseOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.pause' },
  input: offeringIdSchema,
  audit: {
    action: 'ownership_offering.pause',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const offering = await getOwnershipOfferingService(supabase, input.offeringId)

    if (!offering) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    return await pauseOwnershipOfferingService(supabase, input.offeringId, principal.adminId)
  },
})

export const resumeOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.resume' },
  input: offeringIdSchema,
  audit: {
    action: 'ownership_offering.resume',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const offering = await getOwnershipOfferingService(supabase, input.offeringId)

    if (!offering) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    return await resumeOwnershipOfferingService(supabase, input.offeringId, principal.adminId)
  },
})

export const closeOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.close' },
  input: offeringIdSchema,
  audit: {
    action: 'ownership_offering.close',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const offering = await getOwnershipOfferingService(supabase, input.offeringId)

    if (!offering) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    return await closeOwnershipOfferingService(supabase, input.offeringId, principal.adminId)
  },
})

export const archiveOwnershipOffering = defineAction({
  access: { permission: 'ownership_offerings.archive' },
  input: offeringIdSchema,
  audit: {
    action: 'ownership_offering.archive',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const offering = await getOwnershipOfferingService(supabase, input.offeringId)

    if (!offering) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    return await archiveOwnershipOfferingService(supabase, input.offeringId, principal.adminId)
  },
})
