import Link from 'next/link'
import { notFound } from 'next/navigation'

import { hasPermission } from '@/core/auth/principal'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { AdministratorEditForm } from '@/features/admin/administrator-edit-form'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function AdministratorDetailPage({
  params,
}: PageProps) {
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

  const { id } = await params
  const supabase = await getServerSupabase()

  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select(
      'id, role_id, title, employee_ref, is_active, disabled_at, disabled_reason, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (adminError) {
    throw new Error(
      `Gagal mengambil administrator: ${adminError.message}`,
    )
  }

  if (!admin) {
    notFound()
  }

  const [
    { data: account, error: accountError },
    { data: roles, error: rolesError },
  ] = await Promise.all([
    supabase
      .from('user_accounts')
      .select('id, email, full_name, phone, status')
      .eq('id', id)
      .maybeSingle(),

    supabase
      .from('roles')
      .select('id, key, name, description, is_system')
      .neq('key', 'super_admin')
      .neq('key', 'admin_internal')
      .order('name', { ascending: true }),
  ])

  if (accountError) {
    throw new Error(
      `Gagal mengambil akun administrator: ${accountError.message}`,
    )
  }

  if (!account) {
    notFound()
  }

  if (rolesError) {
    throw new Error(
      `Gagal mengambil role administrator: ${rolesError.message}`,
    )
  }

  const currentRole = (roles ?? []).find(
    (role) => role.id === admin.role_id,
  )

  const canUpdate = hasPermission(principal, 'admins.update')
  const canDisable = hasPermission(principal, 'admins.disable')
  const canDelete = principal.roleKey === 'super_admin'

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link
          href="/admin/administrators"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Kembali ke Administrator
        </Link>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Sistem / Administrator
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Detail Administrator
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Lihat dan kelola informasi administrator internal.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Nama</p>
          <p className="mt-2 font-semibold">{account.full_name}</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="mt-2 font-semibold break-all">{account.email}</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="mt-2 font-semibold">
            {currentRole?.name ?? 'Role tidak tersedia'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-2 font-semibold">
            {admin.is_active ? 'Aktif' : 'Nonaktif'}
          </p>
        </div>
      </section>

      {canUpdate ? (
        <AdministratorEditForm
          admin={{
            id: admin.id,
            fullName: account.full_name,
            email: account.email,
            roleId: admin.role_id,
            title: admin.title,
            employeeRef: admin.employee_ref,
            isActive: admin.is_active,
          }}
          roles={(roles ?? []).map((role) => ({
            id: role.id,
            key: role.key,
            name: role.name,
            description: role.description,
            isSystem: role.is_system,
          }))}
          canDisable={canDisable}
          canDelete={canDelete}
        />
      ) : (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Informasi Administrator</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Jabatan</p>
              <p className="mt-1 text-sm">{admin.title || '-'}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Employee Reference
              </p>
              <p className="mt-1 text-sm">
                {admin.employee_ref || '-'}
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

