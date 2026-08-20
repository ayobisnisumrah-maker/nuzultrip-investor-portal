'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FilePlus2,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react'

import { createDocument } from '@/server/documents/admin-actions'
import { useAction } from '@/ui/use-action'
import { Button } from '@/ui/button'

const KIND_OPTIONS = [
  { value: 'investment_proposal', label: 'Proposal investasi' },
  { value: 'pitch_deck', label: 'Pitch deck' },
  { value: 'investor_report', label: 'Laporan investor' },
  { value: 'business_update', label: 'Pembaruan bisnis' },
  { value: 'supporting', label: 'Dokumen pendukung' },
] as const

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publik' },
  { value: 'investors', label: 'Investor' },
  { value: 'restricted', label: 'Terbatas' },
  { value: 'internal', label: 'Internal' },
] as const

const MAX_FILE_BYTES = 100 * 1024 * 1024

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="mt-1 text-xs text-danger" role="alert">
      {message}
    </p>
  )
}

type UploadedAsset = {
  id: string
  bucket: string
  path: string
  original_filename: string
  mime_type: string
  byte_size: number
}

export function DocumentCreateForm() {
  const router = useRouter()
  const action = useAction(createDocument)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [kind, setKind] =
    useState<(typeof KIND_OPTIONS)[number]['value']>('investment_proposal')
  const [summary, setSummary] = useState('')
  const [visibility, setVisibility] =
    useState<(typeof VISIBILITY_OPTIONS)[number]['value']>('investors')

  const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null)
  const [uploadPending, setUploadPending] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!action.data?.document_id) return

    router.push(`/admin/documents/${action.data.document_id}`)
    router.refresh()
  }, [action.data, router])

  function handleTitleChange(value: string) {
    setTitle(value)

    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(slugify(value))
  }

  async function handleFileChange(file: File | null) {
    if (!file) return

    setUploadError(null)

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setUploadError(
        'Format file tidak didukung. Gunakan PDF, JPG, PNG, WebP, XLSX, PPTX, atau DOCX.',
      )

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      return
    }

    if (file.size <= 0) {
      setUploadError('File kosong tidak diperbolehkan.')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setUploadError('Ukuran file maksimal 100 MB.')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      return
    }

    setUploadPending(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json()) as {
        ok?: boolean
        asset?: UploadedAsset
        error?: string
      }

      if (!response.ok || !payload.ok || !payload.asset) {
        throw new Error(
          payload.error || 'File gagal diunggah. Silakan coba lagi.',
        )
      }

      setUploadedAsset(payload.asset)
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'File gagal diunggah. Silakan coba lagi.',
      )

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setUploadPending(false)
    }
  }

  function removeUploadedFile() {
    if (action.pending || uploadPending) return

    setUploadedAsset(null)
    setUploadError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function submit() {
    if (action.pending || uploadPending) return

    action.run({
      title: title.trim(),
      slug: slug.trim(),
      kind,
      summary: summary.trim() || undefined,
      visibility,
      fileAssetId: uploadedAsset?.id,
    })
  }

  const busy = action.pending || uploadPending

  return (
    <section className="max-w-3xl rounded-xl border bg-card p-5">
      <div className="grid gap-5">
        <div>
          <label htmlFor="document-title" className="text-sm font-medium">
            Judul Dokumen
          </label>

          <input
            id="document-title"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            disabled={busy}
            autoFocus
            maxLength={200}
            placeholder="Contoh: Investor Update Q3 2026"
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
          />

          <FieldError message={action.fieldError('title')} />
        </div>

        <div>
          <label htmlFor="document-slug" className="text-sm font-medium">
            Slug
          </label>

          <input
            id="document-slug"
            value={slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            disabled={busy}
            maxLength={200}
            placeholder="investor-update-q3-2026"
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm font-mono outline-none focus:ring-2"
          />

          <p className="mt-1 text-xs text-muted-foreground">
            Hanya huruf kecil, angka, dan tanda hubung.
          </p>

          <FieldError message={action.fieldError('slug')} />
        </div>

        <div>
          <label htmlFor="document-kind" className="text-sm font-medium">
            Tipe Dokumen
          </label>

          <select
            id="document-kind"
            value={kind}
            onChange={(event) =>
              setKind(
                event.target.value as (typeof KIND_OPTIONS)[number]['value'],
              )
            }
            disabled={busy}
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <FieldError message={action.fieldError('kind')} />
        </div>

        <div>
          <label
            htmlFor="document-visibility"
            className="text-sm font-medium"
          >
            Visibilitas
          </label>

          <select
            id="document-visibility"
            value={visibility}
            onChange={(event) =>
              setVisibility(
                event.target.value as (typeof VISIBILITY_OPTIONS)[number]['value'],
              )
            }
            disabled={busy}
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <FieldError message={action.fieldError('visibility')} />
        </div>

        <div>
          <label htmlFor="document-summary" className="text-sm font-medium">
            Ringkasan
          </label>

          <textarea
            id="document-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            disabled={busy}
            maxLength={1000}
            rows={5}
            placeholder="Ringkasan singkat mengenai isi dan tujuan dokumen."
            className="mt-2 w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2"
          />

          <div className="mt-1 flex justify-between gap-4">
            <FieldError message={action.fieldError('summary')} />

            <span className="ml-auto text-xs text-muted-foreground">
              {summary.length}/1000
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <label
                htmlFor="document-file"
                className="text-sm font-medium"
              >
                File Dokumen
              </label>

              <p className="mt-1 text-xs text-muted-foreground">
                Maksimal 100 MB. PDF, JPG, PNG, WebP, XLSX, PPTX, atau DOCX.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-dashed border-border-strong p-4">
            {uploadedAsset ? (
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-sunken">
                  <FileText
                    className="size-5 text-fg-muted"
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {uploadedAsset.original_filename}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(uploadedAsset.byte_size)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={removeUploadedFile}
                  aria-label="Hapus file terpilih"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <div className="grid size-11 place-items-center rounded-full bg-sunken">
                  {uploadPending ? (
                    <Loader2
                      className="size-5 animate-spin text-fg-muted"
                      aria-hidden="true"
                    />
                  ) : (
                    <Upload
                      className="size-5 text-fg-muted"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <p className="mt-3 text-sm font-medium">
                  {uploadPending
                    ? 'Mengunggah file...'
                    : 'Pilih file dokumen'}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  File akan diunggah ke storage sebelum dokumen dibuat.
                </p>

                <label className="mt-4">
                  <span className="sr-only">Pilih file dokumen</span>

                  <input
                    ref={fileInputRef}
                    id="document-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.pptx,.docx,application/pdf,image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(event) => {
                      void handleFileChange(event.target.files?.[0] ?? null)
                    }}
                    className="sr-only"
                  />

                  <span className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover">
                    <Upload className="size-4" aria-hidden="true" />
                    Pilih File
                  </span>
                </label>
              </div>
            )}
          </div>

          {uploadError ? (
            <p className="mt-2 text-xs text-danger" role="alert">
              {uploadError}
            </p>
          ) : null}
        </div>

        {action.errorMessage ? (
          <div className="rounded-lg border p-4" role="alert">
            <p className="text-sm font-medium">
              Dokumen tidak dapat dibuat
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {action.errorMessage}
            </p>

            {action.correlationId ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Kode referensi:{' '}
                <code className="font-mono">{action.correlationId}</code>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => router.push('/admin/documents')}
          >
            Batal
          </Button>

          <Button
            type="button"
            disabled={busy || !title.trim() || !slug.trim()}
            loading={action.pending}
            onClick={submit}
          >
            <FilePlus2 aria-hidden="true" />
            Buat Dokumen
          </Button>
        </div>
      </div>
    </section>
  )
}



