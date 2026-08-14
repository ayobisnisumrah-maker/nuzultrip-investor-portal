/**
 * Environment configuration — the single place in the codebase permitted to
 * read `process.env` (enforced by the `no-restricted-properties` ESLint rule).
 *
 * Two separate surfaces:
 *
 *   clientEnv  — safe to reference from browser code. Only `NEXT_PUBLIC_*`.
 *                Every key is written out literally below because Next.js
 *                inlines `process.env.NEXT_PUBLIC_X` at build time only when it
 *                appears as a static member expression.
 *
 *   serverEnv  — server-only. Contains secrets. Validated lazily on first
 *                access so that a build (which legitimately may not have
 *                production secrets available) does not fail, while a request
 *                that needs them fails immediately and loudly.
 *
 * See docs/SECURITY.md §8.
 */
import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short to be a real key'),
  NEXT_PUBLIC_SITE_URL: z.url({ error: 'NEXT_PUBLIC_SITE_URL must be a valid URL' }),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
})

export type ClientEnv = z.infer<typeof clientSchema>

const rawClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
}

function formatIssues(prefix: string, error: z.ZodError): never {
  const lines = error.issues.map(
    (issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`,
  )
  throw new Error(`${prefix}\n${lines.join('\n')}\n\nSee .env.example for the expected shape.`)
}

let cachedClientEnv: ClientEnv | null = null

/**
 * Public configuration. Safe in browser bundles — contains no secrets.
 */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv
  const parsed = clientSchema.safeParse(rawClientEnv)
  if (!parsed.success) formatIssues('Invalid public environment configuration:', parsed.error)
  cachedClientEnv = parsed.data
  return cachedClientEnv
}

/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */

const serverSchema = z.object({
  /**
   * Bypasses Row Level Security entirely. May only be used from
   * `src/server/admin/**`. See docs/SECURITY.md §3.
   */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY looks too short to be a real key'),
  /** Secret shared with the Supabase custom access-token auth hook. */
  SUPABASE_AUTH_HOOK_SECRET: z.string().min(16).optional(),
  /** Salt for hashing IP addresses in audit records (docs/SECURITY.md §9). */
  AUDIT_IP_SALT: z.string().min(16, 'AUDIT_IP_SALT must be at least 16 characters'),
  /** Salt for hashing investor identity numbers. Rotating it invalidates lookups. */
  IDENTITY_HASH_SALT: z.string().min(16, 'IDENTITY_HASH_SALT must be at least 16 characters'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cachedServerEnv: ServerEnv | null = null

/**
 * Server-only configuration. Throws if imported into a browser bundle.
 *
 * Validated lazily: a production build must not require production secrets to
 * be present, but the first request that needs one must fail immediately rather
 * than proceeding with `undefined`.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() was called in the browser. This is a bug and a security risk.')
  }
  if (cachedServerEnv) return cachedServerEnv
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_AUTH_HOOK_SECRET: process.env.SUPABASE_AUTH_HOOK_SECRET,
    AUDIT_IP_SALT: process.env.AUDIT_IP_SALT,
    IDENTITY_HASH_SALT: process.env.IDENTITY_HASH_SALT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    NODE_ENV: process.env.NODE_ENV,
  })
  if (!parsed.success) formatIssues('Invalid server environment configuration:', parsed.error)
  cachedServerEnv = parsed.data
  return cachedServerEnv
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export const isProduction = (): boolean => getClientEnv().NEXT_PUBLIC_APP_ENV === 'production'
export const isDevelopment = (): boolean => getClientEnv().NEXT_PUBLIC_APP_ENV === 'development'
