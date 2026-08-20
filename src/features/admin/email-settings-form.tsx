'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailSettings } from '@/server/settings/email'
import { updateAdminEmailSettings } from '@/server/admin/settings-actions'
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
}: {
  settings: EmailSettings
}) {
  const router = useRouter()
  const { pending, data, errorMessage, fieldError, run } =
    useAction(updateAdminEmailSettings)

  useEffect(() => {
    if (data?.updated) {
      router.refresh()
    }
  }, [data, router])

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()

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
        {errorMessage ? (
          <Alert tone="danger">{errorMessage}</Alert>
        ) : null}

        {data?.updated ? (
          <Alert tone="success">
            Pengaturan email berhasil disimpan.
          </Alert>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">
                Provider
              </h3>
              <p className="mt-1 text-body-sm text-fg-muted">
                Provider yang digunakan oleh lapisan email aplikasi.
              </p>
            </div>

            <Field label="Provider" required>
              <select
                name="provider"
                defaultValue={settings.provider.type}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-body-sm text-fg outline-none"
              >
                <option value="supabase_auth">Supabase Auth</option>
                <option value="smtp">SMTP</option>
                <option value="resend">Resend</option>
              </select>
            </Field>

            <label className="flex items-center gap-3 text-body-sm text-fg">
              <input
                type="checkbox"
                name="providerEnabled"
                defaultChecked={settings.provider.enabled}
              />
              Provider email aktif
            </label>
          </Stack>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">
                Identitas Pengirim
              </h3>
              <p className="mt-1 text-body-sm text-fg-muted">
                Identitas yang akan digunakan ketika email aplikasi dikirim.
              </p>
            </div>

            <Field
              label="Nama pengirim"
              error={fieldError('senderName')}
              required
            >
              <Input
                name="senderName"
                defaultValue={settings.sender.name}
                autoComplete="organization"
                required
              />
            </Field>

            <Field
              label="Alamat pengirim"
              error={fieldError('senderAddress')}
              required
            >
              <Input
                name="senderAddress"
                type="email"
                defaultValue={settings.sender.address}
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label="Reply-To"
              error={fieldError('replyTo')}
              required
            >
              <Input
                name="replyTo"
                type="email"
                defaultValue={settings.sender.reply_to}
                autoComplete="email"
                required
              />
            </Field>
          </Stack>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">
                Notifikasi
              </h3>
              <p className="mt-1 text-body-sm text-fg-muted">
                Tentukan jenis email aplikasi yang diaktifkan.
              </p>
            </div>

            <label className="flex items-center gap-3 text-body-sm text-fg">
              <input
                type="checkbox"
                name="notificationsEnabled"
                defaultChecked={settings.notifications.enabled}
              />
              Notifikasi email aktif
            </label>

            <label className="flex items-center gap-3 text-body-sm text-fg">
              <input
                type="checkbox"
                name="passwordReset"
                defaultChecked={settings.notifications.password_reset}
              />
              Password reset
            </label>

            <label className="flex items-center gap-3 text-body-sm text-fg">
              <input
                type="checkbox"
                name="investorInvitation"
                defaultChecked={
                  settings.notifications.investor_invitation
                }
              />
              Undangan investor
            </label>

            <label className="flex items-center gap-3 text-body-sm text-fg">
              <input
                type="checkbox"
                name="securityAlert"
                defaultChecked={
                  settings.notifications.security_alert
                }
              />
              Security alert
            </label>
          </Stack>
        </section>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={pending}>
            Simpan pengaturan
          </Button>
        </div>
      </Stack>
    </form>
  )
}
