import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSetupComplete } from '@/server/admin/setup-actions'
import { MIN_PASSWORD_LENGTH } from '@/core/auth/schemas'
import { Alert } from '@/ui/alert'
import { SetupForm } from './setup-form'

export const metadata: Metadata = {
  title: 'Persiapan Sistem',
  robots: { index: false, follow: false },
}

/**
 * First-run setup.
 *
 * Exists only until the first administrator does. Once setup is complete the
 * route returns 404 — not a "already done" page, which would confirm the
 * endpoint's existence to anyone probing for it.
 */
export default async function SetupPage() {
  if (await isSetupComplete()) notFound()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-fg-subtle overline">Persiapan awal</p>
        <h1 className="font-display text-display-lg text-fg">Buat Super Admin</h1>
        <p className="text-body-sm text-fg-muted">
          Sistem ini belum memiliki administrator. Buat akun Super Admin pertama untuk memulai.
        </p>
      </header>

      <Alert tone="warning" title="Halaman ini hanya muncul sekali">
        Setelah administrator pertama dibuat, halaman ini tidak dapat diakses lagi. Administrator
        berikutnya dibuat dari dalam sistem melalui undangan surel.
      </Alert>

      <SetupForm minPasswordLength={MIN_PASSWORD_LENGTH} />
    </div>
  )
}
