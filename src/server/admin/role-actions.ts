'use server'

import { z } from 'zod'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { isAdmin } from '@/core/auth/principal'
import { isPermission } from '@/core/rbac/permissions'
import { defineAction } from '@/server/auth/guards'

const roleKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'Role key hanya boleh berisi huruf kecil, angka, dan underscore.')

const createRoleSchema = z.object({
  key: roleKeySchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
  permissionIds: z.array(z.string().uuid()).default([]),
})

const updateRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
  permissionIds: z.array(z.string().uuid()).default([]),
  permissionVersion: z.number().int().positive(),
})

const deleteRoleSchema = z.object({
  roleId: z.string().uuid(),
})

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

async function assertAssignablePermissions(
  supabase: Parameters<Parameters<typeof defineAction>[0]['handler']>[0]['supabase'],
  principal: Parameters<Parameters<typeof defineAction>[0]['handler']>[0]['principal'],
  permissionIds: string[],
) {
  if (!isAdmin(principal)) {
    throw new ForbiddenError('Admin principal required.')
  }

  if (principal.roleKey === 'super_admin') return

  const ids = uniqueIds(permissionIds)

  if (ids.length === 0) return

  const { data, error } = await supabase.from('permissions').select('id, key').in('id', ids)

  if (error) {
    throw new Error(`Gagal memeriksa permission: ${error.message}`)
  }

  if ((data?.length ?? 0) !== ids.length) {
    throw new NotFoundError('Permission')
  }

  const missing = data
    .map((permission) => permission.key)
    .filter((key) => isPermission(key) && !principal.permissions.has(key))

  if (missing.length > 0) {
    throw new ForbiddenError(
      `Tidak dapat memberikan permission yang tidak dimiliki: ${missing.join(', ')}`,
      { missing },
    )
  }
}

export const createRole = defineAction({
  access: { permission: 'roles.create' },
  input: createRoleSchema,
  audit: {
    action: 'role.create',
    entityType: 'role',
  },
  handler: async ({ input, supabase, audit, principal }) => {
    const permissionIds = uniqueIds(input.permissionIds)

    await assertAssignablePermissions(supabase, principal, permissionIds)

    const { data: existing } = await supabase
      .from('roles')
      .select('id')
      .eq('key', input.key)
      .maybeSingle()

    if (existing) {
      throw new ForbiddenError(`Role key "${input.key}" sudah digunakan.`)
    }

    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        key: input.key,
        name: input.name,
        description: input.description,
        is_system: false,
      })
      .select('id, key, name, description, is_system, permission_version')
      .single()

    if (error || !role) {
      throw new Error(`Gagal membuat role: ${error?.message ?? 'Unknown error'}`)
    }

    if (permissionIds.length > 0) {
      const { data: permissions, error: permissionsError } = await supabase
        .from('permissions')
        .select('id, key')
        .in('id', permissionIds)

      if (permissionsError) {
        throw new Error(`Gagal membaca permission: ${permissionsError.message}`)
      }

      if ((permissions?.length ?? 0) !== permissionIds.length) {
        throw new NotFoundError('Permission')
      }

      const { error: insertError } = await supabase.from('role_permissions').insert(
        permissionIds.map((permissionId) => ({
          role_id: role.id,
          permission_id: permissionId,
        })),
      )

      if (insertError) {
        throw new Error(`Role dibuat tetapi permission gagal disimpan: ${insertError.message}`)
      }
    }

    audit({
      entityId: role.id,
      summary: `Role baru dibuat: ${role.name}.`,
      changes: {
        key: { before: null, after: role.key },
        name: { before: null, after: role.name },
        description: { before: null, after: role.description },
        permissions: { before: [], after: permissionIds },
      },
    })

    return {
      id: role.id,
      key: role.key,
      name: role.name,
    }
  },
})

export const updateRole = defineAction({
  access: { permission: 'roles.update' },
  input: updateRoleSchema,
  audit: {
    action: 'role.update',
    entityType: 'role',
  },
  handler: async ({ input, supabase, audit, principal }) => {
    const permissionIds = uniqueIds(input.permissionIds)

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, key, name, description, is_system, permission_version')
      .eq('id', input.roleId)
      .maybeSingle()

    if (roleError) {
      throw new Error(`Gagal membaca role: ${roleError.message}`)
    }

    if (!role) {
      throw new NotFoundError('Role')
    }

    if (role.key === 'super_admin') {
      throw new ForbiddenError('Role Super Admin tidak dapat diubah melalui Role Editor.')
    }

    await assertAssignablePermissions(supabase, principal, permissionIds)

    /*
     * Read the current permission set only for audit/comparison.
     *
     * The actual mutation is performed by the PostgreSQL RPC below,
     * which updates role metadata and role_permissions atomically.
     */
    const { data: currentPermissions, error: currentError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id)

    if (currentError) {
      throw new Error(`Gagal membaca permission role: ${currentError.message}`)
    }

    const currentIds = [...new Set((currentPermissions ?? []).map((item) => item.permission_id))]

    const { data: updatedRole, error: updateError } = await supabase.rpc(
      'update_role_permissions_atomic',
      {
        p_role_id: role.id,
        p_name: input.name,
        p_description: input.description,
        p_permission_ids: permissionIds,
        p_expected_permission_version: input.permissionVersion,
      },
    )

    if (updateError) {
      if (
        updateError.code === '40001' ||
        updateError.message.includes('ROLE_PERMISSION_VERSION_CONFLICT')
      ) {
        throw new ForbiddenError(
          'Permission role sudah berubah oleh administrator lain. Muat ulang halaman sebelum menyimpan.',
        )
      }

      if (
        updateError.code === '42501' ||
        updateError.message.includes('System roles cannot be modified')
      ) {
        throw new ForbiddenError('Role system tidak dapat diubah melalui Role Editor.')
      }

      if (updateError.code === 'P0002') {
        throw new NotFoundError('Role')
      }

      throw new Error(`Gagal memperbarui role secara atomik: ${updateError.message}`)
    }

    const result = updatedRole?.[0]

    if (!result) {
      throw new Error('Role berhasil diproses tetapi hasil transaksi tidak dikembalikan.')
    }

    const previousPermissionIds = currentIds
    const nextPermissionIds = permissionIds

    audit({
      entityId: role.id,
      summary: `Role diperbarui: ${role.name}.`,
      changes: {
        name: {
          before: role.name,
          after: result.role_name,
        },
        description: {
          before: role.description,
          after: result.role_description,
        },
        permissions: {
          before: previousPermissionIds,
          after: nextPermissionIds,
        },
        permissionVersion: {
          before: role.permission_version,
          after: result.permission_version,
        },
      },
    })

    return {
      id: result.role_id,
      key: result.role_key,
      name: result.role_name,
      permissionVersion: result.permission_version,
    }
  },
})
export const deleteRole = defineAction({
  access: { permission: 'roles.delete' },
  input: deleteRoleSchema,
  audit: {
    action: 'role.delete',
    entityType: 'role',
  },
  handler: async ({ input, supabase, audit }) => {
    const { data: role, error } = await supabase
      .from('roles')
      .select('id, key, name, description, is_system')
      .eq('id', input.roleId)
      .maybeSingle()

    if (error || !role) {
      throw new NotFoundError('Role')
    }

    if (role.is_system || role.key === 'super_admin') {
      throw new ForbiddenError('Role system tidak dapat dihapus.')
    }

    const { count, error: countError } = await supabase
      .from('admins')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', role.id)

    if (countError) {
      throw new Error(`Gagal memeriksa administrator role: ${countError.message}`)
    }

    if ((count ?? 0) > 0) {
      throw new ForbiddenError('Role masih digunakan oleh administrator dan tidak dapat dihapus.')
    }

    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', role.id)
      .eq('is_system', false)

    if (deleteError) {
      throw new Error(`Gagal menghapus role: ${deleteError.message}`)
    }

    audit({
      entityId: role.id,
      summary: `Role dihapus: ${role.name}.`,
      changes: {
        key: { before: role.key, after: null },
        name: { before: role.name, after: null },
        description: { before: role.description, after: null },
      },
    })

    return { id: role.id }
  },
})
