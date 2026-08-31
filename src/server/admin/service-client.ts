import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getClientEnv } from '@/lib/env'
import { getServerEnv } from '@/lib/server-env'
import type { Database } from '@/types/database'

/**
 * THE SERVICE-ROLE CLIENT — READ THIS BEFORE USING IT.
 *
 * This client holds a key with the `bypassrls` attribute. Row Level Security
 * does not apply to it. It is, effectively, root.
 *
 * It may only be imported from `src/server/admin/**`, which is enforced by an
 * ESLint rule and by a check in CI (docs/SECURITY.md §3).
 *
 * The complete list of permitted uses:
 *
 *   1. Creating and deleting auth users during provisioning. The Auth admin API
 *      requires it, and no RLS policy could express "create an account".
 *   2. Minting signed storage URLs, after the caller's permission to the owning
 *      row has already been checked with the request-scoped client.
 *   3. Draining the notification outbox from a background worker, which has no
 *      user session to act as.
 *   4. Scheduled maintenance (sweeping unfinalised uploads).
 *   5. Rate-limit counters, which no client may reach — otherwise one caller
 *      could exhaust another's quota by naming their bucket.
 *   6. Audit records for anonymous actions. `anon` holds no INSERT on
 *      `audit_logs` on purpose, so that nobody can flood the trail directly.
 *
 * Every call site must carry a comment saying why RLS cannot serve the need,
 * and every operation must write an audit record.
 *
 * If you are reaching for this because a query "doesn't work", the answer is
 * almost always a missing policy, not a missing bypass.
 */
let client: SupabaseClient<Database> | null = null

export function getServiceRoleClient(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'The service-role client was constructed in the browser. This is a critical security bug.',
    )
  }

  client ??= createClient<Database>(
    getClientEnv().NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // This client is never a user. It must not persist or refresh a
        // session, and must not pick one up from anywhere.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      // No realtime: nothing should be broadcasting with RLS disabled.
      realtime: { params: { eventsPerSecond: 0 } },
    },
  )
  return client
}
