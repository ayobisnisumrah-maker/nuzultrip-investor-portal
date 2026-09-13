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
        email: String(formData.get('email') ?? ''),
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
        title: 'Undangan investor dikirim',
        description: `Surel aktivasi telah dikirim ke ${result.data.email}.`,
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
          Nama legal
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
          Gunakan nama sesuai identitas resmi. Setelah investor terverifikasi, nama legal akan terkunci.
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
        </div>
      ) : null}

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

      {error ? (
        <Alert tone="danger" title="Undangan tidak dapat dikirim">
          {error}
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={pending}>
          Kirim undangan investor
        </Button>
      </div>
    </form>
  )
}
