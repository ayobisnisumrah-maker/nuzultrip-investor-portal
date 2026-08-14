import 'server-only'

import { cache } from 'react'
import { parsePrincipal, type Principal, ANONYMOUS } from '@/core/auth/principal'
import { InternalError } from '@/core/errors'
import { getServerSupabase } from '@/server/supabase/server'

/**
 * Resolve the calling principal.
 *
 * One `current_principal()` round trip returns identity, role and the complete
 * effective permission set. `cache()` scopes the result to the request, so a
 * page that calls `requirePermission` five times pays for one query.
 *
 * The result reflects the **database**, not the JWT. That is deliberate: an
 * account disabled a moment ago must lose access on the next request, and a
 * token cannot be un-issued (docs/RBAC.md §4).
 */
export const getPrincipal = cache(async (): Promise<Principal> => {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase.rpc('current_principal')

  if (error) {
    // A failure here must never be treated as "no permissions" and quietly
    // continue — that would turn a transient database problem into a silent
    // authorisation change. Fail loudly instead.
    throw new InternalError(`Failed to resolve the principal: ${error.message}`, error)
  }

  if (data === null) return ANONYMOUS
  return parsePrincipal(data)
})
