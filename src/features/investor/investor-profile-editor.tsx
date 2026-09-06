'use client'

import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input, Textarea } from '@/ui/input'

type InvestorProfileEditorProps = {
  investor: {
    legalName: string
    whatsappNumber: string | null
    country: string
    city: string | null
    address: string | null
    organizationName: string | null
    organizationRole: string | null
    bankName: string | null
    bankAccountName: string | null
    bankAccountNumber: string | null
    identityFileName: string | null
    identityUploadedAt: string | null
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-body-sm font-medium text-fg">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function InvestorProfileEditor({ investor }: InvestorProfileEditorProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [documentMessage, setDocumentMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setProfileMessage(null)

    const form = new FormData(event.currentTarget)
    const nullable = (key: string) => {
      const value = String(form.get(key) ?? '').trim()
      return value || null
    }

    try {
      const response = await fetch('/api/investor/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          legalName: String(form.get('legalName') ?? '').trim(),
          whatsappNumber: nullable('whatsappNumber'),
          country: String(form.get('country') ?? '').trim().toUpperCase(),
          city: nullable('city'),
          address: nullable('address'),
          organizationName: nullable('organizationName'),
          organizationRole: nullable('organizationRole'),
          bankName: nullable('bankName'),
          bankAccountName: nullable('bankAccountName'),
          bankAccountNumber: nullable('bankAccountNumber'),
        }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Profil gagal disimpan.')

      setProfileMessage({ tone: 'success', text: 'Profil dan rekening berhasil diperbarui.' })
      router.refresh()
    } catch (error) {
      setProfileMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Profil gagal disimpan.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function uploadIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setDocumentMessage({ tone: 'danger', text: 'Pilih dokumen identitas terlebih dahulu.' })
      return
    }

    setUploading(true)
    setDocumentMessage(null)
    const body = new FormData()
    body.set('file', file)

    try {
      const response = await fetch('/api/investor/identity-document', { method: 'POST', body })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Dokumen gagal diunggah.')

      setDocumentMessage({ tone: 'success', text: 'Dokumen identitas berhasil diunggah.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } catch (error) {
      setDocumentMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Dokumen gagal diunggah.',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={saveProfile} className="grid gap-6">
        {profileMessage ? (
          <Alert tone={profileMessage.tone} title={profileMessage.tone === 'success' ? 'Tersimpan' : 'Gagal menyimpan'}>
            {profileMessage.text}
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nama legal">
            <Input name="legalName" defaultValue={investor.legalName} required maxLength={160} autoComplete="name" />
          </Field>
          <Field label="WhatsApp">
            <Input name="whatsappNumber" defaultValue={investor.whatsappNumber ?? ''} maxLength={32} inputMode="tel" autoComplete="tel" />
          </Field>
          <Field label="Kode negara (ISO 2 huruf)">
            <Input name="country" defaultValue={investor.country} required minLength={2} maxLength={2} className="uppercase" />
          </Field>
          <Field label="Kota">
            <Input name="city" defaultValue={investor.city ?? ''} maxLength={120} autoComplete="address-level2" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Alamat">
              <Textarea name="address" defaultValue={investor.address ?? ''} maxLength={1000} autoComplete="street-address" />
            </Field>
          </div>
          <Field label="Organisasi">
            <Input name="organizationName" defaultValue={investor.organizationName ?? ''} maxLength={180} autoComplete="organization" />
          </Field>
          <Field label="Jabatan">
            <Input name="organizationRole" defaultValue={investor.organizationRole ?? ''} maxLength={120} autoComplete="organization-title" />
          </Field>
        </div>

        <div className="border-border border-t pt-6">
          <h3 className="text-title-sm text-fg font-semibold">Rekening pembayaran</h3>
          <p className="text-body-sm text-fg-muted mt-1">Jika rekening diisi, ketiga data rekening wajib lengkap.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Bank">
              <Input name="bankName" defaultValue={investor.bankName ?? ''} maxLength={120} autoComplete="off" />
            </Field>
            <Field label="Nama pemilik rekening">
              <Input name="bankAccountName" defaultValue={investor.bankAccountName ?? ''} maxLength={160} autoComplete="off" />
            </Field>
            <Field label="Nomor rekening">
              <Input name="bankAccountNumber" defaultValue={investor.bankAccountNumber ?? ''} maxLength={40} inputMode="numeric" autoComplete="off" />
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan perubahan'}</Button>
        </div>
      </form>

      <form onSubmit={uploadIdentity} className="border-border grid gap-4 border-t pt-6">
        <div>
          <h3 className="text-title-sm text-fg font-semibold">Dokumen identitas</h3>
          <p className="text-body-sm text-fg-muted mt-1">PDF, JPG, PNG, atau WebP. Maksimal 10 MB. File disimpan pada storage privat.</p>
        </div>
        {investor.identityFileName ? (
          <p className="text-body-sm text-fg-muted">Tersimpan: <span className="font-medium text-fg">{investor.identityFileName}</span></p>
        ) : null}
        {documentMessage ? (
          <Alert tone={documentMessage.tone} title={documentMessage.tone === 'success' ? 'Berhasil' : 'Gagal mengunggah'}>
            {documentMessage.text}
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label="Pilih dokumen identitas">
              <Input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
            </Field>
          </div>
          <Button type="submit" variant="secondary" disabled={uploading}>{uploading ? 'Mengunggah…' : investor.identityFileName ? 'Ganti dokumen' : 'Unggah dokumen'}</Button>
        </div>
      </form>
    </div>
  )
}
