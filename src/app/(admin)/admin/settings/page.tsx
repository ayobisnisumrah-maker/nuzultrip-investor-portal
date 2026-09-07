import type { Metadata } from 'next'

import { EmailSettingsForm } from '@/features/admin/email-settings-form'
import { NotificationSoundSettingsForm } from '@/features/admin/notification-sound-settings-form'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getEmailSettings } from '@/server/settings/email'
import { getNotificationSoundSettings } from '@/server/settings/notification-sound'

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

  const [emailSettings, notificationSound] = await Promise.all([
    getEmailSettings(),
    getNotificationSoundSettings(),
  ])
  const canUpdate = principal.permissions.has('settings.update')

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-fg-subtle overline">Administrasi Sistem</p>
        <h1 className="font-display text-display-lg text-fg">
          Pengaturan
        </h1>
        <p className="text-body-sm text-fg-muted">
          Kelola konfigurasi aplikasi yang dapat diubah tanpa mengubah kode sumber.
        </p>
      </header>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-heading-md text-fg">
            Notifikasi
          </h2>
          <p className="text-body-sm text-fg-muted mt-1">
            Atur nada yang diputar ketika pesan atau notifikasi baru diterima.
          </p>
        </div>

        <NotificationSoundSettingsForm
          settings={notificationSound}
          canUpdate={canUpdate}
        />
      </section>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-heading-md text-fg">
            Surel
          </h2>
          <p className="text-body-sm text-fg-muted mt-1">
            Konfigurasi identitas pengirim dan perilaku notifikasi surel aplikasi.
          </p>
        </div>

        <EmailSettingsForm settings={emailSettings} canUpdate={canUpdate} />
      </section>
    </div>
  )
}
