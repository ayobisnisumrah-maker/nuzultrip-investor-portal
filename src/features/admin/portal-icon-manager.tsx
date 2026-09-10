'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { returnPortalPageToDraft, savePortalSection } from '@/server/portal/admin-actions'

type IconSectionKind = 'business_overview' | 'ecosystem' | 'investor_updates'

type PortalSectionContent = {
  kind: IconSectionKind
  items?: unknown
  [key: string]: unknown
}

type IconSection = {
  pageId: string
  pageTitle: string
  pageStatus: string
  sectionId: string
  sectionKind: IconSectionKind
  sectionLabel: string
  content: PortalSectionContent
}

type PresetIcon = {
  label: string
  glyph: string
}

const PRESET_ICONS: PresetIcon[] = [
  { label: 'Pesawat', glyph: '✈' },
  { label: 'Beranda', glyph: '⌂' },
  { label: 'Berlian', glyph: '◆' },
  { label: 'Berlian Outline', glyph: '◇' },
  { label: 'Sorotan', glyph: '✦' },
  { label: 'Sorotan Outline', glyph: '✧' },
  { label: 'Bintang', glyph: '★' },
  { label: 'Bintang Outline', glyph: '☆' },
  { label: 'Centang', glyph: '✓' },
  { label: 'Checklist', glyph: '☑' },
  { label: 'Lingkaran', glyph: '●' },
  { label: 'Lingkaran Outline', glyph: '○' },
  { label: 'Kotak', glyph: '■' },
  { label: 'Kotak Outline', glyph: '□' },
  { label: 'Segitiga', glyph: '▲' },
  { label: 'Segitiga Outline', glyph: '△' },
  { label: 'Pertumbuhan', glyph: '↗' },
  { label: 'Pertukaran', glyph: '↔' },
  { label: 'Arah', glyph: '➜' },
  { label: 'Kontinuitas', glyph: '∞' },
  { label: 'Sistem', glyph: '⌘' },
  { label: 'Pengaturan', glyph: '⚙' },
  { label: 'Surel', glyph: '✉' },
  { label: 'Telepon', glyph: '☎' },
  { label: 'Legal', glyph: '§' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function itemTitle(item: Record<string, unknown>, index: number) {
  const title = item.title
  return typeof title === 'string' && title.trim() ? title : `Item ${index + 1}`
}

function itemIcon(item: Record<string, unknown>) {
  return typeof item.icon === 'string' ? item.icon : ''
}

function itemIconUrl(item: Record<string, unknown>) {
  return typeof item.icon_url === 'string' ? item.icon_url : ''
}

export function PortalIconManager({
  sections,
  canUpdate,
}: {
  sections: IconSection[]
  canUpdate: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [message, setMessage] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, PortalSectionContent>>(() =>
    Object.fromEntries(sections.map((section) => [section.sectionId, section.content])),
  )

  const sectionsByPage = useMemo(() => {
    const result = new Map<string, IconSection[]>()
    for (const section of sections) {
      const current = result.get(section.pageId) ?? []
      current.push(section)
      result.set(section.pageId, current)
    }
    return result
  }, [sections])

  function updateItem(sectionId: string, index: number, patch: Record<string, unknown>) {
    setDrafts((current) => {
      const content = current[sectionId]
      if (!content) return current
      const items = Array.isArray(content.items) ? [...content.items] : []
      const existing = isRecord(items[index]) ? items[index] : {}
      items[index] = { ...existing, ...patch }
      return {
        ...current,
        [sectionId]: {
          ...content,
          items,
        },
      }
    })
    setMessage((current) => ({ ...current, [sectionId]: '' }))
  }

  async function uploadIcon(sectionId: string, index: number, file: File) {
    const key = `${sectionId}:${index}`
    setUploadingKey(key)
    setMessage((current) => ({ ...current, [sectionId]: '' }))

    try {
      const body = new FormData()
      body.set('file', file)
      body.set('purpose', 'portal')

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body,
      })
      const result = (await response.json()) as {
        error?: string
        asset?: { public_url?: string }
      }

      if (!response.ok || !result.asset?.public_url) {
        setMessage((current) => ({
          ...current,
          [sectionId]: result.error ?? 'Ikon gagal diunggah.',
        }))
        return
      }

      updateItem(sectionId, index, { icon_url: result.asset.public_url })
    } catch (error) {
      setMessage((current) => ({
        ...current,
        [sectionId]: error instanceof Error ? error.message : 'Ikon gagal diunggah.',
      }))
    } finally {
      setUploadingKey(null)
    }
  }

  function save(section: IconSection) {
    const content = drafts[section.sectionId]
    if (!content) return

    setSavingSection(section.sectionId)
    setMessage((current) => ({ ...current, [section.sectionId]: '' }))

    startTransition(async () => {
      try {
        const result = await savePortalSection({
          sectionId: section.sectionId,
          content,
          changeNote: 'Pembaruan ikon portal dari pengelola ikon.',
        })

        if (!result.ok) {
          setMessage((current) => ({
            ...current,
            [section.sectionId]: result.error?.message ?? 'Ikon gagal disimpan.',
          }))
          return
        }

        setMessage((current) => ({
          ...current,
          [section.sectionId]: 'Ikon tersimpan pada versi draf terbaru.',
        }))
        router.refresh()
      } catch (error) {
        setMessage((current) => ({
          ...current,
          [section.sectionId]: error instanceof Error ? error.message : 'Ikon gagal disimpan.',
        }))
      } finally {
        setSavingSection(null)
      }
    })
  }

  function startRevision(pageId: string) {
    startTransition(async () => {
      try {
        const result = await returnPortalPageToDraft({ pageId })
        if (!result.ok) {
          setMessage((current) => ({
            ...current,
            [pageId]: result.error?.message ?? 'Gagal memulai revisi halaman.',
          }))
          return
        }
        router.refresh()
      } catch (error) {
        setMessage((current) => ({
          ...current,
          [pageId]: error instanceof Error ? error.message : 'Gagal memulai revisi halaman.',
        }))
      }
    })
  }

  if (sections.length === 0) {
    return (
      <div className="border-border bg-surface rounded-xl border p-8 text-center">
        <p className="text-fg font-semibold">Belum ada item portal yang memakai ikon.</p>
        <p className="text-fg-muted mt-2 text-sm">
          Tambahkan item pada bagian Tentang Nuzultrip, Ekosistem Bisnis, atau Pembaruan Investor terlebih dahulu.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {[...sectionsByPage.entries()].map(([pageId, pageSections]) => {
        const page = pageSections[0]
        if (!page) return null
        const pageEditable = canUpdate && page.pageStatus === 'draft'

        return (
          <section key={pageId} className="space-y-4">
            <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-fg font-semibold">{page.pageTitle}</p>
                <p className="text-fg-muted mt-1 text-xs">
                  Status: {page.pageStatus === 'draft' ? 'Draf — ikon dapat diedit' : page.pageStatus}
                </p>
              </div>

              {!pageEditable && canUpdate && page.pageStatus === 'published' ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startRevision(pageId)}
                  className="border-primary text-primary hover:bg-primary/5 inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold disabled:opacity-50"
                >
                  {pending ? 'Menyiapkan…' : 'Mulai Revisi'}
                </button>
              ) : null}
            </div>

            {message[pageId] ? <p className="text-danger text-sm">{message[pageId]}</p> : null}

            {pageSections.map((section) => {
              const content = drafts[section.sectionId] ?? section.content
              const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []
              const editable = pageEditable

              return (
                <div key={section.sectionId} className="border-border bg-surface overflow-hidden rounded-xl border">
                  <div className="border-border border-b px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-fg text-sm font-semibold">{section.sectionLabel}</h2>
                        <p className="text-fg-muted mt-1 text-xs">
                          Pilih salah satu dari {PRESET_ICONS.length} ikon bawaan atau unggah ikon sendiri.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!editable || pending || savingSection === section.sectionId}
                        onClick={() => save(section)}
                        className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {savingSection === section.sectionId ? 'Menyimpan…' : 'Simpan Ikon'}
                      </button>
                    </div>
                  </div>

                  <div className="divide-border divide-y">
                    {items.map((item, index) => {
                      const icon = itemIcon(item)
                      const iconUrl = itemIconUrl(item)
                      const uploadKey = `${section.sectionId}:${index}`

                      return (
                        <article key={`${section.sectionId}-${index}`} className="space-y-4 p-5">
                          <div className="flex items-start gap-4">
                            <div className="border-border bg-muted/30 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-2xl">
                              {iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={iconUrl} alt="" className="h-full w-full object-contain p-2" />
                              ) : (
                                <span aria-hidden="true">{icon || '◇'}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-fg font-semibold">{itemTitle(item, index)}</p>
                              <p className="text-fg-muted mt-1 text-xs">
                                {iconUrl ? 'Menggunakan ikon unggahan.' : icon ? 'Menggunakan ikon bawaan.' : 'Belum memilih ikon.'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-fg mb-2 text-xs font-semibold">Ikon bawaan</p>
                            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-13">
                              {PRESET_ICONS.map((preset) => {
                                const selected = !iconUrl && icon === preset.glyph
                                return (
                                  <button
                                    key={`${preset.label}-${preset.glyph}`}
                                    type="button"
                                    disabled={!editable}
                                    title={preset.label}
                                    aria-label={`Pilih ikon ${preset.label}`}
                                    aria-pressed={selected}
                                    onClick={() => updateItem(section.sectionId, index, { icon: preset.glyph, icon_url: '' })}
                                    className={`flex aspect-square items-center justify-center rounded-lg border text-xl transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                      selected
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/40 text-fg'
                                    }`}
                                  >
                                    {preset.glyph}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <label className={`border-border flex min-h-10 items-center justify-center rounded-lg border border-dashed px-4 text-sm font-semibold ${editable ? 'cursor-pointer hover:bg-muted/30' : 'cursor-not-allowed opacity-45'}`}>
                              {uploadingKey === uploadKey ? 'Mengunggah…' : 'Unggah Ikon Sendiri'}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                disabled={!editable || uploadingKey === uploadKey}
                                className="sr-only"
                                onChange={(event) => {
                                  const file = event.target.files?.[0]
                                  if (file) void uploadIcon(section.sectionId, index, file)
                                  event.currentTarget.value = ''
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              disabled={!editable || (!icon && !iconUrl)}
                              onClick={() => updateItem(section.sectionId, index, { icon: '', icon_url: '' })}
                              className="border-border text-fg-muted hover:text-fg inline-flex min-h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Hapus Ikon
                            </button>

                            <p className="text-fg-subtle text-xs">
                              Upload: JPG, PNG, WebP, atau AVIF. Ikon unggahan memiliki prioritas di portal.
                            </p>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  {message[section.sectionId] ? (
                    <div className="border-border border-t px-5 py-3">
                      <p className="text-fg-muted text-sm">{message[section.sectionId]}</p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
