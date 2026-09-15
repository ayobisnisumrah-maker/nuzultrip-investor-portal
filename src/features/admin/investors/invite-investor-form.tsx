'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { inviteInvestor } from '@/server/investors/invite-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
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

      push({
        tone: 'success',
        title: 'Investor berhasil didaftarkan',
        description: `Tautan pembuatan kata sandi telah dikirim ke ${result.data.email}.`,
      })
      router.push(`/admin/investors/${result.data.investorId}`)
      router.refresh()
    })
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="invite-investor-type" className="text-body-sm text-fg font-medium">
          Tipe investor
        </label>
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
        <p className="text-caption text-fg-subtle">
          Menentukan profil awal investor. Verifikasi tetap mengikuti lifecycle investor di sistem.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-legal-name" className="text-body-sm text-fg font-medium">
          Nama lengkap
        </label>
        <input
          id="invite-legal-name"
          name="legalName"
          required
          minLength={2}
          maxLength={160}
          disabled={pending}
          autoComplete="name"
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-11 w-full rounded-lg border px-3 outline-none"
        />
        <p className="text-caption text-fg-subtle">
          Gunakan nama sesuai identitas resmi. Data ini menjadi identitas utama profil investor.
        </p>
      </div>

      {investorType === 'institution' ? (
        <div className="space-y-2">
          <label htmlFor="invite-organization" className="text-body-sm text-fg font-medium">
            Nama institusi
          </label>
          <input
            id="invite-organization"
            name="organizationName"
            required
            maxLength={200}
            disabled={pending}
            className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-11 w-full rounded-lg border px-3 outline-none"
          />
          <p className="text-caption text-fg-subtle">
            Diisi untuk investor berbentuk institusi atau badan usaha.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="invite-identity-number" className="text-body-sm text-fg font-medium">
          No. KTP
        </label>
        <input
          id="invite-identity-number"
          name="identityNumber"
          inputMode="numeric"
          pattern="[0-9]{16}"
          minLength={16}
          maxLength={16}
          required
          disabled={pending}
          autoComplete="off"
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-11 w-full rounded-lg border px-3 outline-none"
        />
        <p className="text-caption text-fg-subtle">
          Harus 16 digit. Sistem menyimpan bentuk hash untuk pencocokan dan pencegahan duplikasi, bukan nomor KTP mentah.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-phone" className="text-body-sm text-fg font-medium">
          No. HP / WhatsApp
        </label>
        <input
          id="invite-phone"
          name="phone"
          type="tel"
          required
          minLength={10}
          maxLength={24}
          disabled={pending}
          autoComplete="tel"
          placeholder="0812xxxxxxx"
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-11 w-full rounded-lg border px-3 outline-none"
        />
        <p className="text-caption text-fg-subtle">
          Nomor Indonesia yang aktif. Digunakan untuk notifikasi layanan, termasuk konfirmasi aktivasi setelah kanal WhatsApp terhubung.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-email" className="text-body-sm text-fg font-medium">
          Surel investor
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          maxLength={320}
          disabled={pending}
          autoComplete="email"
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-11 w-full rounded-lg border px-3 outline-none"
        />
        <p className="text-caption text-fg-subtle">
          Sistem mengirim tautan aktivasi ke surel ini. Investor membuat kata sandinya sendiri; admin tidak pernah mengetahui kata sandi investor.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-address" className="text-body-sm text-fg font-medium">
          Alamat
        </label>
        <textarea
          id="invite-address"
          name="address"
          required
          minLength={5}
          maxLength={500}
          rows={4}
          disabled={pending}
          autoComplete="street-address"
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid w-full rounded-lg border px-3 py-2.5 outline-none"
        />
        <p className="text-caption text-fg-subtle">
          Alamat domisili atau alamat korespondensi yang digunakan pada administrasi investor.
        </p>
      </div>

      {error ? (
        <Alert tone="danger" title="Investor tidak dapat didaftarkan">
          {error}
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={pending}>
          Daftarkan investor & kirim undangan
        </Button>
      </div>
    </form>
  )
}
