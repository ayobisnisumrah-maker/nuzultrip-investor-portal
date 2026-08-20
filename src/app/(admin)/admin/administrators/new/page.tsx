import Link from 'next/link'

import { hasPermission } from '@/core/auth/principal'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { AdministratorCreateForm } from '@/features/admin/administrator-create-form'

export default async function NewAdministratorPage() {
  const principal = await requireAdminPage('/admin/administrators/new')

  if (!hasPermission(principal, 'admins.create')) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hanya administrator yang memiliki permission admins.create yang dapat
          membuat administrator baru.
        </p>
      </main>
    )
  }

  const supabase = await getServerSupabase()

  const { data: roles, error } = await supabase
    .from('roles')
    .select('id, key, name, description, is_system')
    .neq('key', 'super_admin')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Gagal mengambil role: ${error.message}`)
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link
          href="/admin/administrators"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Kembali ke Administrator
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Tambah Administrator
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Buat akun administrator internal dan tetapkan role aksesnya.
        </p>
      </header>

      <AdministratorCreateForm
        roles={(roles ?? []).map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: role.is_system,
        }))}
      />
    </main>
  )
}



