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
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk mengakses modul ini.
        </p>

        <p className="text-caption text-fg-subtle mt-3">
          Permission: <code>{permission}</code>
        </p>

        <Link
          href="/admin"
          className="border-border text-fg hover:bg-muted mt-5 inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium"
        >
          Kembali ke Dasbor
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
          {eyebrow}
        </p>

        <h1 className="font-display text-heading-lg text-fg mt-1">{title}</h1>

        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">{description}</p>
      </div>

      {children ?? (
        <div className="border-border bg-surface rounded-xl border p-6">
          <p className="text-body text-fg font-medium">Struktur modul siap digunakan</p>

          <p className="text-body-sm text-fg-muted mt-1">
            Permission dan page-level authorization sudah aktif. Workflow production modul ini akan
            menggunakan data dan server actions sesuai domainnya.
          </p>
        </div>
      )}
    </div>
  )
}
