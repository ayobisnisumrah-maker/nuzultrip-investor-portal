'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { saveCompanyProfileIdentity } from '@/server/admin/company-profile-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

export type CompanyIdentityEditorValue = {
  id: string | null
  displayName: string
  legalName: string
  slug: string
}

export function CompanyProfileIdentityEditor({
  value,
  canUpdate,
}: {
  value: CompanyIdentityEditorValue
  canUpdate: boolean
}) {
  const router = useRouter()
  const { push } = useToast()
  const [displayName, setDisplayName] = useState(value.displayName)
  const [legalName, setLegalName] = useState(value.legalName)
  const [slug, setSlug] = useState(value.slug)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    if (!canUpdate || pending) return
    setError(null)
    startTransition(async () => {
      const result = await saveCompanyProfileIdentity({
        profileId: value.id,
        displayName,
        legalName,
        slug,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
      push({
        tone: 'success',
        title: value.id ? 'Identitas perusahaan diperbarui' : 'Profil perusahaan dibuat',
        description: 'Perubahan tersinkron ke permukaan aplikasi secara realtime.',
      })
    })
  }

  return (
    <div className="grid gap-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-body-sm text-fg font-medium">Nama tampilan</span>
          <input
            value={displayName}
            maxLength={160}
            disabled={!canUpdate || pending}
            onChange={(event) => setDisplayName(event.target.value)}
            className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none disabled:opacity-60"
            placeholder="Nuzultrip"
          />
        </label>

        <label className="block">
          <span className="text-body-sm text-fg font-medium">Nama legal</span>
          <input
            value={legalName}
            maxLength={200}
            disabled={!canUpdate || pending}
            onChange={(event) => setLegalName(event.target.value)}
            className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none disabled:opacity-60"
            placeholder="PT ..."
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-body-sm text-fg font-medium">Slug</span>
          <input
            value={slug}
            maxLength={80}
            disabled={!canUpdate || pending}
            onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
            className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 font-mono text-sm outline-none disabled:opacity-60"
            placeholder="nuzultrip"
          />
          <span className="text-caption text-fg-subtle mt-1.5 block">
            Huruf kecil, angka, dan tanda hubung. Slug dipakai sebagai identitas stabil profil.
          </span>
        </label>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={
            !canUpdate ||
            pending ||
            displayName.trim().length < 2 ||
            legalName.trim().length < 2 ||
            slug.trim().length < 2
          }
          onClick={save}
        >
          {pending ? 'Menyimpan…' : value.id ? 'Simpan Identitas' : 'Buat Profil Perusahaan'}
        </Button>
      </div>
    </div>
  )
}
