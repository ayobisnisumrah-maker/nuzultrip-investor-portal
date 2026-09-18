'use client'

import { useEffect, useState } from 'react'
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

export function WhatsAppSettingsForm({ settings, canUpdate }: { settings: WhatsAppSettings; canUpdate: boolean }) {
  const router = useRouter()
  const { pending, data, errorMessage, fieldError, run } = useAction(updateAdminWhatsAppSettings)
  const disabled = pending || !canUpdate
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(settings.enabled)

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
          aiAutoReplyEnabled: form.get('aiAutoReplyEnabled') === 'on',
          investorInvitationEnabled: form.get('investorInvitationEnabled') === 'on',
          templateName: text(form, 'templateName'),
          languageCode: text(form, 'languageCode'),
          preview: text(form, 'preview'),
          inquiryCompletionEnabled: form.get('inquiryCompletionEnabled') === 'on',
          inquiryCompletionTemplateName: text(form, 'inquiryCompletionTemplateName'),
          inquiryCompletionLanguageCode: text(form, 'inquiryCompletionLanguageCode'),
          inquiryCompletionPreview: text(form, 'inquiryCompletionPreview'),
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
              <p className="text-body-sm text-fg-muted mt-1">Nomor dan Phone Number ID dikelola di sini. Access token tetap menjadi server secret dan tidak pernah ditampilkan di Admin.</p>
            </div>
            <label className="text-body-sm text-fg flex items-center gap-3">
              <input type="checkbox" name="enabled" checked={whatsAppEnabled} onChange={(event) => setWhatsAppEnabled(event.currentTarget.checked)} disabled={disabled} />
              Aktifkan pengiriman WhatsApp otomatis
            </label>
            <Field label="Nomor WhatsApp pengirim" hint="Nomor bisnis yang terhubung ke WhatsApp Cloud API, misalnya +6281234567890." error={fieldError('senderPhone')}>
              <Input name="senderPhone" type="tel" defaultValue={settings.senderPhone} disabled={disabled} />
            </Field>
            <Field label="Phone Number ID" hint="ID nomor pada Meta WhatsApp Cloud API. Ini bukan access token." error={fieldError('phoneNumberId')}>
              <Input name="phoneNumberId" defaultValue={settings.phoneNumberId} disabled={disabled} autoComplete="off" />
            </Field>
            <label className="text-body-sm text-fg flex items-start gap-3">
              <input type="checkbox" name="aiAutoReplyEnabled" defaultChecked={settings.aiAutoReplyEnabled && settings.enabled} disabled={disabled || !whatsAppEnabled} />
              <span><span className="block font-medium">Jawab otomatis dengan Halo Nuzul</span><span className="text-fg-muted block mt-1">Pesan teks WhatsApp yang masuk akan dijawab otomatis menggunakan informasi portal Nuzultrip yang sudah dipublikasikan. Webhook dan secret tetap dikelola di server. Aktifkan WhatsApp Cloud API terlebih dahulu untuk menggunakan fitur ini.</span></span>
            </label>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Undangan Investor</h3>
              <p className="text-body-sm text-fg-muted mt-1">Pesan dikirim setelah akun investor berhasil dibuat dan email pembuatan kata sandi berhasil dikirim.</p>
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
            <Field label="Pratinjau pesan" hint={'Gunakan {{name}} dan {{email}} sebagai penanda variabel. Pengiriman resmi memakai template provider yang disetujui.'} error={fieldError('preview')} required>
              <textarea name="preview" rows={5} defaultValue={settings.investorInvitation.preview} disabled={disabled} required className="border-border bg-surface text-body-sm text-fg w-full rounded-xl border px-4 py-3 outline-none disabled:opacity-60" />
            </Field>
          </Stack>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6">
          <Stack gap={5}>
            <div>
              <h3 className="font-display text-heading-sm text-fg">Permintaan Informasi / Dokumen Selesai</h3>
              <p className="text-body-sm text-fg-muted mt-1">Dikirim otomatis satu kali ketika admin mengubah status tindak lanjut dari Baru/Diproses menjadi Selesai. Jika nomor pemohon kosong, pengiriman dilewati.</p>
            </div>
            <label className="text-body-sm text-fg flex items-center gap-3">
              <input type="checkbox" name="inquiryCompletionEnabled" defaultChecked={settings.inquiryCompletion.enabled} disabled={disabled} />
              Kirim WhatsApp otomatis saat tindak lanjut selesai
            </label>
            <Field label="Nama template Meta" hint="Template provider untuk konfirmasi bahwa permintaan sudah selesai ditindaklanjuti." error={fieldError('inquiryCompletionTemplateName')} required>
              <Input name="inquiryCompletionTemplateName" defaultValue={settings.inquiryCompletion.templateName} disabled={disabled} required />
            </Field>
            <Field label="Kode bahasa template" hint="Contoh: id atau id_ID, sesuai template yang disetujui provider." error={fieldError('inquiryCompletionLanguageCode')} required>
              <Input name="inquiryCompletionLanguageCode" defaultValue={settings.inquiryCompletion.languageCode} disabled={disabled} required />
            </Field>
            <Field label="Pratinjau pesan" hint={'Gunakan {{name}} sebagai penanda nama pemohon. Teks aktual harus sama dengan template yang disetujui provider.'} error={fieldError('inquiryCompletionPreview')} required>
              <textarea name="inquiryCompletionPreview" rows={5} defaultValue={settings.inquiryCompletion.preview} disabled={disabled} required className="border-border bg-surface text-body-sm text-fg w-full rounded-xl border px-4 py-3 outline-none disabled:opacity-60" />
            </Field>
          </Stack>
        </section>

        {canUpdate ? <div className="flex justify-end"><Button type="submit" size="lg" loading={pending} disabled={pending}>Simpan pengaturan WhatsApp</Button></div> : null}
      </Stack>
    </form>
  )
}
