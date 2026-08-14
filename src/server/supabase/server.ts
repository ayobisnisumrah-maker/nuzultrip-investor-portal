import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getClientEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * The request-scoped Supabase client.
 *
 * It carries the publishable key and the caller's session cookie, so **every**
 * query it makes is evaluated by Row Level Security as that principal. This is
 * the client all application code should use. The service-role client
 * (src/server/admin) bypasses RLS and is confined to a handful of call sites.
 *
 * `cache()` scopes one instance to the request, so repeated calls within a
 * render share a connection and a resolved session.
 */
export const getServerSupabase = cache(async (): Promise<SupabaseClient<Database>> => {
  const cookieStore = await cookies()
  const env = getClientEnv()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components cannot set cookies. That is expected and safe:
            // the proxy (src/proxy.ts) refreshes the session on every request,
            // so a token rotated during a render is persisted there instead.
          }
        },
      },
    },
  )
})

/**
 * The authenticated user, verified against the auth server rather than read
 * from the cookie.
 *
 * `getSession()` returns whatever the cookie claims, unverified — it must never
 * be used for an authorisation decision. `getUser()` validates the token, which
 * is the whole point.
 */
export const getAuthUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
})
