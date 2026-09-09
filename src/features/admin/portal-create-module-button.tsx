'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createPortalSection } from '@/server/portal/admin-actions'

type ModuleKind = 'hero_3d' | 'contact_cta' | 'faq' | 'documents'

export function PortalCreateModuleButton({
  pageId,
  kind,
  label,
  disabled = false,
}: {
  pageId: string
  kind: ModuleKind
  label: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function create() {
    setError(null)

    startTransition(async () => {
      try {
        const result = await createPortalSection({ pageId, sectionKind: kind })

        if (!result.ok) {
          setError(result.error?.message ?? 'Bagian portal belum berhasil dibuat.')
          return
        }

        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan saat membuat bagian portal.')
      }
    })
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        onClick={create}
        disabled={disabled || pending}
        className="bg-primary text-primary-foreground inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Mengaktifkan...' : `Aktifkan ${label}`}
      </button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
