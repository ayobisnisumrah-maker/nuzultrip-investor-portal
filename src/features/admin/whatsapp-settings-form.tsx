'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { updateAdminWhatsAppSettings } from '@/server/admin/settings-actions'
import type { WhatsAppSettings } from '@/server/settings/whatsapp'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Stack } from '@/ui/layout'
import { useAction } from '@/ui/use-action'

function readString(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export function WhatsAppSettingsForm({
  settings,
  canUpdate,
}: {
  settings: WhatsAppSettings
  canUpdate: boolean
}) {
  const router = useRouter()
  const { pending, data, errorMessage, fieldError, run } = useAction(
    updateAdminWhatsAppSettings,
  )
  const disabled = pending || !canUpdate

  useEffect(() => {
    if (data?.updated) router.refresh()
  }, [data, router])

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!canUpdate || pending) return
        const form = new FormData(event.currentTarget)

        run({
          enabled: form.get('enabled') === 'on',
          senderNumber: readString(form, 'senderNumber'),
          phoneNumberId: readString(form, 'phoneNumberId'),
          languageCode: readString(form, 'languageCode'),
          investorInvitationTemplate: readString(form, 'investorInvitationTemplate'),
          investorInvitationPreview: readString(form, 'investorInvitationPreview'),
          inquiryCompletedTemplate: readString(form, 'inquiryCompletedTemplate'),
          inquiryCompletedPreview: readString(form, 'inquiryCompletedPreview'),
        })
      }}
    >
      <Stack gap={6}>
        {!canUpdate ? (
          <Alert tone="info">
            Anda memiliki akses baca saja. Perubahan WhatsApp memerlukan izin pengaturan sistem.
          </Alert>
        ) : null}
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
        {data?.updated ? <Alert tone="success">Pengaturan WhatsApp berhasil disimpan.</Alert> : null}

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Kanal WhatsApp</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Token provider dan Graph API Base URL tetap disimpan sebagai environment secret. Di sini Admin hanya mengatur nomor pengirim, Phone Number ID, bahasa, dan template yang telah disetujui provider.
              </p>
            </div>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input type="checkbox" name="enabled" defaultChecked={settings.enabled} disabled={disabled} />
              Aktifkan notifikasi WhatsApp otomatis
            </label>

            <Field label="Nomor WhatsApp pengirim" hint="Nomor bisnis yang tampil kepada penerima, misalnya +62812...." error={fieldError('senderNumber')}>
              <Input name="senderNumber" type="tel" defaultValue={settings.sender_number} disabled={disabled} placeholder="+6281234567890" />
            </Field>

            <Field label="Phone Number ID" hint="ID teknis nomor WhatsApp pada provider. Bukan access token." error={fieldError('phoneNumberId')}>
              <Input name="phoneNumberId" defaultValue={settings.phone_number_id} disabled={disabled} autoComplete="off" />
            </Field>

            <Field label="Kode bahasa template" hint="Contoh: id atau id_ID, sesuai template yang disetujui provider." error={fieldError('languageCode')} required>
              <Input name="languageCode" defaultValue={settings.language_code} disabled={disabled} required />
            </Field>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Undangan Calon Investor</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Template ini dikirim setelah Admin berhasil mendaftarkan calon investor dan email aktivasi/set kata sandi sudah dibuat.
              </p>
            </div>
            <Field label="Nama template provider" error={fieldError('investorInvitationTemplate')} required>
              <Input name="investorInvitationTemplate" defaultValue={settings.investor_invitation_template} disabled={disabled} required />
            </Field>
            <Field label="Pratinjau pesan" hint="Variabel {{1}} = nama investor, {{2}} = email. Teks aktual di WhatsApp mengikuti template provider yang telah disetujui." error={fieldError('investorInvitationPreview')} required>
              <textarea name="investorInvitationPreview" defaultValue={settings.investor_invitation_preview} disabled={disabled} required rows={5} className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid w-full rounded-lg border px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60" />
            </Field>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Permintaan Informasi / Dokumen Selesai</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Template ini dikirim otomatis ketika Admin mengubah status tindak lanjut permintaan menjadi selesai.
              </p>
            </div>
            <Field label="Nama template provider" error={fieldError('inquiryCompletedTemplate')} required>
              <Input name="inquiryCompletedTemplate" defaultValue={settings.inquiry_completed_template} disabled={disabled} required />
            </Field>
            <Field label="Pratinjau pesan" hint="Variabel {{1}} = nama pengirim permintaan." error={fieldError('inquiryCompletedPreview')} required>
              <textarea name="inquiryCompletedPreview" defaultValue={settings.inquiry_completed_preview} disabled={disabled} required rows={5} className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid w-full rounded-lg border px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60" />
            </Field>
          </Stack>
        </section>

        {canUpdate ? (
          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={pending} disabled={pending}>
              Simpan pengaturan WhatsApp
            </Button>
          </div>
        ) : null}
      </Stack>
    </form>
  )
}
