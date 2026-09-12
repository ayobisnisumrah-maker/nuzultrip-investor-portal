import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AdminPrincipal, InvestorPrincipal } from '@/core/auth/principal'
import type { Permission } from '@/core/rbac/permissions'
import { hasPermission } from '@/core/auth/principal'
import { getPrincipal } from './session'

const REQUEST_PATH_HEADER = 'x-nuzultrip-request-path'

/**
 * Page-level guards.
 *
 * These decide what a *page* does when the principal is wrong — redirect to
 * sign-in, or render a forbidden state. They are not a substitute for the
 * action guards: rendering nothing is not the same as refusing to act, and
 * every mutation is checked again at its own entry point and once more by RLS.
 */

function signInWith(pathname: string): never {
  redirect(`/masuk?lanjut=${encodeURIComponent(pathname)}`)
}

function isSafeInternalPath(pathname: string): boolean {
  return pathname.startsWith('/') && !pathname.startsWith('//')
}

async function resolveRequestedPath(explicitPathname: string | undefined, fallback: string) {
  if (explicitPathname) return explicitPathname

  const requestHeaders = await headers()
  const requestedPath = requestHeaders.get(REQUEST_PATH_HEADER)

  return requestedPath && isSafeInternalPath(requestedPath) ? requestedPath : fallback
}

export async function requireAdminPage(pathname?: string): Promise<AdminPrincipal> {
  const requestedPath = await resolveRequestedPath(pathname, '/admin')
  const principal = await getPrincipal()

  if (principal.kind === 'anonymous') signInWith(requestedPath)
  // An investor who lands on an admin URL is sent to their own surface rather
  // than shown a forbidden page: it is almost always a stale link, not an
  // attempt, and a dead end helps nobody.
  if (principal.kind === 'investor') redirect('/investor')

  return principal
}

export async function requireInvestorPage(pathname?: string): Promise<InvestorPrincipal> {
  const requestedPath = await resolveRequestedPath(pathname, '/investor')
  const principal = await getPrincipal()

  if (principal.kind === 'anonymous') signInWith(requestedPath)
  if (principal.kind === 'admin') redirect('/admin')

  return principal
}

/**
 * Operational investor pages are available only while the lifecycle grants
 * data access. The investor overview deliberately remains outside this guard so
 * submitted, under-review, rejected, and inactive investors can still see their
 * own application/account status and status history.
 */
export async function requireInvestorDataPage(
  pathname?: string,
): Promise<InvestorPrincipal> {
  const requestedPath = await resolveRequestedPath(pathname, '/investor')
  const principal = await requireInvestorPage(requestedPath)

  if (!principal.hasDataAccess) redirect('/investor')

  return principal
}

/**
 * Returns the admin principal only if they hold the permission, otherwise
 * `null` — so the page can render a designed forbidden state rather than
 * bouncing the user somewhere they did not ask to go.
 */
export async function adminWithPermission(
  permission: Permission,
  pathname: string,
): Promise<AdminPrincipal | null> {
  const principal = await requireAdminPage(pathname)
  return hasPermission(principal, permission) ? principal : null
}
