'use server'

import { z } from 'zod'
import { emailSchema, passwordSchema } from '@/core/auth/schemas'
import { ANONYMOUS } from '@/core/auth/principal'
import { defineAction } from '@/server/auth/guards'
import { getRequestMeta, writeAudit } from '@/server/audit'
import { enforceRateLimit } from './rate-limit'
import { bootstrapFirstSuperAdmin, hasAnyAdmin } from './provisioning'

/**
 * First-run setup.
 *
 * `access: 'public'` because there is, by definition, nobody to authenticate
 * against yet. What makes it safe is that it **refuses to run once any
 * administrator exists** — checked here and again inside
 * `bootstrapFirstSuperAdmin`, so it closes permanently the moment setup
 * completes and cannot be reopened from the outside.
 */
const bootstrapSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nama wajib diisi.').max(200),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['confirmPassword'],
  })

export const createFirstSuperAdmin = defineAction({
  access: 'public',
  input: bootstrapSchema,
  handler: async ({ input }) => {
    const meta = await getRequestMeta()
    // Rate-limited even though it can only succeed once: without this, the
    // endpoint is a free password-hashing oracle before setup completes.
    await enforceRateLimit('auth.sign_in', `bootstrap:${meta.ipHash ?? input.email}`)

    const created = await bootstrapFirstSuperAdmin({
      email: input.email,
      fullName: input.fullName,
      password: input.password,
    })

    await writeAudit(ANONYMOUS, {
      action: 'admin.bootstrap',
      entityType: 'admin',
      entityId: created.userId,
      summary: `Super Admin pertama dibuat untuk ${input.email}.`,
    })

    return { email: input.email }
  },
})

/** Whether the setup page should still exist. */
export async function isSetupComplete(): Promise<boolean> {
  return await hasAnyAdmin()
}
