'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  approvePortalPage,
  archivePortalPage,
  createPortalSection,
  publishPortalPage,
  returnPortalPageToDraft,
  savePortalSection,
  setPortalSectionVisibility,
  submitPortalPageForReview,
} from '@/server/portal/admin-actions'

const SECTION_KINDS = [
  'hero_3d',
  'intro',
  'vision_mission',
  'business_overview',
  'growth_story',
  'ecosystem',
  'investment_info',
  'milestones',
  'strategic_direction',
  'financial_highlights',
  'investor_updates',
  'documents',
  'contact_cta',
  'legal_notice',
  'rich_content',
  'stat_grid',
  'logo_wall',
  'faq',
] as const

type Section = {
  id: string
  section_kind: string
  position: number
  is_visible: boolean
  anchor_id: string | null
  status: string
  current_version: {
    id: string
    version_number: number
    status: string
    content: unknown
    change_note: string | null
    created_at: string
  } | null
}

type PageStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived'

export function PortalPageEditor({
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
  const [selectedKind, setSelectedKind] = useState<(typeof SECTION_KINDS)[number]>('intro')
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null)
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sections.map((s) => [
        s.id,
        JSON.stringify(
          s.current_version?.content ?? { kind: s.section_kind, title: '', description: '' },
          null,
          2,
        ),
      ]),
    ),
  )
  const [error, setError] = useState<string | null>(null)

  function runTransition(action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error?.message ?? 'Perubahan status gagal.')
        return
      }
      router.refresh()
    })
  }

  function addSection() {
    setError(null)
    startTransition(async () => {
      const result = await createPortalSection({ pageId, sectionKind: selectedKind })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  function save(section: Section) {
    setError(null)
    startTransition(async () => {
      let content: unknown
      try {
        content = JSON.parse(drafts[section.id] ?? '')
      } catch {
        setError('JSON tidak valid. Periksa koma, kutip, dan kurung.')
        return
      }
      const result = await savePortalSection({ sectionId: section.id, content: content as never })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  function toggle(section: Section) {
    startTransition(async () => {
      const result = await setPortalSectionVisibility({
        sectionId: section.id,
        isVisible: !section.is_visible,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  const status = pageStatus as PageStatus

  return (
    <div className="space-y-5">
      {error ? (
        <div className="border-danger/30 bg-danger/5 text-danger rounded-lg border p-3 text-sm">
          {error}
        </div>
      ) : null}

      {canPublish ? (
        <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 rounded-xl border p-4">
          <div className="mr-auto min-w-[180px]">
            <p className="text-fg text-sm font-semibold">Lifecycle publikasi</p>
            <p className="text-fg-muted text-xs">Status: {status}</p>
          </div>
          {status === 'draft' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition(() => submitPortalPageForReview({ pageId }))}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Kirim Review
            </button>
          ) : null}
          {status === 'review' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition(() => approvePortalPage({ pageId }))}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Setujui
            </button>
          ) : null}
          {status === 'approved' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition(() => publishPortalPage({ pageId }))}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Terbitkan
            </button>
          ) : null}
          {status === 'published' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition(() => archivePortalPage({ pageId }))}
              className="border-border text-fg rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Arsipkan
            </button>
          ) : null}
          {status === 'review' || status === 'approved' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition(() => returnPortalPageToDraft({ pageId }))}
              className="border-border text-fg rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Kembalikan ke Draft
            </button>
          ) : null}
        </div>
      ) : null}

      {canUpdate ? (
        <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end">
          <label className="text-fg flex-1 text-sm font-medium">
            Tambah section
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as typeof selectedKind)}
              className="border-border bg-background text-fg mt-1 block h-10 w-full rounded-lg border px-3 text-sm font-normal"
            >
              {SECTION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={addSection}
            className="bg-primary text-primary-foreground h-10 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Tambah Section
          </button>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="border-border text-fg-muted rounded-xl border border-dashed p-8 text-center text-sm">
          Belum ada section. Tambahkan section pertama dari daftar di atas.
        </div>
      ) : (
        sections.map((section) => {
          const open = openId === section.id
          return (
            <article
              key={section.id}
              className="border-border bg-surface overflow-hidden rounded-xl border"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : section.id)}
                className="hover:bg-muted flex w-full items-center justify-between gap-4 p-4 text-left"
              >
                <span className="min-w-0">
                  <strong className="text-fg block text-sm">
                    {section.position + 1}. {section.section_kind}
                  </strong>
                  <span className="text-fg-subtle text-xs">
                    {section.current_version
                      ? `Draft v${section.current_version.version_number}`
                      : 'Belum ada versi'}{' '}
                    · {section.status} · {section.is_visible ? 'visible' : 'hidden'}
                  </span>
                </span>
                <span className="text-fg-muted">{open ? '−' : '+'}</span>
              </button>
              {open ? (
                <div className="border-border border-t p-4">
                  <label className="text-fg block text-sm font-medium">
                    Content JSON{' '}
                    <span className="text-fg-subtle font-normal">
                      (harus memiliki `kind: &quot;{section.section_kind}&quot;`)
                    </span>
                  </label>
                  <textarea
                    value={drafts[section.id] ?? ''}
                    onChange={(e) =>
                      setDrafts((current) => ({ ...current, [section.id]: e.target.value }))
                    }
                    disabled={!canUpdate || pending || status === 'published'}
                    spellCheck={false}
                    className="border-border bg-background text-fg mt-2 min-h-64 w-full rounded-lg border p-3 font-mono text-xs leading-5"
                  />
                  {canUpdate && status !== 'published' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => save(section)}
                        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Simpan Draft
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggle(section)}
                        className="border-border text-fg rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {section.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })
      )}
    </div>
  )
}
