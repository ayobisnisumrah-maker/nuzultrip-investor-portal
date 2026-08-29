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

type SectionKind = (typeof SECTION_KINDS)[number]

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

type ContentRecord = Record<string, unknown>

const SECTION_LABELS: Record<SectionKind, string> = {
  hero_3d: 'Hero 3D',
  intro: 'Intro',
  vision_mission: 'Visi & Misi',
  business_overview: 'Business Overview',
  growth_story: 'Growth Story',
  ecosystem: 'Business Ecosystem',
  investment_info: 'Investment Information',
  milestones: 'Milestones',
  strategic_direction: 'Strategic Direction',
  financial_highlights: 'Financial Highlights',
  investor_updates: 'Investor Updates',
  documents: 'Public Documents',
  contact_cta: 'Contact & CTA',
  legal_notice: 'Legal Notice',
  rich_content: 'Rich Content',
  stat_grid: 'Stat Grid',
  logo_wall: 'Logo Wall',
  faq: 'FAQ',
}

const SECTION_DESCRIPTIONS: Record<SectionKind, string> = {
  hero_3d: 'Headline utama dan positioning Nuzultrip Investor Relations.',
  intro: 'Pengenalan singkat mengenai Nuzultrip kepada calon investor.',
  vision_mission: 'Visi, misi, dan arah besar perusahaan.',
  business_overview: 'Penjelasan model dan aktivitas bisnis Nuzultrip.',
  growth_story: 'Cerita pertumbuhan dan perkembangan bisnis.',
  ecosystem: 'Komponen bisnis dan ekosistem Nuzultrip.',
  investment_info: 'Informasi kebutuhan dan tujuan pendanaan Nuzultrip.',
  milestones: 'Pencapaian penting dan milestone perusahaan.',
  strategic_direction: 'Rencana pengembangan digital, operasional, dan ekspansi.',
  financial_highlights: 'Indikator dan informasi finansial utama.',
  investor_updates: 'Pembaruan yang relevan untuk investor.',
  documents: 'Materi dan dokumen yang tersedia secara publik.',
  contact_cta: 'Ajakan komunikasi dan inquiry investor.',
  legal_notice: 'Catatan hukum dan disclaimer.',
  rich_content: 'Konten fleksibel untuk kebutuhan khusus.',
  stat_grid: 'Kumpulan angka atau KPI utama.',
  logo_wall: 'Logo partner, client, atau pihak terkait.',
  faq: 'Pertanyaan umum calon investor.',
}

function isRecord(value: unknown): value is ContentRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function parseContent(value: string): ContentRecord | null {
  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function createDefaultContent(kind: SectionKind): ContentRecord {
  switch (kind) {
    case 'hero_3d':
      return {
        kind,
        eyebrow: '',
        title: '',
        description: '',
        primary_cta_label: '',
        primary_cta_href: '',
        secondary_cta_label: '',
        secondary_cta_href: '',
      }

    case 'intro':
      return {
        kind,
        title: '',
        description: '',
      }

    case 'vision_mission':
      return {
        kind,
        title: 'Visi & Misi',
        vision: '',
        mission: [],
      }

    case 'business_overview':
      return {
        kind,
        title: 'Business Overview',
        description: '',
        items: [],
      }

    case 'growth_story':
      return {
        kind,
        title: 'Growth Story',
        description: '',
        milestones: [],
      }

    case 'ecosystem':
      return {
        kind,
        title: 'Business Ecosystem',
        description: '',
        items: [],
      }

    case 'investment_info':
      return {
        kind,
        title: '',
        description: '',
        funding_target: '',
        funding_currency: 'IDR',
        use_of_funds: [
          {
            title: '',
            description: '',
          },
          {
            title: '',
            description: '',
          },
          {
            title: '',
            description: '',
          },
          {
            title: '',
            description: '',
          },
        ],
      }

    case 'milestones':
      return {
        kind,
        title: 'Milestones',
        items: [],
      }

    case 'strategic_direction':
      return {
        kind,
        title: '',
        description: '',
        pillars: [
          {
            title: '',
            description: '',
          },
          {
            title: '',
            description: '',
          },
          {
            title: '',
            description: '',
          },
        ],
      }

    case 'financial_highlights':
      return {
        kind,
        title: 'Financial Highlights',
        description: '',
        metrics: [],
      }

    case 'investor_updates':
      return {
        kind,
        title: 'Investor Updates',
        items: [],
      }

    case 'documents':
      return {
        kind,
        title: 'Investor Documents',
        description: '',
        items: [],
      }

    case 'contact_cta':
      return {
        kind,
        title: '',
        description: '',
        primary_cta_label: '',
        primary_cta_href: '',
      }

    case 'legal_notice':
      return {
        kind,
        title: 'Legal Notice',
        content: '',
      }

    case 'stat_grid':
      return {
        kind,
        title: 'Key Figures',
        metrics: [],
      }

    case 'logo_wall':
      return {
        kind,
        title: 'Partners & Network',
        logos: [],
      }

    case 'faq':
      return {
        kind,
        title: 'Frequently Asked Questions',
        items: [],
      }

    case 'rich_content':
      return {
        kind,
        title: '',
        content: '',
      }

    default:
      return { kind }
  }
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-fg block text-sm font-medium">{label}</span>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="border-border bg-background text-fg placeholder:text-fg-subtle mt-1.5 min-h-28 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="border-border bg-background text-fg placeholder:text-fg-subtle mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary"
        />
      )}
    </label>
  )
}

function VisualEditor({
  kind,
  value,
  onChange,
}: {
  kind: SectionKind
  value: string
  onChange: (value: string) => void
}) {
  const content = parseContent(value)

  if (!content) {
    return (
      <div className="border-danger/30 bg-danger/5 rounded-lg border p-4">
        <p className="text-danger text-sm font-medium">Content JSON tidak valid.</p>
        <p className="text-fg-muted mt-1 text-xs">
          Gunakan Advanced JSON Editor di bawah untuk memperbaiki struktur konten.
        </p>
      </div>
    )
  }

  function update(fields: Record<string, unknown>) {
    onChange(JSON.stringify({ ...content, ...fields }, null, 2))
  }

  if (kind === 'hero_3d') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
        />
        <Field
          label="Headline"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />
        <div className="md:col-span-2">
          <Field
            label="Description"
            value={asString(content.description)}
            onChange={(description) => update({ description })}
            multiline
          />
        </div>
        <Field
          label="Primary CTA"
          value={asString(content.primary_cta_label)}
          onChange={(primary_cta_label) => update({ primary_cta_label })}
        />
        <Field
          label="Primary CTA Link"
          value={asString(content.primary_cta_href)}
          onChange={(primary_cta_href) => update({ primary_cta_href })}
        />
        <Field
          label="Secondary CTA"
          value={asString(content.secondary_cta_label)}
          onChange={(secondary_cta_label) => update({ secondary_cta_label })}
        />
        <Field
          label="Secondary CTA Link"
          value={asString(content.secondary_cta_href)}
          onChange={(secondary_cta_href) => update({ secondary_cta_href })}
        />
      </div>
    )
  }

  if (
    kind === 'intro' ||
    kind === 'rich_content' ||
    kind === 'legal_notice' ||
    kind === 'contact_cta'
  ) {
    return (
      <div className="space-y-4">
        <Field
          label="Title"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />
        <Field
          label="Description / Content"
          value={asString(content.description ?? content.content)}
          onChange={(text) =>
            update({
              ...(kind === 'rich_content' || kind === 'legal_notice'
                ? { content: text }
                : { description: text }),
            })
          }
          multiline
        />
        {kind === 'contact_cta' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="CTA Label"
              value={asString(content.primary_cta_label)}
              onChange={(primary_cta_label) => update({ primary_cta_label })}
            />
            <Field
              label="CTA Link"
              value={asString(content.primary_cta_href)}
              onChange={(primary_cta_href) => update({ primary_cta_href })}
            />
          </div>
        ) : null}
      </div>
    )
  }

  if (kind === 'vision_mission') {
    const mission = Array.isArray(content.mission)
      ? content.mission.filter((item): item is string => typeof item === 'string')
      : []

    return (
      <div className="space-y-4">
        <Field
          label="Title"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />
        <Field
          label="Vision"
          value={asString(content.vision)}
          onChange={(vision) => update({ vision })}
          multiline
        />
        <Field
          label="Mission"
          value={mission.join('\n')}
          onChange={(text) =>
            update({
              mission: text
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          multiline
          placeholder="Satu misi per baris"
        />
      </div>
    )
  }

  if (kind === 'investment_info') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-fg text-sm font-semibold">Scope Pendanaan</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">
            Gunakan section ini untuk kebutuhan pendanaan Nuzultrip: digitalisasi,
            penguatan operasional, pengembangan tim, pemasaran, dan ekspansi bisnis.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Title"
            value={asString(content.title)}
            onChange={(title) => update({ title })}
          />
          <Field
            label="Funding Target"
            value={asString(content.funding_target)}
            onChange={(funding_target) => update({ funding_target })}
            placeholder="Contoh: 1.000.000.000"
          />
        </div>

        <Field
          label="Investment Description"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />
      </div>
    )
  }

  if (kind === 'strategic_direction') {
    return (
      <div className="space-y-4">
        <Field
          label="Title"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />
        <Field
          label="Description"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-fg text-sm font-semibold">Strategic Pillars</p>
          <p className="text-fg-muted mt-1 text-xs">
            Detail pillar dapat diatur melalui Advanced JSON Editor.
          </p>
        </div>
      </div>
    )
  }

  if (kind === 'business_overview' || kind === 'ecosystem' || kind === 'growth_story') {
    return (
      <div className="space-y-4">
        <Field
          label="Title"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />
        <Field
          label="Description"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-fg text-sm font-semibold">Items / Timeline</p>
          <p className="text-fg-muted mt-1 text-xs">
            Data berulang dapat dikelola melalui Advanced JSON Editor.
          </p>
        </div>
      </div>
    )
  }

  if (
    kind === 'financial_highlights' ||
    kind === 'stat_grid' ||
    kind === 'milestones' ||
    kind === 'investor_updates' ||
    kind === 'documents' ||
    kind === 'logo_wall' ||
    kind === 'faq'
  ) {
    return (
      <div className="space-y-4">
        <Field
          label="Title"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />
        <Field
          label="Description"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-fg text-sm font-semibold">Structured Content</p>
          <p className="text-fg-muted mt-1 text-xs">
            Metrics, cards, FAQ, documents, logo, dan item berulang tetap tersedia melalui
            Advanced JSON Editor agar tidak membatasi struktur CMS.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Field
      label="Title"
      value={asString(content.title)}
      onChange={(title) => update({ title })}
    />
  )
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'review':
      return 'Review'
    case 'approved':
      return 'Approved'
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
    default:
      return status
  }
}

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
  const [selectedKind, setSelectedKind] = useState<SectionKind>('intro')
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null)
  const [advanced, setAdvanced] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sections.map((section) => [
        section.id,
        JSON.stringify(
          section.current_version?.content ??
            createDefaultContent(section.section_kind as SectionKind),
          null,
          2,
        ),
      ]),
    ),
  )
  const [error, setError] = useState<string | null>(null)

  const status = pageStatus as PageStatus

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
      const result = await createPortalSection({
        pageId,
        sectionKind: selectedKind,
      })

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

      const result = await savePortalSection({
        sectionId: section.id,
        content: content as never,
      })

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

  function resetToTemplate(section: Section) {
    const kind = section.section_kind as SectionKind

    if (!SECTION_KINDS.includes(kind)) {
      setError(`Section "${section.section_kind}" tidak memiliki template visual.`)
      return
    }

    setDrafts((current) => ({
      ...current,
      [section.id]: JSON.stringify(createDefaultContent(kind), null, 2),
    }))
  }

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
            <p className="text-fg-muted text-xs">
              Status: <strong>{statusLabel(status)}</strong>
            </p>
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
        <div className="border-border bg-surface rounded-xl border p-4">
          <div className="mb-4">
            <p className="text-fg text-sm font-semibold">Section Builder</p>
            <p className="text-fg-muted mt-1 text-xs">
              Tambahkan section visual untuk membangun halaman Investor Relations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-fg flex-1 text-sm font-medium">
              Jenis Section
              <select
                value={selectedKind}
                onChange={(event) =>
                  setSelectedKind(event.target.value as SectionKind)
                }
                className="border-border bg-background text-fg mt-1 block h-10 w-full rounded-lg border px-3 text-sm font-normal"
              >
                {SECTION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {SECTION_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-fg-muted hidden min-h-10 flex-1 items-center text-xs sm:flex">
              {SECTION_DESCRIPTIONS[selectedKind]}
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={addSection}
              className="bg-primary text-primary-foreground h-10 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              + Tambah Section
            </button>
          </div>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="border-border text-fg-muted rounded-xl border border-dashed p-8 text-center text-sm">
          Belum ada section. Tambahkan section pertama dari Section Builder.
        </div>
      ) : (
        sections.map((section) => {
          const open = openId === section.id
          const kind = section.section_kind as SectionKind
          const hasVisualEditor = SECTION_KINDS.includes(kind)
          const isAdvanced = advanced[section.id] ?? false

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
                    {section.position + 1}. {SECTION_LABELS[kind] ?? section.section_kind}
                  </strong>

                  <span className="text-fg-subtle mt-1 block text-xs">
                    {section.current_version
                      ? `Draft v${section.current_version.version_number}`
                      : 'Belum ada versi'}{' '}
                    · {statusLabel(section.status)} ·{' '}
                    {section.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </span>

                <span className="text-fg-muted text-lg">{open ? '−' : '+'}</span>
              </button>

              {open ? (
                <div className="border-border border-t p-4">
                  <div className="mb-5 rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-fg text-sm font-semibold">
                      {SECTION_LABELS[kind] ?? section.section_kind}
                    </p>
                    <p className="text-fg-muted mt-1 text-xs leading-5">
                      {SECTION_DESCRIPTIONS[kind] ??
                        'Kelola struktur konten section portal.'}
                    </p>
                  </div>

                  {hasVisualEditor && !isAdvanced ? (
                    <VisualEditor
                      kind={kind}
                      value={drafts[section.id] ?? '{}'}
                      onChange={(value) =>
                        setDrafts((current) => ({
                          ...current,
                          [section.id]: value,
                        }))
                      }
                    />
                  ) : null}

                  <div className="border-border mt-5 overflow-hidden rounded-lg border">
                    <button
                      type="button"
                      onClick={() =>
                        setAdvanced((current) => ({
                          ...current,
                          [section.id]: !isAdvanced,
                        }))
                      }
                      className="hover:bg-muted flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span>
                        <span className="text-fg block text-sm font-semibold">
                          Advanced JSON Editor
                        </span>
                        <span className="text-fg-subtle mt-0.5 block text-xs">
                          Gunakan untuk field dan struktur konten lanjutan.
                        </span>
                      </span>
                      <span className="text-fg-muted text-sm">
                        {isAdvanced ? 'Tutup' : 'Buka'}
                      </span>
                    </button>

                    {isAdvanced ? (
                      <div className="border-border border-t p-4">
                        <textarea
                          value={drafts[section.id] ?? ''}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [section.id]: event.target.value,
                            }))
                          }
                          disabled={!canUpdate || pending || status === 'published'}
                          spellCheck={false}
                          className="border-border bg-background text-fg mt-1 min-h-80 w-full rounded-lg border p-3 font-mono text-xs leading-5 outline-none focus:border-primary"
                        />
                      </div>
                    ) : null}
                  </div>

                  {canUpdate && status !== 'published' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
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

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => resetToTemplate(section)}
                        className="border-border text-fg-muted rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        Reset Template
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
