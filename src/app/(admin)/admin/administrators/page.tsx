import Link from 'next/link'

import { hasPermission } from '@/core/auth/principal'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

export default async function AdministratorsPage() {
  const principal = await requireAdminPage('/admin/administrators')

  if (!hasPermission(principal, 'admins.view')) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Anda tidak memiliki izin untuk melihat administrator.
        </p>
      </main>
    )
  }

  const supabase = await getServerSupabase()

  const { data: admins, error: adminsError } = await supabase
    .from('admins')
    .select(
      'id, role_id, title, employee_ref, is_active, disabled_at, created_at, updated_at',
    )
    .order('created_at', { ascending: false })

  if (adminsError) {
    throw new Error(`Gagal mengambil administrator: ${adminsError.message}`)
  }

  const adminRows = admins ?? []

  const adminIds = adminRows.map((admin) => admin.id)
  const roleIds = [...new Set(adminRows.map((admin) => admin.role_id))]

  const [{ data: accounts, error: accountsError }, { data: roles, error: rolesError }] =
    await Promise.all([
      adminIds.length > 0
        ? supabase
            .from('user_accounts')
            .select('id, email, full_name, phone, status')
            .in('id', adminIds)
        : Promise.resolve({ data: [], error: null }),

      roleIds.length > 0
        ? supabase
            .from('roles')
            .select('id, key, name, is_system')
            .in('id', roleIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (accountsError) {
    throw new Error(`Gagal mengambil akun administrator: ${accountsError.message}`)
  }

  if (rolesError) {
    throw new Error(`Gagal mengambil role administrator: ${rolesError.message}`)
  }

  const accountById = new Map(
    (accounts ?? []).map((account) => [account.id, account]),
  )

  const roleById = new Map(
    (roles ?? []).map((role) => [role.id, role]),
  )

  const canCreate = hasPermission(principal, 'admins.create')
  const canUpdate = hasPermission(principal, 'admins.update')

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Sistem / Administrator
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Administrator
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Kelola administrator internal, role, dan status akses sistem.
          </p>
        </div>

        {canCreate ? (
          <Link
            href="/admin/administrators/new"
            className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-muted"
          >
            + Tambah Administrator
          </Link>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Administrator</p>
          <p className="mt-2 text-2xl font-semibold">{adminRows.length}</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Aktif</p>
          <p className="mt-2 text-2xl font-semibold">
            {adminRows.filter((admin) => admin.is_active).length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Nonaktif</p>
          <p className="mt-2 text-2xl font-semibold">
            {adminRows.filter((admin) => !admin.is_active).length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Role Terpakai</p>
          <p className="mt-2 text-2xl font-semibold">{roleIds.length}</p>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Daftar Administrator</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrator internal yang memiliki akses ke Admin Console.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-5 py-3 font-medium">Administrator</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Jabatan</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Dibuat</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {adminRows.map((admin) => {
                const account = accountById.get(admin.id)
                const role = roleById.get(admin.role_id)

                return (
                  <tr key={admin.id} className="border-b last:border-0">
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {account?.full_name ?? 'Nama tidak tersedia'}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {account?.email ?? '-'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {role?.name ?? 'Role tidak tersedia'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {role?.key ?? '-'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {admin.title || '-'}
                    </td>

                    <td className="px-5 py-4">
                      {admin.is_active ? (
                        <span className="rounded-full border px-2 py-1 text-xs">
                          Aktif
                        </span>
                      ) : (
                        <span className="rounded-full border px-2 py-1 text-xs">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'medium',
                      }).format(new Date(admin.created_at))}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {canUpdate ? (
                        <Link
                          href={`/admin/administrators/${admin.id}`}
                          className="inline-flex rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                        >
                          Kelola
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {adminRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Belum ada administrator.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
