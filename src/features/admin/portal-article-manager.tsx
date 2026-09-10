'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { returnPortalPageToDraft, savePortalSection } from '@/server/portal/admin-actions'

type ContentRecord = Record<string, unknown>

type ArticleItem = {
  type: 'article' | 'news'
  title: string
  description: string
  date: string
  href: string
  image_url: string
}

function isRecord(value: unknown): value is ContentRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeItem(value: unknown): ArticleItem {
  const item = isRecord(value) ? value : {}
  return {
    type: item.type === 'news' ? 'news' : 'article',
    title: stringValue(item.title),
    description: stringValue(item.description ?? item.excerpt),
    date: stringValue(item.date),
    href: stringValue(item.href),
    image_url: stringValue(item.image_url),
  }
}

export function PortalArticleManager({
  pageId,
  pageStatus,
  sectionId,
  initialContent,
  canUpdate,
}: {
  pageId: string
  pageStatus: string
  sectionId: string
  initialContent: ContentRecord
  canUpdate: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [eyebrow, setEyebrow] = useState(stringValue(initialContent.eyebrow) || 'ARTIKEL & BERITA')
  const [title, setTitle] = useState(stringValue(initialContent.title) || 'Artikel & Berita')
  const [description, setDescription] = useState(stringValue(initialContent.description))
  const [ctaLabel, setCtaLabel] = useState(stringValue(initialContent.cta_label))
  const [ctaHref, setCtaHref] = useState(stringValue(initialContent.cta_href))
  const [items, setItems] = useState<ArticleItem[]>(() =>
    Array.isArray(initialContent.items) ? initialContent.items.map(normalizeItem) : [],
  )
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const editable = canUpdate && pageStatus === 'draft'

  function updateItem(index: number, patch: Partial<ArticleItem>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  }

  function addItem(type: 'article' | 'news') {
    setItems((current) => [
      ...current,
      { type, title: '', description: '', date: '', href: '', image_url: '' },
    ])
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const value = next[index]
      if (!value) return current
      next[index] = next[target]!
      next[target] = value
      return next
    })
  }

  async function uploadImage(index: number, file: File) {
    setUploadingIndex(index)
    setMessage(null)
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('purpose', 'portal')
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body })
      const result = (await response.json()) as { error?: string; asset?: { public_url?: string } }
      if (!response.ok || !result.asset?.public_url) {
        setMessage(result.error ?? 'Gambar gagal diunggah.')
        return
      }
      updateItem(index, { image_url: result.asset.public_url })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gambar gagal diunggah.')
    } finally {
      setUploadingIndex(null)
    }
  }

  function startRevision() {
    setMessage(null)
    startTransition(async () => {
      const result = await returnPortalPageToDraft({ pageId })
      if (!result.ok) {
        setMessage(result.error?.message ?? 'Gagal memulai revisi portal.')
        return
      }
      router.refresh()
    })
  }

  function save() {
    const content: ContentRecord = {
      ...initialContent,
      kind: 'rich_content',
      eyebrow,
      title,
      description,
      cta_label: ctaLabel,
      cta_href: ctaHref,
      items: items.map((item) => ({
        type: item.type,
        title: item.title.trim(),
        description: item.description.trim(),
        date: item.date.trim(),
        href: item.href.trim(),
        image_url: item.image_url.trim(),
      })),
    }

    setMessage(null)
    startTransition(async () => {
      const result = await savePortalSection({
        sectionId,
        content,
        changeNote: 'Pembaruan Artikel & Berita portal.',
      })

      if (!result.ok) {
        setMessage(result.error?.message ?? 'Artikel & Berita gagal disimpan.')
        return
      }

      setMessage('Konten tersimpan pada draf. Setelah revisi diterbitkan, portal publik akan memperbarui konten secara realtime.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {pageStatus !== 'draft' ? (
        <div className="border-primary/20 bg-primary/5 rounded-xl border p-4">
          <p className="text-fg text-sm font-semibold">Halaman berstatus {pageStatus}.</p>
          <p className="text-fg-muted mt-1 text-xs">Mulai revisi sebelum mengubah Artikel & Berita agar versi publik aktif tetap aman.</p>
          {canUpdate && pageStatus === 'published' ? (
            <button
              type="button"
              disabled={pending}
              onClick={startRevision}
              className="border-primary text-primary mt-3 inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold disabled:opacity-50"
            >
              {pending ? 'Menyiapkan…' : 'Mulai Revisi'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="border-border bg-surface rounded-xl border p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-fg text-sm font-medium">Eyebrow</span>
            <input value={eyebrow} disabled={!editable} onChange={(e) => setEyebrow(e.target.value)} className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
          </label>
          <label className="block">
            <span className="text-fg text-sm font-medium">Judul Section</span>
            <input value={title} disabled={!editable} onChange={(e) => setTitle(e.target.value)} className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-fg text-sm font-medium">Deskripsi</span>
            <textarea value={description} disabled={!editable} onChange={(e) => setDescription(e.target.value)} className="border-border bg-background text-fg mt-1.5 min-h-24 w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-55" />
          </label>
          <label className="block">
            <span className="text-fg text-sm font-medium">Label CTA</span>
            <input value={ctaLabel} disabled={!editable} onChange={(e) => setCtaLabel(e.target.value)} className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
          </label>
          <label className="block">
            <span className="text-fg text-sm font-medium">Tautan CTA</span>
            <input value={ctaHref} disabled={!editable} onChange={(e) => setCtaHref(e.target.value)} placeholder="/artikel" className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!editable} onClick={() => addItem('article')} className="border-border bg-surface text-fg inline-flex h-10 items-center rounded-lg border px-4 text-sm font-semibold disabled:opacity-45">+ Artikel</button>
        <button type="button" disabled={!editable} onClick={() => addItem('news')} className="border-border bg-surface text-fg inline-flex h-10 items-center rounded-lg border px-4 text-sm font-semibold disabled:opacity-45">+ Berita</button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <article key={`portal-post-${index}`} className="border-border bg-surface rounded-xl border p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-fg text-sm font-semibold">{item.title || `${item.type === 'news' ? 'Berita' : 'Artikel'} ${index + 1}`}</p>
                <p className="text-fg-muted mt-1 text-xs">Urutan tampil #{index + 1}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!editable || index === 0} onClick={() => moveItem(index, -1)} className="border-border rounded-lg border px-3 py-1.5 text-xs disabled:opacity-35">Naik</button>
                <button type="button" disabled={!editable || index === items.length - 1} onClick={() => moveItem(index, 1)} className="border-border rounded-lg border px-3 py-1.5 text-xs disabled:opacity-35">Turun</button>
                <button type="button" disabled={!editable} onClick={() => removeItem(index)} className="border-danger/30 text-danger rounded-lg border px-3 py-1.5 text-xs disabled:opacity-35">Hapus</button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-fg text-sm font-medium">Jenis</span>
                <select value={item.type} disabled={!editable} onChange={(e) => updateItem(index, { type: e.target.value === 'news' ? 'news' : 'article' })} className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55">
                  <option value="article">Artikel</option>
                  <option value="news">Berita</option>
                </select>
              </label>
              <label className="block">
                <span className="text-fg text-sm font-medium">Tanggal</span>
                <input type="date" value={item.date} disabled={!editable} onChange={(e) => updateItem(index, { date: e.target.value })} className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-fg text-sm font-medium">Judul</span>
                <input value={item.title} disabled={!editable} onChange={(e) => updateItem(index, { title: e.target.value })} className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-fg text-sm font-medium">Ringkasan</span>
                <textarea value={item.description} disabled={!editable} onChange={(e) => updateItem(index, { description: e.target.value })} className="border-border bg-background text-fg mt-1.5 min-h-20 w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-55" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-fg text-sm font-medium">Tautan Detail</span>
                <input value={item.href} disabled={!editable} onChange={(e) => updateItem(index, { href: e.target.value })} placeholder="/artikel/judul-artikel" className="border-border bg-background text-fg mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
              </label>
              <div className="md:col-span-2">
                <span className="text-fg text-sm font-medium">Gambar</span>
                <div className="mt-1.5 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input value={item.image_url} disabled={!editable} onChange={(e) => updateItem(index, { image_url: e.target.value })} placeholder="https://..." className="border-border bg-background text-fg h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-55" />
                  <label className="border-border bg-muted/20 text-fg flex h-10 cursor-pointer items-center rounded-lg border px-4 text-sm font-semibold">
                    {uploadingIndex === index ? 'Mengunggah…' : 'Unggah Gambar'}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={!editable || uploadingIndex === index} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(index, file); event.currentTarget.value = '' }} />
                  </label>
                </div>
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="border-border mt-3 h-36 w-full rounded-lg border object-cover" />
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {items.length === 0 ? (
          <div className="border-border bg-surface text-fg-muted rounded-xl border p-8 text-center text-sm">Belum ada Artikel atau Berita.</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-fg-muted text-xs">Yang tampil publik hanyalah versi section yang sudah diterbitkan.</p>
        <button type="button" disabled={!editable || pending} onClick={save} className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-lg px-5 text-sm font-semibold disabled:opacity-45">{pending ? 'Menyimpan…' : 'Simpan Artikel & Berita'}</button>
      </div>
      {message ? <p className="text-fg-muted text-sm">{message}</p> : null}
    </div>
  )
}
