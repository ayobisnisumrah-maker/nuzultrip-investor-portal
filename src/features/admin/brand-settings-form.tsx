'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { BrandSettings } from '@/server/settings/brand'
import { updateAdminBrandSettings } from '@/server/admin/settings-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

export function BrandSettingsForm({
  settings,
  canUpdate,
}: {
  settings: BrandSettings
  canUpdate: boolean
}) {
  const router = useRouter()
  const { push } = useToast()
  const [name, setName] = useState(settings.name)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    if (!canUpdate || pending) return
    setError(null)
    startTransition(async () => {
      const result = await updateAdminBrandSettings({ name })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
      push({
        tone: 'success',
        title: 'Nama aplikasi diperbarui',
        description: 'Judul browser dan identitas global akan tersinkron otomatis.',
      })
    })
  }

  return (
    <section className="border-border bg-surface rounded-2xl border p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="font-display text-heading-sm text-fg">Nama Aplikasi</h3>
          <p className="text-body-sm text-fg-muted mt-1">
            Nama ini dipakai pada judul tab browser, metadata aplikasi, serta identitas global Admin, Investor, dan autentikasi.
          </p>
        </div>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <label className="block max-w-2xl">
          <span className="text-body-sm text-fg font-medium">Nama aplikasi</span>
          <input
            value={name}
            disabled={!canUpdate || pending}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none disabled:opacity-60"
            placeholder="Contoh: Nuzultrip Equity"
          />
          <span className="text-caption text-fg-subtle mt-1.5 block">
            2–120 karakter. Perubahan disiarkan ke permukaan aplikasi yang sedang terbuka.
          </span>
        </label>

        <div className="flex justify-end">
          <Button disabled={!canUpdate || pending || name.trim().length < 2} onClick={save}>
            {pending ? 'Menyimpan…' : 'Simpan Nama Aplikasi'}
          </Button>
        </div>
      </div>
    </section>
  )
}
