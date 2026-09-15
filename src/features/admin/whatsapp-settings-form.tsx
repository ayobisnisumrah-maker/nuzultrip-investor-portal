'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { updateAdminWhatsAppSettings } from '@/server/admin/whatsapp-settings-actions'
import type { WhatsAppSettings } from '@/server/settings/whatsapp'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Stack } from '@/ui/layout'
import { useAction } from '@/ui/use-action'

function text(form: FormData, name: string): string {
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
  const { pending, data, errorMessage, fieldError, run } = useAction(updateAdminWhatsAppSettings)
  const disabled = pending || !canUpdate

  useEffect(() => {
    if (data?.updated) router.refresh()
  }, [data, router])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (disabled) return
        const form = new FormData(event.currentTarget)
        run({
          enabled: form.get('enabled') === 'on',
          senderPhone: text(form, 'senderPhone'),
          phoneNumberId: text(form, 'phoneNumberId'),
          investorInvitationEnabled: form.get('investorInvitationEnabled') === 'on',
          templateName: text(form, 'templateName'),
          languageCode: text(form, 'languageCode'),
          preview: text(form, 'preview'),
          inquiryCompletedEnabled: form.get('inquiryCompletedEnabled') === 'on',
          inquiryCompletedTemplateName: text(form, 'inquiryCompletedTemplateName'),
          inquiryCompletedLanguageCode: text(form, 'inquiryCompletedLanguageCode'),
          inquiryCompletedPreview: text(form, 'inquiryCompletedPreview'),
        })
      }}
    >
      <Stack gap={6}>
        {!canUpdate ? <Alert tone="info">Akun Anda hanya memiliki akses baca pengaturan WhatsApp.</Alert> : null}
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
        {data?.updated ? <Alert tone="success">Pengaturan WhatsApp berhasil disimpan.</Alert> : null}

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">WhatsApp Cloud API</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Nomor dan Phone Number ID dikelola di sini. Access token tetap disimpan sebagai server secret dan tidak pernah ditampilkan di Admin.
              </p>
            </div>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input type="checkbox" name="enabled" defaultChecked={settings.enabled} disabled={disabled} />
              Aktifkan pengiriman WhatsApp otomatis
            </label>

            <Field label="Nomor WhatsApp pengirim" hint="Nomor bisnis yang terhubung ke WhatsApp Cloud API, misalnya +6281234567890." error={fieldError('senderPhone')}>
              <Input name="senderPhone" type="tel" defaultValue={settings.senderPhone} disabled={disabled} />
            </Field>

            <Field label="Phone Number ID" hint="ID nomor pada Meta WhatsApp Cloud API. Ini bukan access token." error={fieldError('phoneNumberId')}>
              <Input name="phoneNumberId" defaultValue={settings.phoneNumberId} disabled={disabled} autoComplete="off" />
            </Field>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Undangan Investor</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Pesan dikirim setelah akun investor berhasil dibuat dan email pembuatan kata sandi berhasil dikirim.
              </p>
            </div>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input type="checkbox" name="investorInvitationEnabled" defaultChecked={settings.investorInvitation.enabled} disabled={disabled} />
              Kirim konfirmasi WhatsApp untuk investor baru
            </label>

            <Field label="Nama template Meta" hint="Harus sama dengan template pesan yang sudah disetujui pada WhatsApp Manager." error={fieldError('templateName')} required>
              <Input name="templateName" defaultValue={settings.investorInvitation.templateName} disabled={disabled} required />
            </Field>

            <Field label="Kode bahasa template" hint="Contoh: id atau id_ID, sesuai template yang disetujui provider." error={fieldError('languageCode')} required>
              <Input name="languageCode" defaultValue={settings.investorInvitation.languageCode} disabled={disabled} required />
            </Field>

            <Field label="Pratinjau pesan" hint={'Gunakan {{name}} dan {{email}} sebagai penanda variabel. Pengiriman resmi tetap memakai template provider yang disetujui.'} error={fieldError('preview')} required>
              <textarea name="preview" rows={5} defaultValue={settings.investorInvitation.preview} disabled={disabled} required className="border-border bg-surface text-body-sm text-fg w-full rounded-xl border px-4 py-3 outline-none disabled:opacity-60" />
            </Field>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Permintaan Informasi / Dokumen Selesai</h3>
              <p className="text-body-sm text-fg-muted mt-1">
                Ketika Admin mengubah status tindak lanjut menjadi Selesai, sistem mengirim konfirmasi otomatis ke nomor WhatsApp pengirim permintaan jika nomor tersedia.
              </p>
            </div>

            <label className="text-body-sm text-fg flex items-center gap-3">
              <input type="checkbox" name="inquiryCompletedEnabled" defaultChecked={settings.inquiryCompleted.enabled} disabled={disabled} />
              Kirim WhatsApp otomatis saat permintaan selesai
            </label>

            <Field label="Nama template Meta" hint="Template WhatsApp yang telah disetujui untuk pemberitahuan penyelesaian permintaan." error={fieldError('inquiryCompletedTemplateName')} required>
              <Input name="inquiryCompletedTemplateName" defaultValue={settings.inquiryCompleted.templateName} disabled={disabled} required />
            </Field>

            <Field label="Kode bahasa template" hint="Contoh: id atau id_ID, sesuai template yang disetujui provider." error={fieldError('inquiryCompletedLanguageCode')} required>
              <Input name="inquiryCompletedLanguageCode" defaultValue={settings.inquiryCompleted.languageCode} disabled={disabled} required />
            </Field>

            <Field label="Pratinjau pesan" hint={'Gunakan {{name}} sebagai nama pengirim permintaan. Isi aktual WhatsApp mengikuti template provider yang disetujui.'} error={fieldError('inquiryCompletedPreview')} required>
              <textarea name="inquiryCompletedPreview" rows={5} defaultValue={settings.inquiryCompleted.preview} disabled={disabled} required className="border-border bg-surface text-body-sm text-fg w-full rounded-xl border px-4 py-3 outline-none disabled:opacity-60" />
            </Field>
          </Stack>
        </section>

        {canUpdate ? (
          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={pending} disabled={pending}>Simpan pengaturan WhatsApp</Button>
          </div>
        ) : null}
      </Stack>
    </form>
  )
}
