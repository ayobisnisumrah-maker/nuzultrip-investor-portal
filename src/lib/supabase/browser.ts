import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getClientEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * The browser Supabase client.
 *
 * It carries the **publishable** key, which is not a secret and grants nothing
 * on its own: every request it makes is subject to Row Level Security. It is
 * used for the realtime socket and for client-side reads that are already
 * permitted by policy.
 *
 * There is exactly one instance per tab. Creating more would open a second
 * realtime connection and duplicate every auth state listener.
 */
let client: SupabaseClient<Database> | null = null

export function getBrowserSupabase(): SupabaseClient<Database> {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserSupabase() was called on the server. Use the server client instead.')
  }
  const env = getClientEnv()
  client ??= createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        // The session lives in HTTP-only cookies written by the server, so the
        // browser client must not try to own it.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        // A modest cap: a burst of events should never be able to drive the
        // client into a reconnect loop.
        params: { eventsPerSecond: 10 },
      },
    },
  )
  return client
}
