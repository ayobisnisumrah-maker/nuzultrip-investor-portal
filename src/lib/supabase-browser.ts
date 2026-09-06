'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getClientEnv } from '@/lib/env'
import type { Database } from '@/types/database'

let client: SupabaseClient<Database> | null = null

export function getBrowserSupabase(): SupabaseClient<Database> {
  if (client) return client

  const env = getClientEnv()
  client = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  return client
}
