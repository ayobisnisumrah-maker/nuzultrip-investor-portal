import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { defineRoute } from '@/server/auth/guards'
import { getServerSupabase } from '@/server/supabase/server'
import { getClientEnv } from '@/lib/env'
import { parsePrincipal } from '@/core/auth/principal'

const callbackSchema = z.object({
  code: z.string().min(1).max(512).optional(),
  token_hash: z.string().min(1).max(1024).optional(),
  type: z
    .enum([
      'email',
      'invite',
      'recovery',
      'signup',
      'magiclink',
      'email_change',
    ])
    .optional(),
  next: z.string().max(512).optional(),
  error: z.string().max(256).optional(),
  error_description: z.string().max(512).optional(),
})

function internalPath(next: string | undefined, fallback: string): string {
  if (!next) return fallback

  // Only allow relative internal paths.
  if (!next.startsWith('/') || next.startsWith('//')) {
    return fallback
  }

  return next
}

function isEmailOtpType(value: string | undefined): value is EmailOtpType {
  return (
    value === 'email' ||
    value === 'invite' ||
    value === 'recovery' ||
    value === 'signup' ||
    value === 'magiclink' ||
    value === 'email_change'
  )
}

/**
 * Authentication callback.
 *
 * Supports:
 * - PKCE auth code
 * - server-side email token_hash
 * - invite
 * - signup confirmation
 * - password recovery
 *
 * The email token is exchanged server-side so the resulting Supabase
 * session can be persisted in the SSR cookies.
 */
export const GET = defineRoute({
  access: 'public',
  input: callbackSchema,

  handler: async ({ input }) => {
    const origin = getClientEnv().NEXT_PUBLIC_SITE_URL

    if (input.error) {
      const reason =
        input.error_description ??
        input.error ??
        'authentication_failed'

      return NextResponse.redirect(
        `${origin}/masuk?galat=${encodeURIComponent(
          reason.slice(0, 200),
        )}`,
      )
    }

    const supabase = await getServerSupabase()

    let authError: { message: string } | null = null

    /**
     * 1. Server-side email verification.
     *
     * This is the important path for Invite User / email confirmation /
     * recovery when the email template sends {{ .TokenHash }}.
     */
    if (input.token_hash) {
      if (!isEmailOtpType(input.type)) {
        return NextResponse.redirect(
          `${origin}/masuk?galat=jenis_tautan_tidak_valid`,
        )
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: input.token_hash,
        type: input.type,
      })

      authError = error
    }

    /**
     * 2. Existing PKCE callback.
     *
     * Keep this because the application may still receive code-based
     * authentication links.
     */
    else if (input.code) {
      const { error } =
        await supabase.auth.exchangeCodeForSession(input.code)

      authError = error
    }

    /**
     * 3. Nothing usable was supplied.
     */
    else {
      return NextResponse.redirect(
        `${origin}/masuk?galat=tautan_tidak_valid`,
      )
    }

    if (authError) {
      return NextResponse.redirect(
        `${origin}/masuk?galat=tautan_tidak_valid`,
      )
    }

    /**
     * Determine the actual authenticated principal.
     *
     * Do not trust account type supplied by the URL.
     */
    const { data: principalRow, error: principalError } =
      await supabase.rpc('current_principal')

    if (principalError || !principalRow) {
      return NextResponse.redirect(
        `${origin}/masuk?galat=akun_tidak_ditemukan`,
      )
    }

    const principal = parsePrincipal(principalRow)

    const fallback =
      principal.kind === 'admin'
        ? '/admin'
        : principal.kind === 'investor'
          ? '/investor'
          : '/masuk'

    const destination = internalPath(input.next, fallback)

    /**
     * Anonymous is never allowed through an authentication callback.
     */
    if (principal.kind === 'anonymous') {
      return NextResponse.redirect(
        `${origin}/masuk?galat=akun_tidak_ditemukan`,
      )
    }

    return NextResponse.redirect(`${origin}${destination}`)
  },
})