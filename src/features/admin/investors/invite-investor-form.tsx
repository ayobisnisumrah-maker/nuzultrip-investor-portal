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
        description: `Tautan pembuatan kata sandi dikirim ke ${result.data.email}. Konfirmasi WhatsApp dijadwalkan ke ${result.data.phone}.`,
      })
      router.push(`/admin/investors/${result.data.investorId}`)
      router.refresh()
    })
  }

  const inputClass =
    'border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-11 w-full rounded-lg border px-3 outline-none'

  return (
    <form action={submit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="invite-investor-type" className="text-body-sm text-fg font-medium">Tipe investor</label>
        <select
          id="invite-investor-type"
          name="investorType"
          value={investorType}
          onChange={(event) => setInvestorType(event.target.value === 'institution' ? 'institution' : 'individual')}
          disabled={pending}
          className={inputClass}
        >
          <option value="individual">Individu</option>
          <option value="institution">Institusi</option>
        </select>
        <p className="text-caption text-fg-subtle">Hak mendaftarkan investor mengikuti permission role <span className="font-mono">investors.create</span>.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-legal-name" className="text-body-sm text-fg font-medium">Nama lengkap</label>
        <input id="invite-legal-name" name="legalName" required minLength={2} maxLength={160} disabled={pending} autoComplete="name" className={inputClass} />
        <p className="text-caption text-fg-subtle">Isi nama lengkap sesuai KTP atau identitas resmi investor.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-identity-number" className="text-body-sm text-fg font-medium">Nomor KTP (NIK)</label>
        <input id="invite-identity-number" name="identityNumber" required inputMode="numeric" pattern="[0-9]{16}" minLength={16} maxLength={16} disabled={pending} autoComplete="off" className={inputClass} />
        <p className="text-caption text-fg-subtle">16 digit NIK. Sistem menyimpan fingerprint satu arah untuk verifikasi dan pencegahan duplikasi; NIK mentah tidak disimpan pada profil.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-phone" className="text-body-sm text-fg font-medium">Nomor HP / WhatsApp</label>
        <input id="invite-phone" name="phone" type="tel" required minLength={8} maxLength={20} disabled={pending} autoComplete="tel" placeholder="Contoh: 081234567890" className={inputClass} />
        <p className="text-caption text-fg-subtle">Digunakan untuk konfirmasi otomatis bahwa tautan pembuatan kata sandi telah dikirim ke email.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-email" className="text-body-sm text-fg font-medium">Email</label>
        <input id="invite-email" name="email" type="email" required maxLength={320} disabled={pending} autoComplete="email" className={inputClass} />
        <p className="text-caption text-fg-subtle">Sistem mengirim tautan aktivasi ke email ini. Investor membuat kata sandinya sendiri; admin tidak mengetahui kata sandi investor.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="invite-address" className="text-body-sm text-fg font-medium">Alamat</label>
        <textarea id="invite-address" name="address" required minLength={5} maxLength={500} disabled={pending} autoComplete="street-address" rows={4} className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid w-full rounded-lg border px-3 py-2.5 outline-none" />
        <p className="text-caption text-fg-subtle">Alamat domisili atau alamat korespondensi investor yang dapat dipertanggungjawabkan.</p>
      </div>

      {investorType === 'institution' ? (
        <div className="space-y-2">
          <label htmlFor="invite-organization" className="text-body-sm text-fg font-medium">Nama institusi</label>
          <input id="invite-organization" name="organizationName" required maxLength={200} disabled={pending} className={inputClass} />
        </div>
      ) : null}

      {error ? <Alert tone="danger" title="Investor tidak dapat didaftarkan">{error}</Alert> : null}

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={pending}>Daftarkan & kirim akses</Button>
      </div>
    </form>
  )
}
