'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Upload } from 'lucide-react'

import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'

export function CompanyLogoEditor({
  initialUrl,
  initialFileName,
  canUpdate,
}: {
  initialUrl: string | null
  initialFileName: string | null
  canUpdate: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [logoUrl, setLogoUrl] = useState(initialUrl)
  const [fileName, setFileName] = useState(initialFileName)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canUpdate || uploading) return
    const file = inputRef.current?.files?.[0]
    if (!file) {
      setMessage({ tone: 'danger', text: 'Pilih file logo terlebih dahulu.' })
      return
    }

    setUploading(true)
    setMessage(null)
    try {
      const body = new FormData()
      body.set('file', file)
      const response = await fetch('/api/admin/company-profile/logo', { method: 'POST', body })
      const result = (await response.json()) as {
        error?: string
        logo?: { public_url?: string; original_filename?: string }
      }
      if (!response.ok) throw new Error(result.error || 'Logo gagal disimpan.')
      setLogoUrl(result.logo?.public_url ?? null)
      setFileName(result.logo?.original_filename ?? file.name)
      if (inputRef.current) inputRef.current.value = ''
      setMessage({
        tone: 'success',
        text: 'Logo perusahaan berhasil diperbarui untuk portal publik, login, registrasi, dasbor Admin, dan dasbor Investor.',
      })
    } catch (error) {
      setMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Logo gagal disimpan.',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-5">
      <div className="border-border bg-canvas flex min-h-36 items-center justify-center rounded-xl border p-6">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Logo perusahaan saat ini"
            width={360}
            height={120}
            className="max-h-24 w-auto max-w-full object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-body-sm text-fg font-medium">Logo default masih digunakan</p>
            <p className="text-caption text-fg-muted mt-1">
              Unggah logo resmi untuk seluruh portal, halaman autentikasi, dan dasbor.
            </p>
          </div>
        )}
      </div>

      {fileName ? (
        <p className="text-caption text-fg-muted">
          File aktif: <span className="text-fg font-medium">{fileName}</span>
        </p>
      ) : null}
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="text-body-sm text-fg mb-2 block font-medium">Ganti logo</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
            disabled={!canUpdate || uploading}
            className="border-border bg-canvas text-body-sm w-full rounded-lg border px-3 py-2.5"
          />
          <span className="text-caption text-fg-subtle mt-1.5 block">
            JPG, PNG, WebP, atau AVIF. Maksimal 5 MB.
          </span>
        </label>
        <Button type="submit" disabled={!canUpdate || uploading}>
          <Upload className="size-4" aria-hidden="true" />
          <span className="ml-2">{uploading ? 'Mengunggah…' : 'Simpan Logo'}</span>
        </Button>
      </form>
    </div>
  )
}
