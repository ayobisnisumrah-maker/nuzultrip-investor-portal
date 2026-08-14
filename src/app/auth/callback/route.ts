import { NextResponse } from 'next/server'
import { z } from 'zod'
import { defineRoute } from '@/server/auth/guards'
import { getServerSupabase } from '@/server/supabase/server'
import { getClientEnv } from '@/lib/env'

/**
 * Auth callback.
 *
 * Exchanges a one-time code from an email link (signup confirmation, password
 * recovery, admin invite) for a session, then redirects.
 *
 * The `next` parameter is validated as an internal path. Echoing back an
 * attacker-supplied absolute URL here would turn every confirmation email into
 * an open redirect on a trusted domain.
 */
const callbackSchema = z.object({
  code: z.string().min(1).max(512).optional(),
  next: z.string().max(512).optional(),
  error: z.string().max(256).optional(),
  error_description: z.string().max(512).optional(),
})

function internalPath(next: string | undefined, fallback: string): string {
  if (!next) return fallback
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}

export const GET = defineRoute({
  access: 'public',
  input: callbackSchema,
  handler: async ({ input }) => {
    const origin = getClientEnv().NEXT_PUBLIC_SITE_URL

    if (input.error || !input.code) {
      const reason = input.error_description ?? input.error ?? 'missing_code'
      return NextResponse.redirect(
        `${origin}/masuk?galat=${encodeURIComponent(reason.slice(0, 200))}`,
      )
    }

    const supabase = await getServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(input.code)

    if (error) {
      return NextResponse.redirect(`${origin}/masuk?galat=tautan_tidak_valid`)
    }

    // Where the user lands depends on what kind of account they are, not on
    // what the link asked for — a recovery link for an admin must not drop them
    // into the investor surface.
    const { data: principal } = await supabase.rpc('current_principal')
    const accountType = (principal as { accountType?: string } | null)?.accountType
    const fallback = accountType === 'admin' ? '/admin' : '/investor'

    return NextResponse.redirect(`${origin}${internalPath(input.next, fallback)}`)
  },
})
