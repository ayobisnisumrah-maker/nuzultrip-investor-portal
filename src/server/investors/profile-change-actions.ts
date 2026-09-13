'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { ConflictError, NotFoundError } from '@/core/errors'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { defineAction } from '@/server/auth/guards'

const reviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(2000).nullable().optional(),
})

const applySchema = z.object({ requestId: z.string().uuid() })

export const reviewInvestorProfileChangeRequest = defineAction({
  access: { permission: 'investors.update' },
  input: reviewSchema,
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.schema('app').rpc('review_investor_profile_change_request', {
      p_request_id: input.requestId,
      p_decision: input.decision,
      p_note: input.note ?? null,
    })
    if (error) {
      throw new ConflictError(error.message, 'Pengajuan perubahan tidak dapat ditinjau.')
    }
    revalidatePath('/admin/investors/profile-changes')
    return { ok: true }
  },
})

export const applyInvestorProfileChangeRequest = defineAction({
  access: { permission: 'investors.update' },
  input: applySchema,
  handler: async ({ input, supabase }) => {
    const { data: request, error: requestError } = await supabase
      .from('investor_profile_change_requests')
      .select('id,investor_id,status,requested_changes')
      .eq('id', input.requestId)
      .maybeSingle()

    if (requestError || !request) throw new NotFoundError('Pengajuan perubahan profil')
    if (request.status !== 'approved') {
      throw new ConflictError('Profile change request is not approved.', 'Pengajuan harus disetujui sebelum diterapkan.')
    }

    const changes = request.requested_changes as Record<string, unknown>
    const requestedEmail = typeof changes.email === 'string' ? changes.email.trim() : null
    const serviceClient = getServiceRoleClient()
    let previousEmail: string | null = null
    let emailApplied = false

    if (requestedEmail) {
      const { data: currentUser, error: currentUserError } = await serviceClient.auth.admin.getUserById(request.investor_id)
      if (currentUserError || !currentUser.user) {
        throw new ConflictError('Unable to read Auth user.', 'Akun autentikasi investor tidak dapat dibaca.')
      }
      previousEmail = currentUser.user.email ?? null
      if (previousEmail !== requestedEmail) {
        const { error: emailError } = await serviceClient.auth.admin.updateUserById(request.investor_id, {
          email: requestedEmail,
          email_confirm: true,
        })
        if (emailError) {
          throw new ConflictError(emailError.message, 'Email baru tidak dapat diterapkan.')
        }
      }
      emailApplied = true
    }

    const { error: applyError } = await supabase.schema('app').rpc('apply_investor_profile_change_request', {
      p_request_id: input.requestId,
      p_email_applied: emailApplied,
    })

    if (applyError) {
      if (requestedEmail && previousEmail && previousEmail !== requestedEmail) {
        await serviceClient.auth.admin.updateUserById(request.investor_id, {
          email: previousEmail,
          email_confirm: true,
        })
      }
      throw new ConflictError(applyError.message, 'Perubahan profil tidak dapat diterapkan.')
    }

    revalidatePath('/admin/investors/profile-changes')
    revalidatePath(`/admin/investors/${request.investor_id}`)
    revalidatePath('/investor/profile')
    return { ok: true }
  },
})
