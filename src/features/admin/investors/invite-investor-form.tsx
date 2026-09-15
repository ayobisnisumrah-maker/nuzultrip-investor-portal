'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { inviteInvestor } from '@/server/investors/invite-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { useToast } from '@/ui/toast'

export function InviteInvestorForm() {
  const router = useRouter()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [investorType, setInvestorType] = useState<'individual' | 'institution'>('individual')

  function submit(formData: FormData) {
    if (pending) return
    setError(null)

    startTransition(async () => {
      const result = await inviteInvestor({
        legalName: String(formData.get('legalName') ?? ''),
        identityNumber: String(formData.get('identityNumber') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        email: String(formData.get('email') ?? ''),
        address: String(formData.get('address') ?? ''),
        investorType,
        organizationName:
          investorType === 'institution' ? String(formData.get('organizationName') ?? '') : null,
      })

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      const whatsappText =
        result.data.whatsappStatus === 'sent'
          ? ' Konfirmasi WhatsApp juga sudah dikirim.'
          : ' Konfirmasi WhatsApp belum terkirim; periksa konfigurasi WhatsApp di Pengaturan.'

      push({
        tone: 'success',
        title: 'Investor berhasil didaftarkan',
        description: `Tautan pembuatan kata sandi telah dikirim ke ${result.data.email}.${whatsappText}`,
      })
      router.push(`/admin/investors/${result.data.investorId}`)
      router.refresh()
    })
  }

  return (
    <form action={submit} className="space-y-5">
      <Field
        label="Tipe investor"
        hint="Menentukan profil awal investor. Verifikasi tetap mengikuti lifecycle investor di sistem."
        required
      >
        <select
          id="invite-investor-type"
          name="investorType"
          value={investorType}
          onChange={(event) =>
            setInvestorType(event.target.value === 'institution' ? 'institution' : 'individual')
          }
          disabled={pending}
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-11 w-full rounded-lg border px-3 outline-none"
        >
          <option value="individual">Individu</option>
          <option value="institution">Institusi</option>
        </select>
      </Field>

      <Field
        label="Nama lengkap"
        hint="Gunakan nama lengkap sesuai KTP/identitas resmi investor."
        required
      >
        <Input
          name="legalName"
          required
          minLength={2}
          maxLength={160}
          disabled={pending}
          autoComplete="name"
        />
      </Field>

      <Field
        label="NIK / No. KTP"
        hint="Wajib 16 digit. Sistem hanya menyimpan salted hash NIK, bukan nomor KTP plaintext."
        required
      >
        <Input
          name="identityNumber"
          inputMode="numeric"
          pattern="[0-9 ]{16,24}"
          required
          maxLength={24}
          disabled={pending}
          autoComplete="off"
        />
      </Field>

      <Field
        label="Nomor HP / WhatsApp"
        hint="Gunakan nomor WhatsApp aktif. Format 08xx atau +628xx diterima dan dinormalisasi sistem."
        required
      >
        <Input
          name="phone"
          type="tel"
          required
          maxLength={24}
          disabled={pending}
          autoComplete="tel"
        />
      </Field>

      <Field
        label="Email"
        hint="Link pembuatan kata sandi dikirim ke email ini. Admin tidak pernah mengetahui kata sandi investor."
        required
      >
        <Input
          name="email"
          type="email"
          required
          maxLength={320}
          disabled={pending}
          autoComplete="email"
        />
      </Field>

      <Field
        label="Alamat lengkap"
        hint="Isi alamat domisili investor secara lengkap untuk data administrasi investor."
        required
      >
        <textarea
          name="address"
          required
          minLength={5}
          maxLength={1000}
          rows={4}
          disabled={pending}
          autoComplete="street-address"
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid w-full rounded-lg border px-3 py-2 outline-none disabled:opacity-60"
        />
      </Field>

      {investorType === 'institution' ? (
        <Field label="Nama institusi" hint="Wajib untuk investor institusi." required>
          <Input
            name="organizationName"
            required
            maxLength={200}
            disabled={pending}
            autoComplete="organization"
          />
        </Field>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Investor tidak dapat didaftarkan">
          {error}
        </Alert>
      ) : null}

      <Alert tone="info">
        Setelah data tersimpan, investor menerima email berisi link pembuatan kata sandi. Jika WhatsApp aktif di Pengaturan, sistem juga mengirim konfirmasi otomatis ke nomor di atas.
      </Alert>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={pending}>
          Daftarkan investor & kirim undangan
        </Button>
      </div>
    </form>
  )
}
