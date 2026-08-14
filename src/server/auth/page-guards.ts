import 'server-only'

import { redirect } from 'next/navigation'
import type { AdminPrincipal, InvestorPrincipal } from '@/core/auth/principal'
import type { Permission } from '@/core/rbac/permissions'
import { hasPermission } from '@/core/auth/principal'
import { getPrincipal } from './session'

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

export async function requireAdminPage(pathname = '/admin'): Promise<AdminPrincipal> {
  const principal = await getPrincipal()

  if (principal.kind === 'anonymous') signInWith(pathname)
  // An investor who lands on an admin URL is sent to their own surface rather
  // than shown a forbidden page: it is almost always a stale link, not an
  // attempt, and a dead end helps nobody.
  if (principal.kind === 'investor') redirect('/investor')

  return principal
}

export async function requireInvestorPage(pathname = '/investor'): Promise<InvestorPrincipal> {
  const principal = await getPrincipal()

  if (principal.kind === 'anonymous') signInWith(pathname)
  if (principal.kind === 'admin') redirect('/admin')

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
