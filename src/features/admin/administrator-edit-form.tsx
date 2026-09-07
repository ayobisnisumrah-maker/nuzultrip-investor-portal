'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { activateAdmin, deactivateAdmin, deleteAdmin, updateAdmin } from '@/server/admin/actions'

type RoleOption = {
  id: string
  key: string
  name: string
  description: string
  isSystem: boolean
}

type AdminData = {
  id: string
  fullName: string
  email: string
  roleId: string
  title: string | null
  employeeRef: string | null
  isActive: boolean
}

type Props = {
  admin: AdminData
  roles: RoleOption[]
  canDisable?: boolean
  canDelete?: boolean
}

export function AdministratorEditForm({
  admin,
  roles,
  canDisable = false,
  canDelete = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [fullName, setFullName] = useState(admin.fullName)
  const [roleId, setRoleId] = useState(admin.roleId)
  const [title, setTitle] = useState(admin.title ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const assignableRoles = roles.filter((role) => role.key !== 'super_admin')
  const selectedRole = assignableRoles.find((role) => role.id === roleId)

  function submit() {
    if (pending) return

    setError(null)
    setSuccess(null)

    if (!fullName.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }

    if (!roleId) {
      setError('Peran administrator wajib dipilih.')
      return
    }

    startTransition(async () => {
      try {
        const result = await updateAdmin({
          adminId: admin.id,
          fullName: fullName.trim(),
          roleId,
          title: title.trim(),
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        setSuccess('Administrator berhasil diperbarui.')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Gagal memperbarui administrator.')
      }
    })
  }

  function toggleStatus() {
    if (pending || !canDisable) return

    setError(null)
    setSuccess(null)

    const action = admin.isActive ? 'menonaktifkan' : 'mengaktifkan'

    if (
      admin.isActive &&
      !window.confirm(`Apakah Anda yakin ingin menonaktifkan administrator "${admin.fullName}"?`)
    ) {
      return
    }

    startTransition(async () => {
      try {
        const result = admin.isActive
          ? await deactivateAdmin({
              adminId: admin.id,
              reason: 'Dinonaktifkan oleh administrator yang berwenang.',
            })
          : await activateAdmin({
              adminId: admin.id,
            })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        setSuccess(
          admin.isActive
            ? 'Administrator berhasil dinonaktifkan.'
            : 'Administrator berhasil diaktifkan.',
        )

        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `Gagal ${action} administrator.`)
      }
    })
  }

  function removeAdministrator() {
    if (pending || !canDelete) return

    const confirmed = window.confirm(
      `PERINGATAN: Administrator "${admin.fullName}" (${admin.email}) akan dihapus secara permanen.\n\n` +
        'Akun autentikasi dan seluruh data administrator yang bergantung pada akun tersebut akan ikut dihapus.\n\n' +
        'Tindakan ini tidak dapat dibatalkan.\n\n' +
        'Lanjutkan?',
    )

    if (!confirmed) return

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const result = await deleteAdmin({
          adminId: admin.id,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        router.replace('/admin/administrators')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Gagal menghapus administrator.')
      }
    })
  }

  return (
    <section className="bg-card rounded-xl border">
      <div className="border-b p-5">
        <h2 className="font-semibold">Edit Administrator</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Perbarui informasi, peran, dan status administrator.
        </p>
      </div>

      <form
        className="grid gap-5 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div>
          <label htmlFor="administrator-edit-name" className="text-sm font-medium">
            Nama Lengkap
          </label>

          <input
            id="administrator-edit-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={pending}
            autoComplete="name"
            required
            className="bg-background mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="administrator-edit-email" className="text-sm font-medium">
            Surel
          </label>

          <input
            id="administrator-edit-email"
            value={admin.email}
            disabled
            readOnly
            className="bg-muted text-muted-foreground mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
          />

          <p className="text-muted-foreground mt-1 text-xs">
            Surel akun tidak diubah melalui formulir ini.
          </p>
        </div>

        <div>
          <label htmlFor="administrator-edit-role" className="text-sm font-medium">
            Peran Administrator
          </label>

          <select
            id="administrator-edit-role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            disabled={pending || assignableRoles.length === 0}
            required
            className="bg-background mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
          >
            <option value="">Pilih peran administrator</option>

            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <p className="text-muted-foreground mt-2 text-xs">
            Super Admin tidak dapat diberikan melalui pengelolaan Administrator. Peran operasional,
            termasuk Admin Internal, dapat diberikan sesuai kewenangan.
          </p>

          {selectedRole ? (
            <div className="mt-3 rounded-lg border p-4">
              <p className="text-sm font-medium">{selectedRole.name}</p>

              <p className="text-muted-foreground mt-1 text-xs">{selectedRole.description}</p>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="administrator-edit-title" className="text-sm font-medium">
            Jabatan
          </label>

          <input
            id="administrator-edit-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={pending}
            placeholder="Contoh: Manajer Hubungan Investor"
            className="bg-background mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Referensi Pegawai</label>

          <div className="bg-muted text-muted-foreground mt-2 rounded-lg border px-3 py-2.5 text-sm">
            {admin.employeeRef || '-'}
          </div>

          <p className="text-muted-foreground mt-1 text-xs">
            Referensi pegawai dikelola oleh sistem dan tidak diubah melalui formulir ini.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Status Akun</label>

          <div className="mt-2 rounded-lg border px-3 py-2.5 text-sm">
            {admin.isActive ? 'Aktif' : 'Nonaktif'}
          </div>

          <p className="text-muted-foreground mt-1 text-xs">
            Status akun dapat diubah melalui kontrol status Administrator di bawah.
          </p>

          {canDisable ? (
            <button
              type="button"
              onClick={toggleStatus}
              disabled={pending}
              className="hover:bg-muted mt-3 rounded-lg border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? 'Memproses...'
                : admin.isActive
                  ? 'Nonaktifkan Administrator'
                  : 'Aktifkan Administrator'}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border p-4" role="alert">
            <p className="text-sm font-medium">Operasi administrator gagal</p>

            <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border p-4" role="status">
            <p className="text-sm font-medium">{success}</p>

            <p className="text-muted-foreground mt-1 text-sm">
              Perubahan telah disimpan dan dicatat pada jejak audit.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-t pt-5">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push('/admin/administrators')}
              disabled={pending}
              className="hover:bg-muted rounded-lg border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kembali
            </button>

            <button
              type="submit"
              disabled={pending || !fullName.trim() || !roleId}
              className="bg-background hover:bg-muted rounded-lg border px-5 py-2.5 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

          {canDelete ? (
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">Zona Berbahaya</p>

              <p className="text-muted-foreground mt-1 text-sm">
                Menghapus administrator bersifat permanen dan tidak dapat dibatalkan.
              </p>

              <button
                type="button"
                onClick={removeAdministrator}
                disabled={pending}
                className="hover:bg-muted mt-4 rounded-lg border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hapus Administrator Permanen
              </button>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  )
}
