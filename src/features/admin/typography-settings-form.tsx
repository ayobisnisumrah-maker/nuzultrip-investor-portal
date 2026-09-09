'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { TypographySettings } from '@/server/settings/typography'
import { updateAdminTypographySettings } from '@/server/admin/settings-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

const FONT_OPTIONS = [
  { value: 'figtree', label: 'Figtree' },
  { value: 'system', label: 'System Sans' },
  { value: 'arial', label: 'Arial' },
  { value: 'georgia', label: 'Georgia' },
] as const

export function TypographySettingsForm({
  settings,
  canUpdate,
}: {
  settings: TypographySettings
  canUpdate: boolean
}) {
  const router = useRouter()
  const { push } = useToast()
  const [fontFamily, setFontFamily] = useState(settings.fontFamily)
  const [fontSizePercent, setFontSizePercent] = useState(settings.fontSizePercent)
  const [letterSpacingEm, setLetterSpacingEm] = useState(settings.letterSpacingEm)
  const [lineHeight, setLineHeight] = useState(settings.lineHeight)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    if (!canUpdate || pending) return
    setError(null)
    startTransition(async () => {
      const result = await updateAdminTypographySettings({
        fontFamily,
        fontSizePercent,
        letterSpacingEm,
        lineHeight,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
      push({
        tone: 'success',
        title: 'Tipografi diperbarui',
        description: 'Pengaturan baru berlaku untuk portal, dashboard, auth, dan seluruh sistem.',
      })
    })
  }

  return (
    <section className="border-border bg-surface rounded-2xl border p-6">
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="font-display text-heading-sm text-fg">Tipografi Global</h3>
          <p className="text-body-sm text-fg-muted mt-1">
            Pengaturan ini menjadi design token global untuk portal publik, Admin, Investor, autentikasi, form, tabel, dan komponen sistem.
          </p>
        </div>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-body-sm text-fg font-medium">Jenis Font</span>
            <select
              value={fontFamily}
              disabled={!canUpdate}
              onChange={(event) => setFontFamily(event.target.value as TypographySettings['fontFamily'])}
              className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none disabled:opacity-60"
            >
              {FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-body-sm text-fg flex items-center justify-between gap-3 font-medium">
              <span>Ukuran Font Global</span>
              <span className="text-caption text-fg-muted">{fontSizePercent}%</span>
            </div>
            <input
              type="range"
              min={85}
              max={125}
              step={1}
              value={fontSizePercent}
              disabled={!canUpdate}
              onChange={(event) => setFontSizePercent(Number(event.target.value))}
              className="mt-3 w-full"
            />
            <p className="text-caption text-fg-muted mt-1">85%–125%. Default 100%.</p>
          </label>

          <label className="block">
            <div className="text-body-sm text-fg flex items-center justify-between gap-3 font-medium">
              <span>Kerapatan Huruf</span>
              <span className="text-caption text-fg-muted">{letterSpacingEm.toFixed(3)}em</span>
            </div>
            <input
              type="range"
              min={-0.03}
              max={0.08}
              step={0.005}
              value={letterSpacingEm}
              disabled={!canUpdate}
              onChange={(event) => setLetterSpacingEm(Number(event.target.value))}
              className="mt-3 w-full"
            />
            <p className="text-caption text-fg-muted mt-1">Nilai negatif lebih rapat, nilai positif lebih renggang.</p>
          </label>

          <label className="block">
            <div className="text-body-sm text-fg flex items-center justify-between gap-3 font-medium">
              <span>Jarak Antarbaris</span>
              <span className="text-caption text-fg-muted">{lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={1.2}
              max={1.9}
              step={0.05}
              value={lineHeight}
              disabled={!canUpdate}
              onChange={(event) => setLineHeight(Number(event.target.value))}
              className="mt-3 w-full"
            />
            <p className="text-caption text-fg-muted mt-1">Mengatur leading teks secara global; heading memakai rasio yang lebih rapat.</p>
          </label>
        </div>

        <div
          className="border-border bg-canvas rounded-2xl border p-5"
          style={{
            fontFamily: fontFamily === 'figtree' ? 'var(--font-jakarta), sans-serif' : fontFamily === 'georgia' ? 'Georgia, serif' : fontFamily === 'arial' ? 'Arial, sans-serif' : 'system-ui, sans-serif',
            fontSize: `${fontSizePercent}%`,
            letterSpacing: `${letterSpacingEm}em`,
            lineHeight,
          }}
        >
          <p className="text-xs font-semibold uppercase">Preview</p>
          <p className="mt-2 text-2xl font-semibold">Nuzultrip Equity Relations</p>
          <p className="mt-2">Membangun nilai dan kepemilikan bersama melalui sistem yang rapi, transparan, dan mudah digunakan.</p>
        </div>

        <div className="flex justify-end">
          <Button disabled={!canUpdate || pending} onClick={save}>
            {pending ? 'Menyimpan…' : 'Simpan Tipografi Global'}
          </Button>
        </div>
      </div>
    </section>
  )
}
