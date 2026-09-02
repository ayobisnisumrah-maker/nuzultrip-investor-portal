import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'
import { CreatePortalPageForm } from '@/features/admin/create-portal-page-form'

export default async function NewPortalPage() {
  const principal = await adminWithPermission(
    'portal.update',
    '/admin/portal/pages/new',
  )

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk membuat halaman Portal.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/portal/pages"
          className="text-caption text-fg-muted hover:text-fg"
        >
          ← Kembali ke Halaman
        </Link>

        <div className="mt-4">
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Portal & Konten
          </p>

          <h1 className="font-display text-heading-lg text-fg mt-1">
            Buat Halaman
          </h1>

          <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
            Buat halaman baru sebagai Draf, kemudian tambahkan section dan
            konten sebelum dikirim untuk peninjauan.
          </p>
        </div>
      </div>

      <CreatePortalPageForm />
    </div>
  )
}