'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createAdmin } from '@/server/admin/actions'

type RoleOption = {
  id: string
  key: string
  name: string
  description: string
  isSystem: boolean
}

type Props = {
  roles: RoleOption[]
}

export function AdministratorCreateForm({ roles }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  /*
   * Super Admin adalah system-level designation.
   *
   * Role `super_admin` tetap ada di database untuk authorization,
   * tetapi TIDAK boleh dipilih ketika membuat administrator.
   */
  const assignableRoles = roles.filter(
    (role) => role.key !== 'super_admin',
  )

  function submit() {
    if (pending) return

    setError(null)

    if (!fullName.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }

    if (!email.trim()) {
      setError('Email wajib diisi.')
      return
    }

    if (!roleId) {
      setError('Role administrator wajib dipilih.')
      return
    }

    startTransition(async () => {
      try {
        const result = await createAdmin({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          roleId,
          title: title.trim(),
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        router.push('/admin/administrators')
        router.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Gagal membuat administrator.',
        )
      }
    })
  }

  return (
    <section className="max-w-3xl rounded-xl border bg-card p-5">
      <div className="grid gap-5">

        <div>
          <label
            htmlFor="administrator-full-name"
            className="text-sm font-medium"
          >
            Nama Lengkap
          </label>

          <input
            id="administrator-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={pending}
            autoComplete="name"
            placeholder="Nama administrator"
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <div>
          <label
            htmlFor="administrator-email"
            className="text-sm font-medium"
          >
            Email
          </label>

          <input
            id="administrator-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            autoComplete="email"
            placeholder="nama@perusahaan.com"
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
          />

          <p className="mt-1 text-xs text-muted-foreground">
            Email ini digunakan untuk proses provisioning dan akses
            administrator.
          </p>
        </div>

        <div>
          <label
            htmlFor="administrator-role"
            className="text-sm font-medium"
          >
            Role Administrator
          </label>

          <select
            id="administrator-role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            disabled={pending}
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
          >
            <option value="">
              Pilih role administrator
            </option>

            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-muted-foreground">
            Super Admin tidak tersedia sebagai role yang dapat diberikan.
            Super Admin adalah akses sistem penuh yang dilindungi.
          </p>

          {roleId ? (
            <div className="mt-3 rounded-lg border p-3">
              <p className="text-xs font-medium">
                {
                  assignableRoles.find(
                    (role) => role.id === roleId,
                  )?.name
                }
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {
                  assignableRoles.find(
                    (role) => role.id === roleId,
                  )?.description
                }
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="administrator-title"
            className="text-sm font-medium"
          >
            Jabatan
          </label>

          <input
            id="administrator-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={pending}
            placeholder="Contoh: Investor Relations Manager"
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
          />
        </div>

        {error ? (
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">
              Gagal membuat administrator
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/administrators')}
            disabled={pending}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={
              pending ||
              !fullName.trim() ||
              !email.trim() ||
              !roleId
            }
            className="rounded-lg border bg-background px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? 'Membuat...'
              : 'Buat Administrator'}
          </button>
        </div>
      </div>
    </section>
  )
}
