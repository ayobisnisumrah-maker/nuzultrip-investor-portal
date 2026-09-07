import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

type AppRpcClient = {
  rpc: (
    name: string,
    args?: Record<string, never>,
  ) => Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

function appRpcClient(supabase: SupabaseClient<Database>) {
  return supabase.schema('app') as unknown as AppRpcClient
}

export async function expireMessageThreads(supabase: SupabaseClient<Database>) {
  const { data, error } = await appRpcClient(supabase).rpc('expire_message_threads')

  // This helper is reconciliation, not an authorization boundary. A transient
  // RPC failure must not make the messaging page unavailable; insert RLS still
  // blocks expired conversations at the database layer.
  if (error) return 0
  return typeof data === 'number' ? data : Number(data ?? 0)
}

export async function getUnreadMessageCount(supabase: SupabaseClient<Database>) {
  const { data, error } = await appRpcClient(supabase).rpc('unread_message_count')
  if (error) return 0

  const count = Number(data ?? 0)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}
