import 'server-only'

import { cache } from 'react'
import { parsePrincipal, type Principal, ANONYMOUS } from '@/core/auth/principal'
import { InternalError } from '@/core/errors'
import { getServerSupabase } from '@/server/supabase/server'

/**
 * Resolve the calling principal.
 *
 * Anonymous requests are identified by the absence of a Supabase session and
 * never call the privileged `current_principal()` RPC. When a session exists,
 * the RPC remains the authoritative source for identity, role and the complete
 * effective permission set.
 *
 * `getSession()` is deliberately used only as an absence check. Its embedded
 * user data is not trusted for authorisation; a forged/stale session still has
 * to pass PostgREST JWT verification and the database-backed principal resolver.
 *
 * `cache()` scopes the result to the request, so a page that calls
 * `requirePermission` five times resolves the principal once.
 */
export const getPrincipal = cache(async (): Promise<Principal> => {
  const supabase = await getServerSupabase()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new InternalError(`Failed to inspect the auth session: ${sessionError.message}`, sessionError)
  }

  if (!session) return ANONYMOUS

  const { data, error } = await supabase.rpc('current_principal')

  if (error) {
    // A failure for a request that claims to have a session must never be
    // treated as "no permissions". A stale/forged token, database outage or
    // RPC failure therefore stays fail-closed and visible.
    throw new InternalError(`Failed to resolve the principal: ${error.message}`, error)
  }

  if (data === null) return ANONYMOUS
  return parsePrincipal(data)
})
