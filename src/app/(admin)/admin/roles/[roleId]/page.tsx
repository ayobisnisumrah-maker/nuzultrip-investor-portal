import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireAdminPage } from '@/server/auth/page-guards'
import { hasPermission } from '@/core/auth/principal'
import { permissionsByModule } from '@/core/rbac/permissions'
import { getServerSupabase } from '@/server/supabase/server'
import { RoleEditor } from '@/features/admin/role-editor'

export default async function AdminRoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const { roleId } = await params

  const principal = await requireAdminPage(`/admin/roles/${roleId}`)

  if (!hasPermission(principal, 'roles.view')) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Anda tidak memiliki izin untuk melihat Role & Permission.
        </p>
      </main>
    )
  }

  const supabase = await getServerSupabase()

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select(
      'id, key, name, description, is_system, permission_version',
    )
    .eq('id', roleId)
    .maybeSingle()

  if (roleError) {
    throw new Error(`Gagal mengambil role: ${roleError.message}`)
  }

  if (!role) {
    notFound()
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from('permissions')
    .select(
      'id, key, module, action, description, is_dangerous',
    )
    .order('module', { ascending: true })
    .order('action', { ascending: true })

  if (permissionsError) {
    throw new Error(
      `Gagal mengambil permission: ${permissionsError.message}`,
    )
  }

  const { data: assigned, error: assignedError } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', role.id)

  if (assignedError) {
    throw new Error(
      `Gagal mengambil permission role: ${assignedError.message}`,
    )
  }

  const assignedPermissionIds = (assigned ?? []).map(
    (item) => item.permission_id,
  )

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/roles" className="hover:text-foreground">
            Role & Permission
          </Link>
          <span>/</span>
          <span>{role.name}</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Kelola Role
        </h1>

        <p className="text-sm text-muted-foreground">
          Atur permission administrator menggunakan checklist.
        </p>
      </header>

      <RoleEditor
        role={{
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: role.is_system,
          permissionVersion: role.permission_version,
        }}
        permissions={permissions ?? []}
        assignedPermissionIds={assignedPermissionIds}
        permissionGroups={permissionsByModule()}
      />
    </main>
  )
}


