'use server'

import { redirect } from 'next/navigation'
import { getClientEnv } from '@/lib/env'
import { passwordResetRequestSchema, passwordUpdateSchema, signInSchema } from '@/core/auth/schemas'
import { AppError, UnauthenticatedError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import { getServerSupabase } from '@/server/supabase/server'
import { getRequestMeta, writeAudit } from '@/server/audit'
import { enforceRateLimit } from '@/server/admin/rate-limit'
import { ANONYMOUS, parsePrincipal } from '@/core/auth/principal'

/**
 * Authentication entry points.
 *
 * Sign-in deliberately reports the same failure for a wrong password, an
 * unknown address and a disabled account. Distinguishing them turns the form
 * into an account-existence oracle (docs/SECURITY.md Â§2).
 */

const GENERIC_SIGN_IN_FAILURE = 'Surel atau kata sandi tidak sesuai.'

class SignInFailed extends AppError {
  constructor(reason: string) {
    super('unauthenticated', `Sign-in failed: ${reason}`, GENERIC_SIGN_IN_FAILURE)
  }
}

export const signIn = defineAction({
  access: 'public',
  input: signInSchema,
  handler: async ({ input, supabase }) => {
    const meta = await getRequestMeta()

    // Limited per address and per client, so neither a single account nor a
    // single origin can be ground down.
    await enforceRateLimit('auth.sign_in', input.email)
    if (meta.ipHash) await enforceRateLimit('auth.sign_in', `ip:${meta.ipHash}`)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })

    if (error || !data.user) {
      await writeAudit(ANONYMOUS, {
        action: 'auth.sign_in_failed',
        entityType: 'session',
        summary: 'Percobaan masuk gagal.',
      })
      throw new SignInFailed(error?.message ?? 'no user returned')
    }

    // The account may exist in auth but be disabled, or have no domain record.
    // Either way it is not a principal, and the session must not survive.
    const { data: principalRow } = await supabase.rpc('current_principal')
    if (!principalRow) {
      await supabase.auth.signOut()
      throw new SignInFailed('no active domain account')
    }

    const principal = parsePrincipal(principalRow)
    const accountType = principal.kind === 'admin' ? 'admin' : 'investor'

    await writeAudit(principal, {
      action: 'auth.sign_in',
      entityType: 'session',
      entityId: data.user.id,
      summary: `Masuk berhasil sebagai ${accountType}.`,
    })

    return {
      destination: safeDestination(input.redirectTo, accountType),
    }
  },
})

/**
 * Where to land after signing in.
 *
 * A caller-supplied destination is honoured only when it is an internal path
 * *and* belongs to the surface this account can actually use â€” otherwise an
 * investor following an `/admin/...` link would bounce off the proxy into a
 * confusing loop.
 */
function safeDestination(requested: string | undefined, accountType: string | undefined): string {
  const home = accountType === 'admin' ? '/admin' : '/investor'

  if (!requested || !requested.startsWith('/') || requested.startsWith('//')) return home
  if (accountType === 'admin' && requested.startsWith('/admin')) return requested
  if (accountType === 'investor' && requested.startsWith('/investor')) return requested
  return home
}

/* -------------------------------------------------------------------------- */

export const signOut = defineAction({
  access: 'authenticated',
  handler: async ({ principal, supabase }) => {
    // Write the audit record BEFORE revoking the session.
    // The audit_logs INSERT policy requires an authenticated session.
    await writeAudit(principal, {
      action: 'auth.sign_out',
      entityType: 'session',
      summary: 'Keluar dari sesi.',
    })

    // `scope: 'global'` revokes the refresh token server-side.
    // This must happen after the audit record has been written.
    await supabase.auth.signOut({ scope: 'global' })

    return { ok: true }
  },
})

/* -------------------------------------------------------------------------- */

export const requestPasswordReset = defineAction({
  access: 'public',
  input: passwordResetRequestSchema,
  handler: async ({ input, supabase }) => {
    await enforceRateLimit('auth.password_reset', input.email)

    const siteUrl = getClientEnv().NEXT_PUBLIC_SITE_URL
    // The result is intentionally ignored: the response must be identical
    // whether or not the address is registered.
    await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/atur-sandi')}`,
    })

    return { sent: true }
  },
})

export const updatePassword = defineAction({
  access: 'authenticated',
  input: passwordUpdateSchema,
  handler: async ({ principal, input, supabase }) => {
    const { error } = await supabase.auth.updateUser({ password: input.password })
    if (error) {
      throw new AppError(
        'validation_failed',
        `Password update rejected: ${error.message}`,
        'Kata sandi tidak dapat diperbarui. Pastikan memenuhi ketentuan keamanan.',
      )
    }

    await writeAudit(principal, {
      action: 'auth.password_changed',
      entityType: 'account',
      // `access: 'authenticated'` guarantees this is not an anonymous caller.
      entityId: principal.kind === 'anonymous' ? null : principal.userId,
      summary: 'Kata sandi diperbarui.',
    })

    return { updated: true }
  },
})

/* -------------------------------------------------------------------------- */

/**
 * Sign out and redirect. Separate from the action above because `redirect()`
 * throws a control-flow signal that must not be caught by the guard's error
 * handling.
 */
export async function signOutAndRedirect(): Promise<never> {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new UnauthenticatedError()

  await supabase.auth.signOut({ scope: 'global' })
  redirect('/masuk')
}
