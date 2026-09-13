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
      p_note: input.note ?? undefined,
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
      throw new ConflictError(
        'Profile change request is not approved.',
        'Pengajuan harus disetujui sebelum diterapkan.',
      )
    }

    const changes = request.requested_changes as Record<string, unknown>
    const requestedEmail = typeof changes.email === 'string' ? changes.email.trim() : null
    const serviceClient = getServiceRoleClient()
    let previousAuthEmail: string | null = null
    let previousAccountEmail: string | null = null
    let emailApplied = false

    if (requestedEmail) {
      const [{ data: currentUser, error: currentUserError }, { data: currentAccount, error: accountError }] =
        await Promise.all([
          serviceClient.auth.admin.getUserById(request.investor_id),
          serviceClient
            .from('user_accounts')
            .select('email')
            .eq('id', request.investor_id)
            .maybeSingle(),
        ])

      if (currentUserError || !currentUser.user || accountError || !currentAccount) {
        throw new ConflictError(
          'Unable to read canonical investor email.',
          'Email investor saat ini tidak dapat dibaca.',
        )
      }

      previousAuthEmail = currentUser.user.email ?? null
      previousAccountEmail = currentAccount.email

      if (previousAuthEmail !== requestedEmail) {
        const { error: authEmailError } = await serviceClient.auth.admin.updateUserById(
          request.investor_id,
          { email: requestedEmail, email_confirm: true },
        )
        if (authEmailError) {
          throw new ConflictError(authEmailError.message, 'Email login baru tidak dapat diterapkan.')
        }
      }

      const { error: accountEmailError } = await serviceClient
        .from('user_accounts')
        .update({ email: requestedEmail })
        .eq('id', request.investor_id)

      if (accountEmailError) {
        if (previousAuthEmail && previousAuthEmail !== requestedEmail) {
          await serviceClient.auth.admin.updateUserById(request.investor_id, {
            email: previousAuthEmail,
            email_confirm: true,
          })
        }
        throw new ConflictError(
          accountEmailError.message,
          'Email akun investor tidak dapat disinkronkan.',
        )
      }

      emailApplied = true
    }

    const { error: applyError } = await supabase
      .schema('app')
      .rpc('apply_investor_profile_change_request', {
        p_request_id: input.requestId,
        p_email_applied: emailApplied,
      })

    if (applyError) {
      if (requestedEmail) {
        if (previousAccountEmail && previousAccountEmail !== requestedEmail) {
          await serviceClient
            .from('user_accounts')
            .update({ email: previousAccountEmail })
            .eq('id', request.investor_id)
        }
        if (previousAuthEmail && previousAuthEmail !== requestedEmail) {
          await serviceClient.auth.admin.updateUserById(request.investor_id, {
            email: previousAuthEmail,
            email_confirm: true,
          })
        }
      }
      throw new ConflictError(applyError.message, 'Perubahan profil tidak dapat diterapkan.')
    }

    revalidatePath('/admin/investors/profile-changes')
    revalidatePath(`/admin/investors/${request.investor_id}`)
    revalidatePath('/investor/profile')
    return { ok: true }
  },
})
