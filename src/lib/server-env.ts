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
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY looks too short to be a real key'),

  /** Secret shared with the Supabase custom access-token auth hook. */
  SUPABASE_AUTH_HOOK_SECRET: z.string().min(16).optional(),

  /** Salt for hashing IP addresses in audit and rate-limit records. */
  AUDIT_IP_SALT: z.string().min(16, 'AUDIT_IP_SALT must be at least 16 characters'),

  /** Salt for hashing investor identity numbers. */
  IDENTITY_HASH_SALT: z.string().min(16, 'IDENTITY_HASH_SALT must be at least 16 characters'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  /** WhatsApp Cloud API secrets. Optional until WhatsApp delivery is enabled. */
  WHATSAPP_ACCESS_TOKEN: z.string().min(20).optional(),
  WHATSAPP_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).optional(),

  /** Halo Nuzul server-only OpenAI configuration. */
  OPENAI_API_KEY: z.string().min(20).optional(),
  HALO_NUZUL_MODEL: z.string().trim().min(1).default('gpt-5.6-luna'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cachedServerEnv: ServerEnv | null = null

function formatIssues(prefix: string, error: z.ZodError): never {
  const lines = error.issues.map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
  throw new Error(`${prefix}\n${lines.join('\n')}\n\nSee .env.example for the expected shape.`)
}

/** Server-only configuration, validated lazily at runtime. */
export function getServerEnv(): ServerEnv {
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
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || undefined,
    WHATSAPP_GRAPH_API_VERSION: process.env.WHATSAPP_GRAPH_API_VERSION || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    HALO_NUZUL_MODEL: process.env.HALO_NUZUL_MODEL || undefined,
    NODE_ENV: process.env.NODE_ENV,
  })

  if (!parsed.success) formatIssues('Invalid server environment configuration:', parsed.error)

  cachedServerEnv = parsed.data
  return cachedServerEnv
}
