import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Permission } from '@/core/rbac/permissions'

export function AdminModulePage({
  eyebrow,
  title,
  description,
  permission,
  allowed,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  permission: Permission
  allowed: boolean
  children?: ReactNode
}) {
  if (!allowed) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-body-sm text-fg-muted">
          Anda tidak memiliki izin untuk mengakses modul ini.
        </p>

        <p className="mt-3 text-caption text-fg-subtle">
          Permission: <code>{permission}</code>
        </p>

        <Link
          href="/admin"
          className="mt-5 inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-fg hover:bg-muted"
        >
          Kembali ke Dasbor
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">
          {eyebrow}
        </p>

        <h1 className="mt-1 font-display text-heading-lg text-fg">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-body-sm text-fg-muted">
          {description}
        </p>
      </div>

      {children ?? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-body font-medium text-fg">
            Struktur modul siap digunakan
          </p>

          <p className="mt-1 text-body-sm text-fg-muted">
            Permission dan page-level authorization sudah aktif. Workflow
            production modul ini akan menggunakan data dan server actions
            sesuai domainnya.
          </p>
        </div>
      )}
    </div>
  )
}
