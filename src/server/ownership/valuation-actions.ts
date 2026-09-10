'use server'

import { z } from 'zod'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

const updateCompanyValuationSchema = z.object({
  offeringId: z.uuid('Penawaran kepemilikan tidak valid.'),
  companyValuation: z.number().finite().positive('Valuasi perusahaan harus lebih besar dari 0.'),
})

export const updateCompanyValuation = defineAction({
  access: { permission: 'ownership_offerings.update' },
  input: updateCompanyValuationSchema,
  audit: {
    action: 'ownership_offering.valuation_update',
    entityType: 'ownership_offering',
  },

  handler: async ({ principal, input, supabase }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data: current, error: currentError } = await supabase
      .from('ownership_offerings')
      .select('id, status')
      .eq('id', input.offeringId)
      .maybeSingle()

    if (currentError) {
      throw new Error(`Gagal membaca penawaran kepemilikan: ${currentError.message}`)
    }

    if (!current) {
      throw new NotFoundError('Penawaran kepemilikan')
    }

    if (current.status === 'closed' || current.status === 'archived') {
      throw new Error('Valuasi penawaran yang sudah ditutup atau diarsipkan tidak dapat diubah.')
    }

    const { data, error } = await supabase
      .from('ownership_offerings')
      .update({
        company_valuation: input.companyValuation,
        updated_by: principal.adminId,
      })
      .eq('id', input.offeringId)
      .select('id, company_valuation, updated_at')
      .single()

    if (error) {
      throw new Error(`Gagal menyimpan valuasi perusahaan: ${error.message}`)
    }

    return {
      id: data.id,
      companyValuation: Number(data.company_valuation),
      updatedAt: data.updated_at,
    }
  },
})
