'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Asset = {
  id: string
  original_filename: string
  mime_type: string
  byte_size: number
  visibility: string
  alt_text: string | null
  caption: string | null
  width: number | null
  height: number | null
  finalized_at: string | null
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function visibilityLabel(value: string) {
  switch (value) {
    case 'public':
      return 'Publik'
    case 'internal':
      return 'Internal'
    case 'restricted':
      return 'Terbatas'
    default:
      return value
  }
}

export function PortalMediaManager({
  assets,
  canUpload,
  timezone,
}: {
  assets: Asset[]
  canUpload: boolean
  timezone: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function upload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Pilih file yang akan diunggah.')
      return
    }

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const body = new FormData()
        body.set('file', file)

        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body,
        })

        const result = (await response.json()) as {
          ok?: boolean
          error?: string
          asset?: { original_filename?: string }
        }

        if (!response.ok || !result.ok) {
          setError(result.error ?? 'File gagal diunggah.')
          return
        }

        setSuccess(`File ${result.asset?.original_filename ?? file.name} berhasil diunggah.`)
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'File gagal diunggah.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
          Portal & Konten
        </p>
        <h1 className="font-display text-heading-lg text-fg mt-1">Media</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
          Kelola aset yang digunakan untuk konten portal. File tersimpan di Supabase Storage dan
          metadata dicatat di basis data.
        </p>
      </div>

      {canUpload ? (
        <section className="border-border bg-surface rounded-xl border p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="min-w-0 flex-1">
              <span className="text-fg block text-sm font-medium">Unggah File</span>
              <span className="text-fg-muted mt-1 block text-xs">
                PDF, JPG, PNG, WebP, XLSX, PPTX, DOCX. Maksimal 100 MB.
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.pptx,.docx"
                disabled={pending}
                className="border-border bg-background text-fg mt-3 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-50"
              />
            </label>

            <button
              type="button"
              onClick={upload}
              disabled={pending}
              className="bg-primary text-primary-foreground inline-flex h-10 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Mengunggah...' : 'Unggah'}
            </button>
          </div>

          {error ? (
            <div className="border-danger/30 bg-danger/5 text-danger mt-4 rounded-lg border p-3 text-sm">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="border-primary/25 bg-primary/5 text-fg mt-4 rounded-lg border p-3 text-sm">
              {success}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="border-border bg-surface overflow-hidden rounded-xl border">
        <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-fg text-sm font-semibold">Pustaka Media</h2>
            <p className="text-fg-muted mt-1 text-xs">{assets.length} aset terbaru</p>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="text-fg-muted p-8 text-center text-sm">
            Belum ada aset media yang tersimpan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/40 text-fg-muted text-xs">
                <tr>
                  <th className="px-5 py-3 font-medium">Nama File</th>
                  <th className="px-5 py-3 font-medium">Tipe</th>
                  <th className="px-5 py-3 font-medium">Ukuran</th>
                  <th className="px-5 py-3 font-medium">Akses</th>
                  <th className="px-5 py-3 font-medium">Dimensi</th>
                  <th className="px-5 py-3 font-medium">Dibuat</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/20">
                    <td className="text-fg max-w-[320px] px-5 py-3 font-medium">
                      <span className="block truncate" title={asset.original_filename}>
                        {asset.original_filename}
                      </span>
                    </td>
                    <td className="text-fg-muted px-5 py-3 whitespace-nowrap">{asset.mime_type}</td>
                    <td className="text-fg-muted px-5 py-3 whitespace-nowrap">
                      {formatBytes(asset.byte_size)}
                    </td>
                    <td className="text-fg-muted px-5 py-3 whitespace-nowrap">
                      {visibilityLabel(asset.visibility)}
                    </td>
                    <td className="text-fg-muted px-5 py-3 whitespace-nowrap">
                      {asset.width && asset.height ? `${asset.width} × ${asset.height}` : '—'}
                    </td>
                    <td
                      className="text-fg-muted px-5 py-3 whitespace-nowrap"
                      suppressHydrationWarning
                    >
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: timezone,
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(asset.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
