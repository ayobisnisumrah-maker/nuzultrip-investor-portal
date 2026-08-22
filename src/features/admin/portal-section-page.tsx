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
          Portal & Content
        </p>

        <h1 className="font-display text-heading-lg text-fg mt-1">{title}</h1>

        <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">{description}</p>
      </div>

      <div className="border-border bg-surface rounded-xl border p-6">
        <p className="text-body text-fg font-medium">Modul siap dikembangkan</p>

        <p className="text-body-sm text-fg-muted mt-1">
          Struktur akses dan permission sudah aktif. Konten dan workflow production akan dihubungkan
          ke database pada tahap berikutnya.
        </p>
      </div>
    </div>
  )
}
