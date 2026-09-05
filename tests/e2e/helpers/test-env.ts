import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const TEST_ENV_FILE = '.env.test.local'
const DEVELOPMENT_ENV_FILE = '.env.local'

/**
 * Load exactly one local environment file for Playwright. Values from the
 * selected file deliberately replace inherited values so a shell that was
 * previously configured for production cannot leak into a local E2E run.
 */
export function loadE2EEnv(): string | null {
  const envFile = existsSync(TEST_ENV_FILE)
    ? TEST_ENV_FILE
    : existsSync(DEVELOPMENT_ENV_FILE)
      ? DEVELOPMENT_ENV_FILE
      : null

  if (!envFile) return null

  Object.assign(process.env, parseEnv(readFileSync(envFile, 'utf8')))
  return envFile
}

export function assertLocalSupabaseUrl(value: string | undefined): URL {
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for local E2E tests.')
  }

  const url = new URL(value)
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(
      `Refusing destructive E2E setup against non-local Supabase host "${url.hostname}".`,
    )
  }

  return url
}
