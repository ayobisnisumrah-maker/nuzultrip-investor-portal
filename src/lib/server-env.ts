/**
 * Server-only environment configuration.
 *
 * This module contains secrets and MUST NEVER be imported by:
 * - Client Components
 * - Browser utilities
 * - Middleware / proxy code
 *
 * The `server-only` marker provides a build-time guard against accidental
 * imports into client bundles.
 */

import 'server-only'

import { z } from 'zod'

const serverSchema = z.object({
  /**
   * Bypasses Row Level Security entirely.
   * May only be used from trusted server-side code.
   */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY looks too short to be a real key'),

  /**
   * Secret shared with the Supabase custom access-token auth hook.
   */
  SUPABASE_AUTH_HOOK_SECRET: z.string().min(16).optional(),

  /**
   * Salt for hashing IP addresses in audit and rate-limit records.
   */
  AUDIT_IP_SALT: z
    .string()
    .min(16, 'AUDIT_IP_SALT must be at least 16 characters'),

  /**
   * Salt for hashing investor identity numbers.
   * Rotating this invalidates deterministic lookups.
   */
  IDENTITY_HASH_SALT: z
    .string()
    .min(16, 'IDENTITY_HASH_SALT must be at least 16 characters'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cachedServerEnv: ServerEnv | null = null

function formatIssues(prefix: string, error: z.ZodError): never {
  const lines = error.issues.map(
    (issue) =>
      `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`,
  )

  throw new Error(
    `${prefix}\n${lines.join('\n')}\n\nSee .env.example for the expected shape.`,
  )
}

/**
 * Server-only configuration.
 *
 * Validation is lazy so builds that do not execute privileged code do not
 * require runtime production secrets.
 */
export function getServerEnv(): ServerEnv {
  // Defense in depth: `server-only` protects bundling, while this runtime
  // guard prevents accidental secret resolution in browser-like environments.
  if (typeof window !== 'undefined') {
    throw new Error('Server environment configuration cannot be called in the browser.')
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

  if (!parsed.success) {
    formatIssues(
      'Invalid server environment configuration:',
      parsed.error,
    )
  }

  cachedServerEnv = parsed.data

  return cachedServerEnv
}
