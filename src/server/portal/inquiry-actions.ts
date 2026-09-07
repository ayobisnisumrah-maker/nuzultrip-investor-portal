'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { isAppError } from '@/core/errors'
import { rateLimitBucket } from '@/core/rate-limit/policy'
import { getServerEnv } from '@/lib/server-env'
import { enforceRateLimit } from '@/server/admin/rate-limit'
import { getServerSupabase } from '@/server/supabase/server'

const inquirySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(50).optional(),
  organization: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
})

export async function submitPortalInquiry(formData: FormData) {
  const parsed = inquirySchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    organization: formData.get('organization') || undefined,
    message: formData.get('message'),
  })

  if (!parsed.success) {
    redirect('/hubungi?error=invalid')
  }

  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || 'unknown'

  try {
    await enforceRateLimit('portal.inquiry', ip)

    const supabase = await getServerSupabase()
    const { error } = await supabase.from('portal_inquiries').insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      organization: parsed.data.organization ?? null,
      message: parsed.data.message,
      source_page: '/hubungi',
      ip_hash: rateLimitBucket(getServerEnv().AUDIT_IP_SALT, 'portal.inquiry', ip),
      user_agent: requestHeaders.get('user-agent'),
      status: 'new',
    })

    if (error) {
      console.error('Portal inquiry insert failed', {
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      redirect('/hubungi?error=server')
    }
  } catch (error) {
    if (isAppError(error) && error.code === 'rate_limited') {
      redirect('/hubungi?error=rate')
    }
    throw error
  }

  redirect('/hubungi?sent=1')
}
