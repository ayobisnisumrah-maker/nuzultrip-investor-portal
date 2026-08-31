/**
 * Public environment configuration.
 *
 * This module is safe to import from browser code and middleware.
 * It MUST contain only NEXT_PUBLIC_* variables.
 *
 * Server secrets live exclusively in ./server-env.ts.
 */

import { z } from 'zod'

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short to be a real key'),
  NEXT_PUBLIC_SITE_URL: z.url({
    error: 'NEXT_PUBLIC_SITE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
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
    (issue) =>
      `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`,
  )

  throw new Error(
    `${prefix}\n${lines.join('\n')}\n\nSee .env.example for the expected shape.`,
  )
}

let cachedClientEnv: ClientEnv | null = null

/**
 * Public configuration.
 *
 * Safe for browser bundles because this module contains only NEXT_PUBLIC_* keys.
 */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv

  const parsed = clientSchema.safeParse(rawClientEnv)

  if (!parsed.success) {
    formatIssues(
      'Invalid public environment configuration:',
      parsed.error,
    )
  }

  cachedClientEnv = parsed.data

  return cachedClientEnv
}

export const isProduction = (): boolean =>
  getClientEnv().NEXT_PUBLIC_APP_ENV === 'production'

export const isDevelopment = (): boolean =>
  getClientEnv().NEXT_PUBLIC_APP_ENV === 'development'
