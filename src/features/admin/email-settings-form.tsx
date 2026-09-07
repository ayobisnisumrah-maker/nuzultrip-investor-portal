'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { updateAdminEmailSettings } from '@/server/admin/settings-actions'
import type { EmailSettings } from '@/server/settings/email'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Stack } from '@/ui/layout'
import { useAction } from '@/ui/use-action'

type EmailProvider = 'supabase_auth' | 'smtp' | 'resend'

function readFormString(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

function readProvider(form: FormData): EmailProvider {
  const value = readFormString(form, 'provider')

  if (value === 'smtp') return 'smtp'
  if (value === 'resend') return 'resend'

  return 'supabase_auth'
}

function readCheckbox(form: FormData, name: string): boolean {
  return form.get(name) === 'on'
}

export function EmailSettingsForm({
  settings,
  canUpdate,
}: {
  settings: EmailSettings
  canUpdate: boolean
}) {
  const router = useRouter()
  const { pending, data, errorMessage, fieldError, run } = useAction(
    updateAdminEmailSettings,
  )

  useEffect(() => {
    if (data?.updated) {
      router.refresh()
    }
  }, [data, router])

  const disabled = pending || !canUpdate

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!canUpdate || pending) return

        const form = new FormData(event.currentTarget)

        run({
          provider: readProvider(form),
          providerEnabled: readCheckbox(form, 'providerEnabled'),
          senderName: readFormString(form, 'senderName'),
          senderAddress: readFormString(form, 'senderAddress'),
          replyTo: readFormString(form, 'replyTo'),
          notificationsEnabled: readCheckbox(form, 'notificationsEnabled'),
          passwordReset: readCheckbox(form, 'passwordReset'),
          investorInvitation: readCheckbox(form, 'investorInvitation'),
          securityAlert: readCheckbox(form, 'securityAlert'),
        })
      }}
    >
      <Stack gap={6}>
        {!canUpdate ? (
          <Alert tone="info">
            Anda memiliki akses baca saja. Perubahan pengaturan surel memerlukan izin pengaturan sistem.
          </Alert>
        ) : null}

        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

        {data?.updated ? (
          <Alert tone="success">Pengaturan surel berhasil disimpan.</Alert>
        ) : null}

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Penyedia Layanan</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Pilih layanan yang digunakan untuk autentikasi dan pengiriman surel aplikasi.
              </p>
            </div>

            <Field label="Penyedia" required>
              <select
                name="provider"
                defaultValue={settings.provider.type}
                disabled={disabled}
                className="border-border bg-surface text-body-sm text-fg w-full rounded-xl border px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="supabase_auth">Supabase Auth</option>
                <option value="smtp">SMTP</option>
                <option value="resend">Resend</option>
              </select>
            </Field>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input
                type="checkbox"
                name="providerEnabled"
                defaultChecked={settings.provider.enabled}
                disabled={disabled}
              />
              Layanan surel aktif
            </label>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Identitas Pengirim</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Identitas yang digunakan ketika surel aplikasi dikirim.
              </p>
            </div>

            <Field label="Nama pengirim" error={fieldError('senderName')} required>
              <Input
                name="senderName"
                defaultValue={settings.sender.name}
                autoComplete="organization"
                required
                disabled={disabled}
              />
            </Field>

            <Field label="Alamat pengirim" error={fieldError('senderAddress')} required>
              <Input
                name="senderAddress"
                type="email"
                defaultValue={settings.sender.address}
                autoComplete="email"
                required
                disabled={disabled}
              />
            </Field>

            <Field label="Alamat balasan" error={fieldError('replyTo')} required>
              <Input
                name="replyTo"
                type="email"
                defaultValue={settings.sender.reply_to}
                autoComplete="email"
                required
                disabled={disabled}
              />
            </Field>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Notifikasi Surel</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Tentukan jenis surel aplikasi yang diaktifkan.
              </p>
            </div>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input
                type="checkbox"
                name="notificationsEnabled"
                defaultChecked={settings.notifications.enabled}
                disabled={disabled}
              />
              Notifikasi surel aktif
            </label>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input
                type="checkbox"
                name="passwordReset"
                defaultChecked={settings.notifications.password_reset}
                disabled={disabled}
              />
              Pengaturan ulang kata sandi
            </label>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input
                type="checkbox"
                name="investorInvitation"
                defaultChecked={settings.notifications.investor_invitation}
                disabled={disabled}
              />
              Undangan investor
            </label>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input
                type="checkbox"
                name="securityAlert"
                defaultChecked={settings.notifications.security_alert}
                disabled={disabled}
              />
              Peringatan keamanan
            </label>
          </Stack>
        </section>

        {canUpdate ? (
          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={pending} disabled={pending}>
              Simpan pengaturan
            </Button>
          </div>
        ) : null}
      </Stack>
    </form>
  )
}
