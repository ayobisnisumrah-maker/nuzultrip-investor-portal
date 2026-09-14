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
        whatsappNumber: String(formData.get('whatsappNumber') ?? ''),
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

      const whatsappDescription =
        result.data.whatsappDelivery === 'sent'
          ? ' Konfirmasi WhatsApp juga berhasil dikirim.'
          : result.data.whatsappDelivery === 'failed'
            ? ' Surel berhasil dikirim, tetapi WhatsApp gagal dikirim. Periksa konfigurasi WhatsApp di Pengaturan.'
            : ' Konfirmasi WhatsApp belum dikirim karena layanan WhatsApp belum diaktifkan.'

      push({
        tone: result.data.whatsappDelivery === 'failed' ? 'warning' : 'success',
        title: 'Calon investor berhasil didaftarkan',
        description: `Tautan pembuatan kata sandi telah dikirim ke ${result.data.email}.${whatsappDescription}`,
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
          Menentukan profil awal calon investor. Kepemilikan saham belum terbentuk pada tahap ini.
        </p>
      </div>

      <Field
        label="Nama lengkap sesuai KTP"
        hint="Nama ini menjadi identitas legal investor dan akan terkunci setelah verifikasi selesai."
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
        label="Nomor KTP / NIK"
        hint="Masukkan 16 digit NIK. Sistem hanya menyimpan hash terproteksi; nomor mentah tidak disimpan."
        required
      >
        <Input
          name="identityNumber"
          required
          inputMode="numeric"
          pattern="[0-9]{16}"
          minLength={16}
          maxLength={16}
          disabled={pending}
          autoComplete="off"
        />
      </Field>

      <Field
        label="Nomor WhatsApp"
        hint="Gunakan nomor aktif dengan kode negara, misalnya +6281234567890. Nomor ini dipakai untuk konfirmasi otomatis."
        required
      >
        <Input
          name="whatsappNumber"
          type="tel"
          required
          minLength={8}
          maxLength={32}
          disabled={pending}
          autoComplete="tel"
          placeholder="+6281234567890"
        />
      </Field>

      <Field
        label="Surel investor"
        hint="Sistem mengirim tautan aktivasi/set kata sandi ke surel ini. Admin tidak pernah mengetahui kata sandi investor."
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
        hint="Alamat domisili investor untuk data profil dan administrasi investasi."
        required
      >
        <textarea
          name="address"
          required
          minLength={5}
          maxLength={500}
          disabled={pending}
          rows={4}
          className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid w-full rounded-lg border px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </Field>

      {investorType === 'institution' ? (
        <Field
          label="Nama institusi"
          hint="Wajib untuk investor berbentuk institusi."
          required
        >
          <Input
            name="organizationName"
            required
            maxLength={200}
            disabled={pending}
          />
        </Field>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Calon investor tidak dapat didaftarkan">
          {error}
        </Alert>
      ) : null}

      <Alert tone="info">
        Setelah didaftarkan, calon investor menerima tautan melalui surel untuk membuat kata sandi. Status calon investor belum menjadi pemegang saham sampai proses pembelian dan verifikasi pembayaran selesai.
      </Alert>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={pending}>
          Daftarkan & kirim undangan
        </Button>
      </div>
    </form>
  )
}
