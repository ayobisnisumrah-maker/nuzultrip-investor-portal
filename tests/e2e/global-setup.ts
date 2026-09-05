import { serviceClient } from './helpers/accounts'
import { assertLocalSupabaseUrl } from './helpers/test-env'

/**
 * Clears the rate-limit counters before the suite runs.
 *
 * Every request in a local run originates from 127.0.0.1, so the per-IP
 * sign-in budget — eight attempts per fifteen minutes, which is correct for
 * production — is exhausted after a couple of runs and every later test fails
 * with "too many attempts".
 *
 * The fix is to reset the counters, **not** to raise the limit. Loosening a
 * security control so that tests pass is how controls quietly stop existing;
 * the production value stays exactly as it is.
 */
export default async function globalSetup(): Promise<void> {
  // This setup deletes shared counters. Keep the guard immediately adjacent to
  // the destructive operation, even though playwright.config validates too.
  assertLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabase = serviceClient()

  const { error } = await supabase
    .from('rate_limits')
    .delete()
    // A delete needs a predicate; this one matches every row.
    .not('bucket', 'is', null)

  if (error) {
    throw new Error(
      `Failed to clear rate limits before the E2E run: ${error.message}\n` +
        'Check that the local Supabase stack is running and SUPABASE_SERVICE_ROLE_KEY is set.',
    )
  }
}
