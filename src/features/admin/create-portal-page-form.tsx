'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { createPortalPage } from '@/server/portal/admin-actions'

export function CreatePortalPageForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [pageKind, setPageKind] = useState<'standard' | 'home' | 'legal'>(
    'standard',
  )
  const [seoDescription, setSeoDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleTitleChange(value: string) {
    setTitle(value)

    if (!slug) {
      setSlug(generateSlug(value))
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)

    startTransition(async () => {
      try {
        const result = await createPortalPage({
          title,
          slug,
          pageKind,
          seoDescription,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        const page = result.data

        router.push(`/admin/portal/pages/${page.id}`)
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat membuat halaman.',
        )
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-surface rounded-xl border p-6"
    >
      <div className="grid gap-6">
        {error ? (
          <div className="border-danger/30 bg-danger/10 text-danger rounded-lg border px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div>
          <label
            htmlFor="title"
            className="text-body-sm text-fg font-medium"
          >
            Judul Halaman
          </label>

          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            disabled={pending}
            className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none disabled:opacity-60"
            placeholder="Contoh: Tentang Nuzultrip"
          />
        </div>

        <div>
          <label
            htmlFor="slug"
            className="text-body-sm text-fg font-medium"
          >
            Slug
          </label>

          <input
            id="slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(event) =>
              setSlug(generateSlug(event.target.value))
            }
            disabled={pending}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none disabled:opacity-60"
            placeholder="tentang-nuzultrip"
          />

          <p className="text-caption text-fg-muted mt-1">
            Digunakan sebagai URL. Hanya huruf kecil, angka, dan tanda hubung.
          </p>
        </div>

        <div>
          <label
            htmlFor="page_kind"
            className="text-body-sm text-fg font-medium"
          >
            Jenis Halaman
          </label>

          <select
            id="page_kind"
            name="page_kind"
            value={pageKind}
            disabled={pending}
            onChange={(event) =>
              setPageKind(
                event.target.value as 'standard' | 'home' | 'legal',
              )
            }
            className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none disabled:opacity-60"
          >
            <option value="standard">Halaman Standar</option>
            <option value="home">Beranda</option>
            <option value="legal">Halaman Legal</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="seo_description"
            className="text-body-sm text-fg font-medium"
          >
            SEO Description
          </label>

          <textarea
            id="seo_description"
            name="seo_description"
            rows={4}
            value={seoDescription}
            disabled={pending}
            onChange={(event) => setSeoDescription(event.target.value)}
            className="border-border bg-background text-fg focus:border-primary mt-2 w-full rounded-lg border px-3 py-3 text-sm outline-none disabled:opacity-60"
            placeholder="Deskripsi halaman untuk metadata mesin pencari."
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/portal/pages"
            className="border-border text-fg hover:bg-muted inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Membuat Halaman...' : 'Simpan Draf'}
          </button>
        </div>
      </div>
    </form>
  )
}