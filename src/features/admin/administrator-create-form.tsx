'use client'

import { useState, useTransition, type FormEvent } from 'react'
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

  const assignableRoles = roles.filter((role) => role.key !== 'super_admin')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    setError(null)

    if (!fullName.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }

    if (!email.trim()) {
      setError('Surel wajib diisi.')
      return
    }

    if (!roleId) {
      setError('Peran administrator wajib dipilih.')
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
    <section className="bg-card max-w-3xl rounded-xl border p-5">
      <form className="grid gap-5" onSubmit={submit}>
        <div>
          <label htmlFor="administrator-full-name" className="text-sm font-medium">
            Nama Lengkap
          </label>

          <input
            id="administrator-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={pending}
            autoComplete="name"
            placeholder="Nama administrator"
            required
            className="bg-background mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="administrator-email" className="text-sm font-medium">
            Surel
          </label>

          <input
            id="administrator-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            autoComplete="email"
            placeholder="nama@perusahaan.com"
            required
            className="bg-background mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
          />

          <p className="text-muted-foreground mt-1 text-xs">
            Surel ini digunakan untuk proses pembuatan akun dan akses administrator.
          </p>
        </div>

        <div>
          <label htmlFor="administrator-role" className="text-sm font-medium">
            Peran Administrator
          </label>

          <select
            id="administrator-role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            disabled={pending || assignableRoles.length === 0}
            required
            className="bg-background mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
          >
            <option value="">
              {assignableRoles.length ? 'Pilih peran administrator' : 'Belum ada peran yang dapat diberikan'}
            </option>

            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <p className="text-muted-foreground mt-2 text-xs">
            Super Admin tidak dapat diberikan dari formulir ini karena merupakan akses sistem penuh yang dilindungi.
          </p>

          {roleId ? (
            <div className="mt-3 rounded-lg border p-3">
              <p className="text-xs font-medium">
                {assignableRoles.find((role) => role.id === roleId)?.name}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {assignableRoles.find((role) => role.id === roleId)?.description}
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="administrator-title" className="text-sm font-medium">
            Jabatan
          </label>

          <input
            id="administrator-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={pending}
            placeholder="Contoh: Manajer Hubungan Investor"
            className="bg-background mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
          />
        </div>

        {error ? (
          <div className="rounded-lg border p-4" role="alert">
            <p className="text-sm font-medium">Gagal membuat administrator</p>
            <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/administrators')}
            disabled={pending}
            className="hover:bg-muted rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={
              pending ||
              !fullName.trim() ||
              !email.trim() ||
              !roleId ||
              assignableRoles.length === 0
            }
            className="bg-background hover:bg-muted rounded-lg border px-5 py-2.5 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Membuat...' : 'Buat Administrator'}
          </button>
        </div>
      </form>
    </section>
  )
}
