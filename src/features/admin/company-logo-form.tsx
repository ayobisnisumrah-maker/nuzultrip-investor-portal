'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUp } from 'lucide-react'

const MAX_FILE_BYTES = 2 * 1024 * 1024
const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function CompanyLogoForm({
  currentLogoUrl,
  currentFilename,
  canManage,
}: {
  currentLogoUrl: string | null
  currentFilename: string | null
  canManage: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setPreviewUrl(null)
  }

  function selectFile(file: File | null) {
    setError(null)
    setSuccess(null)
    if (!file) {
      setSelectedFile(null)
      clearPreview()
      return
    }
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      setError('Gunakan logo PNG, JPG, atau WebP.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      setError('Ukuran logo harus lebih dari 0 byte dan maksimal 2 MB.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    clearPreview()
    const objectUrl = URL.createObjectURL(file)
    previewUrlRef.current = objectUrl
    setPreviewUrl(objectUrl)
    setSelectedFile(file)
  }

  function upload() {
    if (!selectedFile || pending) {
      setError('Pilih file logo terlebih dahulu.')
      return
    }
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const body = new FormData()
        body.set('file', selectedFile)
        const response = await fetch('/api/admin/company-profile/logo', { method: 'POST', body })
        const result = (await response.json()) as { ok?: boolean; error?: string }
        if (!response.ok || !result.ok) {
          setError(result.error ?? 'Logo gagal disimpan.')
          return
        }
        setSuccess('Logo perusahaan berhasil diperbarui di portal publik.')
        setSelectedFile(null)
        clearPreview()
        if (inputRef.current) inputRef.current.value = ''
        router.refresh()
      } catch {
        setError('Logo gagal disimpan. Periksa koneksi lalu coba lagi.')
      }
    })
  }

  const displayedLogo = previewUrl ?? currentLogoUrl ?? '/brand/nuzultrip-logo-portal.svg'

  return (
    <section className="border-border bg-surface rounded-xl border p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
        <div>
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Identitas Merek
          </p>
          <h2 className="font-display text-heading-md text-fg mt-1">Logo Portal Publik</h2>
          <p className="text-body-sm text-fg-muted mt-2 max-w-xl">
            Logo ini otomatis digunakan di header dan footer seluruh halaman portal publik. Gunakan
            PNG atau WebP transparan agar hasilnya paling rapi.
          </p>

          {canManage ? (
            <div className="mt-6 space-y-4">
              <label htmlFor="company-logo" className="block">
                <span className="text-body-sm text-fg font-medium">Pilih logo baru</span>
                <span className="text-caption text-fg-muted mt-1 block">
                  PNG, JPG, atau WebP. Maksimal 2 MB.
                </span>
                <input
                  ref={inputRef}
                  id="company-logo"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  disabled={pending}
                  onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                  className="border-border bg-background text-fg mt-3 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-50"
                />
              </label>
              <button
                type="button"
                onClick={upload}
                disabled={!selectedFile || pending}
                className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImageUp className="size-4" aria-hidden="true" />
                {pending ? 'Menyimpan...' : 'Simpan Logo'}
              </button>
            </div>
          ) : (
            <p className="border-border bg-sunken text-body-sm text-fg-muted mt-5 rounded-lg border p-4">
              Anda memerlukan izin pengelolaan tema dan unggah media untuk mengganti logo.
            </p>
          )}

          {error ? (
            <div
              role="alert"
              className="border-danger/30 bg-danger/5 text-danger mt-4 rounded-lg border p-3 text-sm"
            >
              {error}
            </div>
          ) : null}
          {success ? (
            <div
              role="status"
              className="border-primary/25 bg-primary/5 text-fg mt-4 rounded-lg border p-3 text-sm"
            >
              {success}
            </div>
          ) : null}
        </div>

        <div className="border-border bg-canvas flex min-h-48 flex-col items-center justify-center rounded-xl border p-6">
          <span className="text-caption text-fg-muted mb-4">Pratinjau logo</span>
          <Image
            src={displayedLogo}
            alt="Logo Nuzultrip"
            width={324}
            height={100}
            unoptimized={Boolean(previewUrl)}
            className="max-h-24 w-auto max-w-full object-contain"
          />
          <span className="text-caption text-fg-subtle mt-4 max-w-full truncate">
            {selectedFile?.name ?? currentFilename ?? 'Logo bawaan Nuzultrip'}
          </span>
        </div>
      </div>
    </section>
  )
}
