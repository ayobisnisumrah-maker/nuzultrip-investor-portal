'use server'

import { createAdminSchema } from '@/core/auth/schemas'
import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import { provisionAdmin } from './provisioning'

/**
 * Administrator management.
 *
 * The escalation rules are enforced here for a clear error message, and again
 * by database triggers because the application layer is assumed to be fallible
 * (docs/RBAC.md §3).
 */

export const createAdmin = defineAction({
  access: { permission: 'admins.create' },
  input: createAdminSchema,
  audit: { action: 'admin.create', entityType: 'admin' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')

    const { data: role, error } = await supabase
      .from('roles')
      .select('id, key, name')
      .eq('id', input.roleId)
      .maybeSingle()

    if (error || !role) throw new NotFoundError('Role')

    // Only a Super Admin may confer Super Admin. Checked here so the caller
    // gets a comprehensible message rather than a raw trigger exception; the
    // trigger is what actually guarantees it.
    if (role.key === 'super_admin' && principal.roleKey !== 'super_admin') {
      throw new ForbiddenError('Only a Super Admin may assign the Super Admin role.', {
        roleKey: role.key,
      })
    }

    // You cannot hand out permissions you do not hold yourself.
    if (principal.roleKey !== 'super_admin') {
      const { data: grants } = await supabase
        .from('role_permissions')
        .select('permissions(key)')
        .eq('role_id', role.id)

      const missing = (grants ?? [])
        .map((row) => row.permissions?.key)
        .filter((key): key is string => Boolean(key))
        .filter((key) => !principal.permissions.has(key as never))

      if (missing.length > 0) {
        throw new ForbiddenError(
          `Cannot assign a role holding permissions the actor lacks: ${missing.join(', ')}`,
          { missing },
        )
      }
    }

    const provisioned = await provisionAdmin(input, principal.adminId)

    audit({
      entityId: provisioned.userId,
      summary: `Administrator baru dibuat: ${input.email} (${role.name}).`,
      changes: {
        email: { before: null, after: input.email },
        role: { before: null, after: role.key },
      },
    })

    return { userId: provisioned.userId, email: input.email }
  },
})
