'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { savePortalSection } from '@/server/portal/admin-actions'

type ModuleKind = 'hero_3d' | 'contact_cta' | 'faq' | 'documents'
type ContentRecord = Record<string, unknown>

type Section = {
  id: string
  section_kind: string
  current_version: {
    id: string
    version_number: number
    status: string
    content: unknown
  } | null
}

function isRecord(value: unknown): value is ContentRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-fg block text-sm font-medium">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="border-border bg-background text-fg placeholder:text-fg-subtle focus:border-primary mt-1.5 min-h-28 w-full rounded-lg border px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="border-border bg-background text-fg placeholder:text-fg-subtle focus:border-primary mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      )}
    </label>
  )
}

export function PortalModuleEditor({
  pageId,
  pageStatus,
  section,
  kind,
  canUpdate,
}: {
  pageId: string
  pageStatus: string
  section: Section
  kind: ModuleKind
  canUpdate: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initialContent = useMemo<ContentRecord>(() => {
    const current = section.current_version?.content
    return isRecord(current) ? current : { kind }
  }, [kind, section.current_version?.content])

  const [content, setContent] = useState<ContentRecord>(initialContent)
  const editable = canUpdate && pageStatus === 'draft'

  function update(fields: ContentRecord) {
    setContent((current) => ({ ...current, ...fields }))
  }

  function items(key: 'items') {
    const value = content[key]
    return Array.isArray(value) ? value.filter(isRecord) : []
  }

  function updateItem(index: number, fields: ContentRecord) {
    const next = [...items('items')]
    next[index] = { ...(next[index] ?? {}), ...fields }
    update({ items: next })
  }

  function addItem() {
    update({ items: [...items('items'), {}] })
  }

  function removeItem(index: number) {
    const next = [...items('items')]
    next.splice(index, 1)
    update({ items: next })
  }

  function moveItem(index: number, direction: -1 | 1) {
    const next = [...items('items')]
    const target = index + direction
    if (target < 0 || target >= next.length) return

    const current = next[index]
    const targetItem = next[target]
    if (!current || !targetItem) return

    next[index] = targetItem
    next[target] = current
    update({ items: next })
  }

  function save() {
    setError(null)
    setMessage(null)

    startTransition(async () => {
      try {
        const result = await savePortalSection({
          sectionId: section.id,
          content: { ...content, kind } as never,
          changeNote: `Diperbarui dari modul ${kind}.`,
        })

        if (!result.ok) {
          setError(result.error?.message ?? 'Gagal menyimpan konten.')
          return
        }

        setMessage(`Draf v${result.data.versionNumber} berhasil disimpan.`)
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan saat menyimpan.')
      }
    })
  }

  return (
    <div className="space-y-5">
      {!editable ? (
        <div className="border-border bg-muted/30 rounded-xl border p-4">
          <p className="text-fg text-sm font-semibold">Konten sedang dikunci</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">
            Halaman saat ini berstatus <strong>{pageStatus}</strong>. Kembalikan halaman ke Draf dari editor Halaman jika Anda ingin mengubah konten ini.
          </p>
          <Link
            href={`/admin/portal/pages/${pageId}`}
            className="text-primary mt-3 inline-flex text-sm font-semibold hover:underline"
          >
            Buka editor Halaman →
          </Link>
        </div>
      ) : null}

      {message ? (
        <div className="border-success/30 bg-success/10 text-fg rounded-xl border px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="border-danger/30 bg-danger/5 text-danger rounded-xl border px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
        {kind === 'hero_3d' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} disabled={!editable} />
            <Field label="Judul Utama" value={asString(content.title)} onChange={(title) => update({ title })} disabled={!editable} />
            <div className="md:col-span-2">
              <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline disabled={!editable} />
            </div>
            <Field label="CTA Utama" value={asString(content.primary_cta_label)} onChange={(primary_cta_label) => update({ primary_cta_label })} disabled={!editable} />
            <Field label="Tautan CTA Utama" value={asString(content.primary_cta_href)} onChange={(primary_cta_href) => update({ primary_cta_href })} placeholder="/equity-offering" disabled={!editable} />
            <Field label="CTA Sekunder" value={asString(content.secondary_cta_label)} onChange={(secondary_cta_label) => update({ secondary_cta_label })} disabled={!editable} />
            <Field label="Tautan CTA Sekunder" value={asString(content.secondary_cta_href)} onChange={(secondary_cta_href) => update({ secondary_cta_href })} placeholder="/about" disabled={!editable} />
          </div>
        ) : null}

        {kind === 'contact_cta' ? (
          <div className="space-y-4">
            <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} disabled={!editable} />
            <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} disabled={!editable} />
            <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline disabled={!editable} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Label CTA" value={asString(content.primary_cta_label)} onChange={(primary_cta_label) => update({ primary_cta_label })} disabled={!editable} />
              <Field label="Tautan CTA" value={asString(content.primary_cta_href)} onChange={(primary_cta_href) => update({ primary_cta_href })} disabled={!editable} />
            </div>
          </div>
        ) : null}

        {kind === 'faq' || kind === 'documents' ? (
          <div className="space-y-5">
            <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} disabled={!editable} />
            <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} disabled={!editable} />
            {kind === 'documents' ? (
              <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline disabled={!editable} />
            ) : null}

            <div className="border-border rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-fg text-sm font-semibold">{kind === 'faq' ? 'Pertanyaan Umum' : 'Dokumen Publik'}</p>
                  <p className="text-fg-muted mt-1 text-xs">{items('items').length} item</p>
                </div>
                <button type="button" onClick={addItem} disabled={!editable || pending} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50">+ Tambah</button>
              </div>

              <div className="mt-4 space-y-4">
                {items('items').length === 0 ? (
                  <div className="border-border text-fg-muted rounded-lg border border-dashed p-5 text-center text-sm">Belum ada data.</div>
                ) : items('items').map((item, index) => (
                  <div key={index} className="border-border bg-muted/20 rounded-xl border p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-fg text-sm font-semibold">Item {index + 1}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={!editable || index === 0} className="border-border rounded-lg border px-2 py-1 text-xs disabled:opacity-40">Naik</button>
                        <button type="button" onClick={() => moveItem(index, 1)} disabled={!editable || index === items('items').length - 1} className="border-border rounded-lg border px-2 py-1 text-xs disabled:opacity-40">Turun</button>
                        <button type="button" onClick={() => removeItem(index)} disabled={!editable} className="border-danger text-danger rounded-lg border px-2 py-1 text-xs disabled:opacity-40">Hapus</button>
                      </div>
                    </div>

                    {kind === 'faq' ? (
                      <div className="space-y-4">
                        <Field label="Pertanyaan" value={asString(item.question)} onChange={(question) => updateItem(index, { question })} disabled={!editable} />
                        <Field label="Jawaban" value={asString(item.answer)} onChange={(answer) => updateItem(index, { answer })} multiline disabled={!editable} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Field label="Nama Dokumen" value={asString(item.title)} onChange={(title) => updateItem(index, { title })} disabled={!editable} />
                        <Field label="Deskripsi" value={asString(item.description)} onChange={(description) => updateItem(index, { description })} multiline disabled={!editable} />
                        <Field label="Tautan Dokumen" value={asString(item.href)} onChange={(href) => updateItem(index, { href })} placeholder="https://..." disabled={!editable} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="border-border mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <p className="text-fg-muted text-xs">
            Versi aktif: v{section.current_version?.version_number ?? 0} · {section.current_version?.status ?? 'belum ada'}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={!editable || pending}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Menyimpan...' : 'Simpan Draf'}
          </button>
        </div>
      </div>
    </div>
  )
}
