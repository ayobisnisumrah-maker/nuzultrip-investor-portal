import type { Metadata } from 'next'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getEmailSettings } from '@/server/settings/email'
import { EmailSettingsForm } from '@/features/admin/email-settings-form'

export const metadata: Metadata = {
  title: 'Pengaturan',
}

export default async function AdminSettingsPage() {
  const principal = await adminWithPermission(
    'settings.view',
    '/admin/settings',
  )

  if (!principal) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>
        <p className="text-body-sm text-fg-muted">
          Anda tidak memiliki izin untuk mengakses pengaturan sistem.
        </p>
      </div>
    )
  }

  const emailSettings = await getEmailSettings()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-fg-subtle overline">Administrasi Sistem</p>
        <h1 className="font-display text-display-lg text-fg">
          Pengaturan
        </h1>
        <p className="text-body-sm text-fg-muted">
          Kelola konfigurasi aplikasi yang dapat diubah tanpa mengubah source
          code.
        </p>
      </header>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-heading-md text-fg">
            Email
          </h2>
          <p className="text-body-sm text-fg-muted mt-1">
            Konfigurasi identitas pengirim dan perilaku notifikasi email
            aplikasi.
          </p>
        </div>

        <EmailSettingsForm settings={emailSettings} />
      </section>
    </div>
  )
}
