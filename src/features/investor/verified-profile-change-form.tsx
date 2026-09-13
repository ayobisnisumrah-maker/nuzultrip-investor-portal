'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input, Textarea } from '@/ui/input'

type Profile = {
  email: string
  whatsappNumber: string | null
  country: string
  city: string | null
  address: string | null
  organizationName: string | null
  organizationRole: string | null
  bankName: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-body-sm font-medium text-fg">
      <span>{label}</span>
      {help ? <span className="text-caption font-normal text-fg-muted">{help}</span> : null}
      {children}
    </label>
  )
}

export function VerifiedProfileChangeForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim()
    const nullable = (key: string) => value(key) || null
    const payload: Record<string, unknown> = { reason: value('reason') }

    if (value('email') !== profile.email) payload.email = value('email')
    if (nullable('whatsappNumber') !== profile.whatsappNumber) payload.whatsappNumber = nullable('whatsappNumber')
    if (value('country').toUpperCase() !== profile.country) payload.country = value('country').toUpperCase()
    if (nullable('city') !== profile.city) payload.city = nullable('city')
    if (nullable('address') !== profile.address) payload.address = nullable('address')
    if (nullable('organizationName') !== profile.organizationName) payload.organizationName = nullable('organizationName')
    if (nullable('organizationRole') !== profile.organizationRole) payload.organizationRole = nullable('organizationRole')

    const bankChanged =
      nullable('bankName') !== profile.bankName ||
      nullable('bankAccountName') !== profile.bankAccountName ||
      nullable('bankAccountNumber') !== profile.bankAccountNumber
    if (bankChanged) {
      payload.bankName = nullable('bankName')
      payload.bankAccountName = nullable('bankAccountName')
      payload.bankAccountNumber = nullable('bankAccountNumber')
    }

    if (Object.keys(payload).length === 1) {
      setMessage({ tone: 'danger', text: 'Tidak ada perubahan data yang dipilih.' })
      return
    }

    setPending(true)
    try {
      const response = await fetch('/api/investor/profile-change-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Pengajuan tidak dapat dikirim.')
      setMessage({ tone: 'success', text: 'Pengajuan perubahan berhasil dikirim untuk ditinjau admin.' })
      router.refresh()
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Pengajuan tidak dapat dikirim.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <div>
        <h3 className="text-title-sm font-semibold text-fg">Ajukan perubahan data</h3>
        <p className="text-body-sm mt-1 text-fg-muted">Perubahan email, kontak, alamat, organisasi, atau rekening baru berlaku setelah ditinjau dan diterapkan admin. Semua perubahan tercatat pada audit trail.</p>
      </div>

      {message ? <Alert tone={message.tone} title={message.tone === 'success' ? 'Pengajuan terkirim' : 'Pengajuan gagal'}>{message.text}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email" help="Email login. Perubahan diterapkan admin setelah persetujuan."><Input name="email" type="email" defaultValue={profile.email} required maxLength={320} /></Field>
        <Field label="WhatsApp" help="Nomor yang digunakan untuk komunikasi resmi."><Input name="whatsappNumber" defaultValue={profile.whatsappNumber ?? ''} maxLength={32} inputMode="tel" /></Field>
        <Field label="Kode negara" help="Kode ISO dua huruf."><Input name="country" defaultValue={profile.country} required minLength={2} maxLength={2} className="uppercase" /></Field>
        <Field label="Kota"><Input name="city" defaultValue={profile.city ?? ''} maxLength={120} /></Field>
        <div className="md:col-span-2"><Field label="Alamat"><Textarea name="address" defaultValue={profile.address ?? ''} maxLength={1000} /></Field></div>
        <Field label="Organisasi"><Input name="organizationName" defaultValue={profile.organizationName ?? ''} maxLength={180} /></Field>
        <Field label="Jabatan"><Input name="organizationRole" defaultValue={profile.organizationRole ?? ''} maxLength={120} /></Field>
      </div>

      <div className="border-border border-t pt-6">
        <h3 className="text-title-sm font-semibold text-fg">Rekening pembayaran</h3>
        <p className="text-body-sm mt-1 text-fg-muted">Jika salah satu data rekening berubah, sistem mengajukan satu set data rekening lengkap.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Bank"><Input name="bankName" defaultValue={profile.bankName ?? ''} maxLength={120} /></Field>
          <Field label="Nama pemilik rekening"><Input name="bankAccountName" defaultValue={profile.bankAccountName ?? ''} maxLength={160} /></Field>
          <Field label="Nomor rekening"><Input name="bankAccountNumber" defaultValue={profile.bankAccountNumber ?? ''} maxLength={40} inputMode="numeric" /></Field>
        </div>
      </div>

      <Field label="Alasan perubahan" help="Jelaskan alasan agar admin dapat memverifikasi pengajuan."><Textarea name="reason" required minLength={3} maxLength={2000} /></Field>

      <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? 'Mengirim…' : 'Ajukan Perubahan'}</Button></div>
    </form>
  )
}
