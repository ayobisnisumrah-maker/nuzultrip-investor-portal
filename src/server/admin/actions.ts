'use server'

import { z } from 'zod'
import { createAdminSchema } from '@/core/auth/schemas'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'
import { getServiceRoleClient } from './service-client'
import { provisionAdmin } from './provisioning'

export const createAdmin = defineAction({
  access: { permission: 'admins.create' },
  input: createAdminSchema,
  audit: { action: 'admin.create', entityType: 'admin' },

  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data: role, error } = await supabase
      .from('roles')
      .select('id, key, name')
      .eq('id', input.roleId)
      .maybeSingle()

    if (error || !role) {
      throw new NotFoundError('Role')
    }

    const assignableOperationalRoles = new Set([
      'admin_investor_relations',
      'admin_document_verification',
      'admin_finance_reporting',
      'admin_portal_communications',
    ])

    if (!assignableOperationalRoles.has(role.key)) {
      throw new ForbiddenError(
        'Role tersebut tidak dapat diberikan melalui provisioning Administrator.',
        { roleKey: role.key },
      )
    }

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

    /**
     * Pass the validated human-readable role name into provisioning.
     *
     * Supabase Auth needs this metadata before sending the invitation email,
     * allowing the email template to safely render {{ .Data.role_name }}.
     */
    const provisioned = await provisionAdmin(
      input,
      principal.adminId,
      role.name,
    )

    audit({
      entityId: provisioned.userId,
      summary: `Administrator baru dibuat: ${input.email} (${role.name}).`,
      changes: {
        email: {
          before: null,
          after: input.email,
        },
        role: {
          before: null,
          after: role.key,
        },
      },
    })

    return {
      userId: provisioned.userId,
      email: input.email,
    }
  },
})

const updateAdminSchema = z.object({
  adminId: z.uuid('Administrator tidak valid.'),
  fullName: z.string().trim().min(2, 'Nama wajib diisi.').max(200),
  roleId: z.uuid('Role tidak valid.'),
  title: z.string().trim().max(120).optional().or(z.literal('')),
})

export const updateAdmin = defineAction({
  access: { permission: 'admins.update' },
  input: updateAdminSchema,
  audit: { action: 'admin.update', entityType: 'admin' },

  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data: target, error: targetError } = await supabase
      .from('admins')
      .select('id, role_id, title, is_active')
      .eq('id', input.adminId)
      .maybeSingle()

    if (targetError || !target) {
      throw new NotFoundError('Administrator')
    }

    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('id, full_name, email')
      .eq('id', input.adminId)
      .maybeSingle()

    if (accountError || !account) {
      throw new NotFoundError('Akun administrator')
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, key, name, description, is_system')
      .eq('id', input.roleId)
      .maybeSingle()

    if (roleError || !role) {
      throw new NotFoundError('Role')
    }

    /*
     * Super Admin adalah system authority.
     * Admin Internal juga bukan role yang boleh diberikan melalui
     * lifecycle Administrator.
     */
    const assignableOperationalRoles = new Set([
      'admin_investor_relations',
      'admin_document_verification',
      'admin_finance_reporting',
      'admin_portal_communications',
    ])

    if (!assignableOperationalRoles.has(role.key)) {
      throw new ForbiddenError(
        'Role tersebut tidak dapat diberikan melalui pengelolaan Administrator.',
        { roleKey: role.key },
      )
    }

    /*
     * Jangan izinkan administrator mengganti role miliknya sendiri.
     * Guard database juga menegakkan aturan ini.
     */
    if (principal.adminId === input.adminId && target.role_id !== input.roleId) {
      throw new ForbiddenError(
        'Anda tidak dapat mengubah role administrator milik sendiri.',
      )
    }

    /*
     * Non-Super Admin hanya boleh memberikan role yang permission-nya
     * berada dalam permission set miliknya sendiri.
     */
    if (principal.roleKey !== 'super_admin') {
      const { data: grants, error: grantsError } = await supabase
        .from('role_permissions')
        .select('permissions(key)')
        .eq('role_id', role.id)

      if (grantsError) {
        throw new ForbiddenError('Permission role tidak dapat diverifikasi.')
      }

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

    const serviceClient = (
      await import('./service-client')
    ).getServiceRoleClient()

    const { error: rpcError } = await serviceClient.rpc('update_admin_account', {
      p_admin_id: input.adminId,
      p_full_name: input.fullName,
      p_role_id: input.roleId,
      p_title: input.title?.trim() || undefined,
    })

    if (rpcError) {
      throw new ForbiddenError(
        `Gagal memperbarui administrator: ${rpcError.message}`,
      )
    }

    const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(
      input.adminId,
      {
        user_metadata: {
          full_name: input.fullName.trim(),
        },
      },
    )

    if (authUpdateError) {
      throw new ForbiddenError(
        'Gagal memperbarui metadata akun Auth: ' + authUpdateError.message,
      )
    }

    audit({
      entityId: input.adminId,
      summary: `Administrator diperbarui: ${account.email}.`,
      changes: {
        fullName: {
          before: account.full_name,
          after: input.fullName,
        },
        role: {
          before: target.role_id,
          after: role.key,
        },
        title: {
          before: target.title,
          after: input.title?.trim() || null,
        },
      },
    })

    return {
      userId: input.adminId,
      email: account.email,
    }
  },
})

/* -------------------------------------------------------------------------- */
/* Administrator lifecycle                                                    */
/* -------------------------------------------------------------------------- */

export const activateAdmin = defineAction({
  access: { permission: 'admins.update' },
  input: z.object({
    adminId: z.uuid('Administrator tidak valid.'),
  }),
  audit: { action: 'admin.activate', entityType: 'admin' },

  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data: target, error: targetError } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('id', input.adminId)
      .maybeSingle()

    if (targetError || !target) {
      throw new NotFoundError('Administrator')
    }

    const serviceClient = getServiceRoleClient()

    const { error: rpcError } = await serviceClient.rpc(
      'activate_admin_account',
      {
        p_admin_id: input.adminId,
      },
    )

    if (rpcError) {
      throw new ForbiddenError(
        `Gagal mengaktifkan administrator: ${rpcError.message}`,
      )
    }

    audit({
      entityId: input.adminId,
      summary: 'Administrator diaktifkan.',
      changes: {
        isActive: {
          before: target.is_active,
          after: true,
        },
      },
    })

    return {
      userId: input.adminId,
      status: 'active' as const,
    }
  },
})

export const deactivateAdmin = defineAction({
  access: { permission: 'admins.disable' },
  input: z.object({
    adminId: z.uuid('Administrator tidak valid.'),
    reason: z.string().trim().max(500).optional().or(z.literal('')),
  }),
  audit: { action: 'admin.deactivate', entityType: 'admin' },

  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    if (principal.adminId === input.adminId) {
      throw new ForbiddenError(
        'Anda tidak dapat menonaktifkan administrator milik sendiri.',
      )
    }

    const { data: target, error: targetError } = await supabase
      .from('admins')
      .select('id, role_id, is_active')
      .eq('id', input.adminId)
      .maybeSingle()

    if (targetError || !target) {
      throw new NotFoundError('Administrator')
    }

    if (!target.is_active) {
      return {
        userId: input.adminId,
        status: 'disabled' as const,
      }
    }

    const serviceClient = getServiceRoleClient()

    const { error: rpcError } = await serviceClient.rpc(
      'deactivate_admin_account',
      {
        p_admin_id: input.adminId,
        p_reason: input.reason?.trim() || undefined,
      },
    )

    if (rpcError) {
      throw new ForbiddenError(
        `Gagal menonaktifkan administrator: ${rpcError.message}`,
      )
    }

    audit({
      entityId: input.adminId,
      summary: 'Administrator dinonaktifkan.',
      changes: {
        isActive: {
          before: target.is_active,
          after: false,
        },
        reason: {
          before: null,
          after: input.reason?.trim() || null,
        },
      },
    })

    return {
      userId: input.adminId,
      status: 'disabled' as const,
    }
  },
})

/* -------------------------------------------------------------------------- */
/* Administrator permanent deletion                                           */
/* -------------------------------------------------------------------------- */

export const deleteAdmin = defineAction({
  /*
   * Permanent deletion is a system-authority operation.
   * It must never be delegated through a normal RBAC permission.
   * The handler below enforces the Super Admin role explicitly.
   */
  access: 'admin',
  input: z.object({
    adminId: z.uuid('Administrator tidak valid.'),
  }),
  audit: { action: 'admin.delete', entityType: 'admin' },

  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    /*
     * Permanent deletion is intentionally restricted to Super Admin.
     * There is no admins.delete permission because this is a destructive
     * system-level operation.
     */
    if (principal.roleKey !== 'super_admin') {
      throw new ForbiddenError(
        'Hanya Super Admin yang dapat menghapus administrator secara permanen.',
      )
    }

    /*
     * Never allow an administrator to delete their own account.
     * The last Super Admin is also protected by the database trigger.
     */
    if (principal.adminId === input.adminId) {
      throw new ForbiddenError(
        'Anda tidak dapat menghapus akun administrator milik sendiri.',
      )
    }

    const { data: target, error: targetError } = await supabase
      .from('admins')
      .select('id, role_id, is_active')
      .eq('id', input.adminId)
      .maybeSingle()

    if (targetError || !target) {
      throw new NotFoundError('Administrator')
    }

    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('id, email, full_name')
      .eq('id', input.adminId)
      .maybeSingle()

    if (accountError || !account) {
      throw new NotFoundError('Akun administrator')
    }

    /*
     * The Auth Admin API requires service-role access.
     * Deleting auth.users causes the existing FK CASCADE to remove the
     * corresponding user_accounts and admins records.
     */
    const serviceClient = (
      await import('./service-client')
    ).getServiceRoleClient()

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(
      input.adminId,
    )

    if (deleteError) {
      throw new ForbiddenError(
        `Gagal menghapus administrator: ${deleteError.message}`,
      )
    }

    audit({
      entityId: input.adminId,
      summary: `Administrator dihapus secara permanen: ${account.email}.`,
      changes: {
        email: {
          before: account.email,
          after: null,
        },
        fullName: {
          before: account.full_name,
          after: null,
        },
        isActive: {
          before: target.is_active,
          after: null,
        },
      },
    })

    return {
      userId: input.adminId,
      email: account.email,
      deleted: true as const,
    }
  },
})