'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { PortalPageEditor } from '@/features/admin/portal-page-editor'
import { returnPortalPageToDraft } from '@/server/portal/admin-actions'

type Section = {
  id: string
  section_kind: string
  position: number
  is_visible: boolean
  anchor_id: string | null
  status: string
  published_version_id: string | null
  current_version: {
    id: string
    version_number: number
    status: string
    content: unknown
    change_note: string | null
    created_at: string
  } | null
}

export function PortalPageEditorLive({
  pageId,
  sections,
  canUpdate,
  canPublish,
  pageStatus,
}: {
  pageId: string
  sections: Section[]
  canUpdate: boolean
  canPublish: boolean
  pageStatus: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function startRevision() {
    setError(null)

    startTransition(async () => {
      try {
        const result = await returnPortalPageToDraft({ pageId })

        if (!result.ok) {
          setError(result.error?.message ?? 'Gagal memulai revisi halaman.')
          return
        }

        router.refresh()
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : 'Gagal memulai revisi halaman.',
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      {pageStatus === 'published' && canUpdate ? (
        <div className="border-primary/25 bg-primary/5 rounded-xl border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-fg text-sm font-semibold">Halaman sedang terbit</p>
              <p className="text-fg-muted mt-1 text-xs leading-5">
                Versi publik tetap aktif. Mulai revisi untuk mengubah konten tanpa mematikan halaman yang sedang tayang.
              </p>
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={startRevision}
              className="bg-primary text-primary-foreground inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Menyiapkan revisi...' : 'Mulai Revisi'}
            </button>
          </div>

          {error ? (
            <div className="border-danger/30 bg-danger/5 text-danger mt-3 rounded-lg border p-3 text-sm">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}

      <PortalPageEditor
        pageId={pageId}
        sections={sections}
        canUpdate={canUpdate}
        canPublish={canPublish}
        pageStatus={pageStatus}
      />
    </div>
  )
}
