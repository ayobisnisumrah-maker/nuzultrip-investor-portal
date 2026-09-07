import Link from 'next/link'

import { hasPermission } from '@/core/auth/principal'
import { permissionsByModule } from '@/core/rbac/permissions'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

export default async function AdminRolesPage() {
  const principal = await requireAdminPage('/admin/roles')

  if (!hasPermission(principal, 'roles.view')) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Anda tidak memiliki izin untuk melihat Peran & Izin.
        </p>
      </main>
    )
  }

  const supabase = await getServerSupabase()

  /*
   * Super Admin bukan peran operasional.
   *
   * Ia adalah otoritas sistem dengan seluruh izin secara implisit dan tidak
   * boleh dikelola melalui Peran & Izin.
   *
   * Karena itu Super Admin sengaja tidak diambil dari daftar peran yang
   * ditampilkan di halaman ini.
   */
  const { data: roles, error } = await supabase
    .from('roles')
    .select('id, key, name, description, is_system, permission_version, created_at, updated_at')
    .neq('key', 'super_admin')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Gagal mengambil data peran: ${error.message}`)
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from('permissions')
    .select('id, key, module, action, description, is_dangerous')
    .order('module', { ascending: true })
    .order('action', { ascending: true })

  if (permissionsError) {
    throw new Error(`Gagal mengambil katalog izin: ${permissionsError.message}`)
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('admins')
    .select('id, role_id, is_active')

  if (assignmentsError) {
    throw new Error(`Gagal mengambil penugasan admin: ${assignmentsError.message}`)
  }

  const adminCountByRole = new Map<string, number>()

  for (const admin of assignments ?? []) {
    if (!admin.is_active) continue

    adminCountByRole.set(
      admin.role_id,
      (adminCountByRole.get(admin.role_id) ?? 0) + 1,
    )
  }

  const permissionCountByRole = new Map<string, number>()

  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .from('role_permissions')
    .select('role_id')

  if (rolePermissionsError) {
    throw new Error(`Gagal mengambil izin peran: ${rolePermissionsError.message}`)
  }

  for (const item of rolePermissions ?? []) {
    permissionCountByRole.set(
      item.role_id,
      (permissionCountByRole.get(item.role_id) ?? 0) + 1,
    )
  }

  const totalPermissions = permissions?.length ?? 0
  const roleList = roles ?? []
  const systemRoleCount = roleList.filter((role) => role.is_system).length
  const customRoleCount = roleList.filter((role) => !role.is_system).length

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Peran & Izin</h1>
          <p className="text-muted-foreground text-sm">
            Kelola peran administrator operasional dan izin yang dapat diberikan oleh Super Admin.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-card rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">Total Peran Operasional</p>
          <p className="mt-2 text-2xl font-semibold">{roleList.length}</p>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">Total Izin</p>
          <p className="mt-2 text-2xl font-semibold">{totalPermissions}</p>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">Peran Sistem</p>
          <p className="mt-2 text-2xl font-semibold">{systemRoleCount}</p>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">Peran Kustom</p>
          <p className="mt-2 text-2xl font-semibold">{customRoleCount}</p>
        </div>
      </section>

      <section className="bg-card rounded-xl border">
        <div className="border-b p-5">
          <h2 className="font-semibold">Daftar Peran Operasional</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Super Admin adalah otoritas sistem dan tidak dikelola melalui halaman ini. Peran operasional dapat dikelola sesuai izin yang dimiliki.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-5 py-3 font-medium">Peran</th>
                <th className="px-5 py-3 font-medium">Tipe</th>
                <th className="px-5 py-3 font-medium">Admin Aktif</th>
                <th className="px-5 py-3 font-medium">Izin</th>
                <th className="px-5 py-3 font-medium">Versi</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {roleList.map((role) => (
                <tr key={role.id} className="border-b last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium">{role.name}</div>
                    <div className="text-muted-foreground text-xs">{role.key}</div>
                    {role.description ? (
                      <div className="text-muted-foreground mt-1 max-w-xl text-xs">
                        {role.description}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {role.is_system ? 'Sistem' : 'Kustom'}
                    </span>
                  </td>

                  <td className="px-5 py-4">{adminCountByRole.get(role.id) ?? 0}</td>

                  <td className="px-5 py-4">
                    {permissionCountByRole.get(role.id) ?? 0}/{totalPermissions}
                  </td>

                  <td className="px-5 py-4">v{role.permission_version}</td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/roles/${role.id}`}
                      className="hover:bg-muted inline-flex rounded-lg border px-3 py-2 text-xs font-medium"
                    >
                      Kelola
                    </Link>
                  </td>
                </tr>
              ))}

              {roleList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground px-5 py-10 text-center text-sm">
                    Belum ada peran operasional.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card rounded-xl border p-5">
        <div className="mb-5">
          <h2 className="font-semibold">Katalog Izin</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Katalog izin yang tersedia untuk pengelolaan peran.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {permissionsByModule().map((group) => (
            <div key={group.module} className="rounded-lg border p-4">
              <div className="font-medium">{group.label}</div>

              <div className="mt-3 flex flex-col gap-2">
                {group.permissions.map((permission) => {
                  const key = `${permission.module}.${permission.action}`
                  const databasePermission = permissions?.find((item) => item.key === key)

                  return (
                    <div key={key} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium">{key}</div>
                        <div className="text-muted-foreground text-xs">
                          {permission.description}
                        </div>
                      </div>

                      {databasePermission?.is_dangerous ? (
                        <span className="shrink-0 rounded-full border px-2 py-1 text-[10px]">
                          Sensitif
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
