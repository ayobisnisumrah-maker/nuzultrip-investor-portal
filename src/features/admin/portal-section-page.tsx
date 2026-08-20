import Link from 'next/link'
import type { Permission } from '@/core/rbac/permissions'

export function PortalSectionPage({
  title,
  description,
  permission,
  currentPermission,
}: {
  title: string
  description: string
  permission: Permission
  currentPermission: boolean
}) {
  if (!currentPermission) {
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
          Portal & Content
        </p>

        <h1 className="mt-1 font-display text-heading-lg text-fg">
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-body-sm text-fg-muted">
          {description}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-body font-medium text-fg">
          Modul siap dikembangkan
        </p>

        <p className="mt-1 text-body-sm text-fg-muted">
          Struktur akses dan permission sudah aktif. Konten dan workflow
          production akan dihubungkan ke database pada tahap berikutnya.
        </p>
      </div>
    </div>
  )
}
