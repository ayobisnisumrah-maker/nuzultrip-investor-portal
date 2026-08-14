'use server'

import { investorApplicationSchema, portalInquirySchema } from '@/core/auth/schemas'
import { ConflictError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import { getRequestMeta, writeAudit } from '@/server/audit'
import { enforceRateLimit } from '@/server/admin/rate-limit'
import { provisionInvestorApplication } from '@/server/admin/provisioning'
import { ANONYMOUS } from '@/core/auth/principal'

/**
 * Public onboarding entry points.
 *
 * Both are `access: 'public'` — stated deliberately, and both are rate-limited
 * before they touch anything.
 */

export const submitInvestorApplication = defineAction({
  access: 'public',
  input: investorApplicationSchema,
  handler: async ({ input, supabase }) => {
    const meta = await getRequestMeta()

    await enforceRateLimit('investor.application', input.email)
    if (meta.ipHash) await enforceRateLimit('investor.application', `ip:${meta.ipHash}`)

    const { data: setting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'workflow.investor_application_open')
      .maybeSingle()

    // Absent is treated as closed: an operator who has not made a decision
    // should not have the form silently open.
    if (setting?.value !== true) {
      throw new ConflictError(
        'Investor applications are closed.',
        'Pendaftaran investor sedang ditutup. Silakan hubungi tim hubungan investor.',
      )
    }

    const provisioned = await provisionInvestorApplication(input)

    await writeAudit(ANONYMOUS, {
      action: 'investor.applied',
      entityType: 'investor',
      entityId: provisioned.investorId,
      summary: `Pengajuan investor baru diterima (${provisioned.referenceCode}).`,
    })

    // The confirmation link is never returned to the browser — it would let
    // anyone who could see the response confirm the address themselves.
    return {
      referenceCode: provisioned.referenceCode,
      email: input.email,
    }
  },
})

/* -------------------------------------------------------------------------- */

export const submitPortalInquiry = defineAction({
  access: 'public',
  input: portalInquirySchema,
  handler: async ({ input, supabase }) => {
    const meta = await getRequestMeta()

    await enforceRateLimit('portal.inquiry', input.email)
    if (meta.ipHash) await enforceRateLimit('portal.inquiry', `ip:${meta.ipHash}`)

    // No RETURNING clause: `anon` holds INSERT but not SELECT on this table, so
    // asking for the id back would be refused at the privilege layer — and an
    // anonymous submitter has no business reading inquiries anyway.
    const { error } = await supabase.from('portal_inquiries').insert({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      organization: input.organization || null,
      message: input.message,
      source_page: input.sourcePage ?? null,
      ip_hash: meta.ipHash,
      user_agent: meta.userAgent,
    })

    if (error) {
      throw new ConflictError(
        `Failed to record the inquiry: ${error.message}`,
        'Pesan Anda tidak dapat dikirim saat ini. Silakan coba lagi.',
      )
    }

    return { received: true }
  },
})
