'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  approvePortalPage,
  archivePortalPage,
  createPortalSection,
  deletePortalPage,
  deletePortalSection,
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

type PageStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived'

type ContentRecord = Record<string, unknown>

const SECTION_LABELS: Record<SectionKind, string> = {
  hero_3d: 'Hero 3D',
  intro: 'Pengenalan',
  vision_mission: 'Visi & Misi',
  business_overview: 'Tentang Nuzultrip',
  growth_story: 'Perjalanan Pengembangan',
  ecosystem: 'Ekosistem Bisnis',
  investment_info: 'Kebutuhan Modal',
  milestones: 'Perkembangan & Pencapaian',
  strategic_direction: 'Fokus Pengembangan',
  financial_highlights: 'Sorotan Keuangan',
  investor_updates: 'Pembaruan Perusahaan',
  documents: 'Dokumen Publik',
  contact_cta: 'Kontak & Ajakan',
  legal_notice: 'Pemberitahuan Hukum',
  rich_content: 'Konten Fleksibel',
  stat_grid: 'Statistik Utama',
  logo_wall: 'Logo & Jaringan',
  faq: 'Pertanyaan Umum',
}

const SECTION_DESCRIPTIONS: Record<SectionKind, string> = {
  hero_3d: 'Judul utama dan positioning Nuzultrip Equity Relations.',
  intro: 'Pengenalan singkat mengenai Nuzultrip, fondasi bisnis, dan arah pengembangannya.',
  vision_mission: 'Visi, misi, dan arah besar perusahaan.',
  business_overview:
    'Penjelasan mengenai bisnis Nuzultrip, sistem yang telah dibangun, dan fondasi operasional yang sudah berjalan.',
  growth_story:
    'Perjalanan pembangunan, pengembangan sistem, dan perkembangan Nuzultrip dari waktu ke waktu.',
  ecosystem: 'Komponen bisnis dan ekosistem Nuzultrip.',
  investment_info:
    'Penjelasan kebutuhan modal dan fokus penggunaan modal untuk pengembangan digital serta penguatan operasional.',
  milestones: 'Perkembangan penting, pencapaian, dan tahapan yang telah dicapai Nuzultrip.',
  strategic_direction:
    'Prioritas pengembangan kapabilitas digital dan penguatan kapasitas operasional Nuzultrip.',
  financial_highlights:
    'Indikator dan informasi keuangan utama yang telah disetujui untuk dipublikasikan.',
  investor_updates:
    'Pembaruan perusahaan dan perkembangan penting yang relevan bagi pemangku kepentingan.',
  documents: 'Materi dan dokumen yang tersedia secara publik.',
  contact_cta: 'Kanal komunikasi untuk pertanyaan dan kebutuhan informasi lebih lanjut.',
  legal_notice: 'Catatan hukum dan penafian.',
  rich_content: 'Konten fleksibel untuk kebutuhan khusus.',
  stat_grid: 'Kumpulan angka atau KPI utama.',
  logo_wall: 'Logo mitra, klien, atau pihak terkait.',
  faq: 'Pertanyaan umum mengenai Nuzultrip, pengembangan perusahaan, dan kebutuhan modal.',
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
        eyebrow: '',
        title: '',
        description: '',
      }

    case 'vision_mission':
      return {
        kind,
        eyebrow: '',
        title: '',
        vision_label: 'Visi',
        vision: '',
        mission_label: 'Misi',
        mission: [],
      }

    case 'business_overview':
      return {
        kind,
        eyebrow: 'Business Overview',
        title: '',
        description: '',
        items: [],
      }

    case 'growth_story':
      return {
        kind,
        eyebrow: 'Growth Story',
        title: '',
        description: '',
        milestones: [],
      }

    case 'ecosystem':
      return {
        kind,
        eyebrow: 'Business Ecosystem',
        title: '',
        description: '',
        items: [],
      }

    case 'investment_info':
      return {
        kind,
        eyebrow: 'Kebutuhan Modal',
        title: '',
        description: '',
        funding_label: 'Kebutuhan Modal',
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
        eyebrow: 'Perkembangan Nuzultrip',
        title: '',
        items: [],
      }

    case 'strategic_direction':
      return {
        kind,
        eyebrow: 'Prioritas Pengembangan',
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
        eyebrow: 'Financial Highlights',
        title: '',
        description: '',
        metrics: [],
      }

    case 'investor_updates':
      return {
        kind,
        eyebrow: 'Investor Updates',
        title: '',
        description: '',
        items: [],
      }

    case 'documents':
      return {
        kind,
        eyebrow: 'Investor Documents',
        title: '',
        description: '',
        items: [],
      }

    case 'contact_cta':
      return {
        kind,
        eyebrow: 'Investor Relations',
        title: '',
        description: '',
        primary_cta_label: '',
        primary_cta_href: '',
      }

    case 'legal_notice':
      return {
        kind,
        eyebrow: 'Legal',
        title: '',
        content: '',
      }

    case 'stat_grid':
      return {
        kind,
        eyebrow: 'Key Metrics',
        title: '',
        description: '',
        metrics: [],
      }

    case 'logo_wall':
      return {
        kind,
        eyebrow: 'Partners & Network',
        title: '',
        logos: [],
      }

    case 'faq':
      return {
        kind,
        eyebrow: 'FAQ',
        title: '',
        items: [],
      }

    case 'rich_content':
      return {
        kind,
        eyebrow: '',
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
          className="border-border bg-background text-fg placeholder:text-fg-subtle focus:border-primary mt-1.5 min-h-28 w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="border-border bg-background text-fg placeholder:text-fg-subtle focus:border-primary mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none"
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
  const parsedContent = parseContent(value)

  if (!parsedContent) {
    return (
      <div className="border-danger/30 bg-danger/5 rounded-lg border p-4">
        <p className="text-danger text-sm font-medium">Konten JSON tidak valid.</p>
        <p className="text-fg-muted mt-1 text-xs">
          Gunakan Editor JSON Lanjutan di bawah untuk memperbaiki struktur konten.
        </p>
      </div>
    )
  }

  const content = parsedContent

  function update(fields: Record<string, unknown>) {
    onChange(JSON.stringify({ ...content, ...fields }, null, 2))
  }

  function updateArray(key: string, index: number, fields: Record<string, unknown>) {
    const items = Array.isArray(content[key]) ? [...content[key]] : []

    const current = isRecord(items[index]) ? items[index] : {}

    items[index] = {
      ...current,
      ...fields,
    }

    update({ [key]: items })
  }

  function addArrayItem(key: string, item: Record<string, unknown>) {
    const items = Array.isArray(content[key]) ? [...content[key]] : []

    update({
      [key]: [...items, item],
    })
  }

  function removeArrayItem(key: string, index: number) {
    const items = Array.isArray(content[key]) ? [...content[key]] : []

    items.splice(index, 1)

    update({
      [key]: items,
    })
  }

  function moveArrayItem(key: string, index: number, direction: -1 | 1) {
    const items = Array.isArray(content[key]) ? [...content[key]] : []
    const target = index + direction

    if (target < 0 || target >= items.length) return

    const current = items[index]
    items[index] = items[target]
    items[target] = current

    update({
      [key]: items,
    })
  }

  function ArrayActions({
    arrayKey,
    index,
    length,
  }: {
    arrayKey: string
    index: number
    length: number
  }) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => moveArrayItem(arrayKey, index, -1)}
          className="border-border text-fg-muted rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          Naik
        </button>

        <button
          type="button"
          disabled={index === length - 1}
          onClick={() => moveArrayItem(arrayKey, index, 1)}
          className="border-border text-fg-muted rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          Turun
        </button>

        <button
          type="button"
          onClick={() => removeArrayItem(arrayKey, index)}
          className="border-danger text-danger hover:bg-danger/5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
        >
          Hapus
        </button>
      </div>
    )
  }

  function renderArrayHeader(title: string, description: string, arrayKey: string) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-fg text-sm font-semibold">{title}</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => addArrayItem(arrayKey, {})}
          className="bg-primary text-primary-foreground inline-flex shrink-0 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold"
        >
          + Tambah
        </button>
      </div>
    )
  }

  function renderObjectArrayEditor(
    arrayKey: string,
    items: ContentRecord[],
    fields: Array<{
      key: string
      label: string
      multiline?: boolean
      placeholder?: string
    }>,
  ) {
    return (
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="border-border text-fg-muted rounded-lg border border-dashed p-5 text-center text-sm">
            Belum ada data. Gunakan tombol Tambah.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${arrayKey}-${index}`}
              className="border-border bg-muted/20 rounded-xl border p-4"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-fg text-sm font-semibold">Item {index + 1}</p>

                <ArrayActions arrayKey={arrayKey} index={index} length={items.length} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className={field.multiline ? 'md:col-span-2' : ''}>
                    <Field
                      label={field.label}
                      value={asString(item[field.key])}
                      onChange={(fieldValue) =>
                        updateArray(arrayKey, index, {
                          [field.key]: fieldValue,
                        })
                      }
                      multiline={field.multiline}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  if (kind === 'hero_3d') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Label Kecil"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
        />

        <Field
          label="Judul Utama"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <div className="md:col-span-2">
          <Field
            label="Deskripsi"
            value={asString(content.description)}
            onChange={(description) => update({ description })}
            multiline
          />
        </div>

        <Field
          label="CTA Utama"
          value={asString(content.primary_cta_label)}
          onChange={(primary_cta_label) => update({ primary_cta_label })}
        />

        <Field
          label="Tautan CTA Utama"
          value={asString(content.primary_cta_href)}
          onChange={(primary_cta_href) => update({ primary_cta_href })}
        />

        <Field
          label="CTA Sekunder"
          value={asString(content.secondary_cta_label)}
          onChange={(secondary_cta_label) => update({ secondary_cta_label })}
        />

        <Field
          label="Tautan CTA Sekunder"
          value={asString(content.secondary_cta_href)}
          onChange={(secondary_cta_href) => update({ secondary_cta_href })}
        />
      </div>
    )
  }

  if (kind === 'intro') {
    return (
      <div className="space-y-4">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Tentang Nuzultrip"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Deskripsi"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />
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
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Visi & Misi"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Label Visi"
          value={asString(content.vision_label, 'Visi')}
          onChange={(vision_label) => update({ vision_label })}
        />

        <Field
          label="Visi"
          value={asString(content.vision)}
          onChange={(vision) => update({ vision })}
          multiline
        />

        <Field
          label="Label Misi"
          value={asString(content.mission_label, 'Misi')}
          onChange={(mission_label) => update({ mission_label })}
        />

        <Field
          label="Misi"
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
    const useOfFunds = Array.isArray(content.use_of_funds)
      ? content.use_of_funds.filter(isRecord)
      : []

    return (
      <div className="space-y-5">
        <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
          <p className="text-fg text-sm font-semibold">Ruang Lingkup Pendanaan</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">
            Kelola kebutuhan modal dan fokus penggunaannya yang ditampilkan pada portal publik.
          </p>
        </div>

        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Kebutuhan Modal"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Judul"
            value={asString(content.title)}
            onChange={(title) => update({ title })}
          />

          <Field
            label="Label Kebutuhan Modal"
            value={asString(content.funding_label, 'Kebutuhan Modal')}
            onChange={(funding_label) => update({ funding_label })}
          />

          <Field
            label="Nilai Kebutuhan Modal"
            value={asString(content.funding_target)}
            onChange={(funding_target) => update({ funding_target })}
            placeholder="Contoh: 1.000.000.000"
          />

          <Field
            label="Mata Uang"
            value={asString(content.funding_currency, 'IDR')}
            onChange={(funding_currency) => update({ funding_currency })}
            placeholder="IDR"
          />
        </div>

        <Field
          label="Deskripsi Kebutuhan Modal"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Fokus Penggunaan Modal',
            'Tambahkan prioritas penggunaan modal yang akan ditampilkan pada portal publik.',
            'use_of_funds',
          )}

          {renderObjectArrayEditor('use_of_funds', useOfFunds, [
            {
              key: 'title',
              label: 'Judul',
            },
            {
              key: 'description',
              label: 'Deskripsi',
              multiline: true,
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'strategic_direction') {
    const pillars = Array.isArray(content.pillars) ? content.pillars.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Strategic Direction"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Deskripsi"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Pilar Strategis',
            'Kelola pilar strategis yang ditampilkan di Portal.',
            'pillars',
          )}

          {renderObjectArrayEditor('pillars', pillars, [
            {
              key: 'title',
              label: 'Judul Pilar',
            },
            {
              key: 'description',
              label: 'Deskripsi',
              multiline: true,
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'business_overview' || kind === 'ecosystem' || kind === 'investor_updates') {
    const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Business Overview"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(value) => update({ title: value })}
        />

        <Field
          label="Deskripsi"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'title',
            'Tambahkan dan kelola item yang ditampilkan kepada pengunjung Portal.',
            'items',
          )}

          {renderObjectArrayEditor('items', items, [
            {
              key: 'title',
              label: 'Judul',
            },
            {
              key: 'description',
              label: 'Deskripsi',
              multiline: true,
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'growth_story') {
    const milestones = Array.isArray(content.milestones) ? content.milestones.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Growth Story"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Deskripsi"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Linimasa Pertumbuhan',
            'Kelola perjalanan pertumbuhan perusahaan berdasarkan periode.',
            'milestones',
          )}

          {renderObjectArrayEditor('milestones', milestones, [
            {
              key: 'year',
              label: 'Tahun / Periode',
              placeholder: 'Contoh: 2026',
            },
            {
              key: 'title',
              label: 'Judul',
            },
            {
              key: 'description',
              label: 'Deskripsi',
              multiline: true,
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'milestones') {
    const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Milestones"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Tonggak Pencapaian',
            'Kelola pencapaian penting perusahaan.',
            'items',
          )}

          {renderObjectArrayEditor('items', items, [
            {
              key: 'year',
              label: 'Tahun / Periode',
            },
            {
              key: 'title',
              label: 'Judul Pencapaian',
            },
            {
              key: 'description',
              label: 'Deskripsi',
              multiline: true,
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'financial_highlights' || kind === 'stat_grid') {
    const metrics = Array.isArray(content.metrics) ? content.metrics.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Financial Highlights"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Deskripsi"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Metrik',
            'Kelola angka, KPI, atau indikator utama yang ditampilkan di Portal.',
            'metrics',
          )}

          {renderObjectArrayEditor('metrics', metrics, [
            {
              key: 'label',
              label: 'Label',
            },
            {
              key: 'value',
              label: 'Nilai',
            },
            {
              key: 'description',
              label: 'Keterangan',
              multiline: true,
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'documents') {
    const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Investor Documents"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Deskripsi"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Dokumen Publik',
            'Kelola dokumen yang dapat dilihat oleh pengunjung Portal.',
            'items',
          )}

          {renderObjectArrayEditor('items', items, [
            {
              key: 'title',
              label: 'Nama Dokumen',
            },
            {
              key: 'description',
              label: 'Deskripsi',
              multiline: true,
            },
            {
              key: 'href',
              label: 'Tautan Dokumen',
              placeholder: 'https://...',
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'logo_wall') {
    const logos = Array.isArray(content.logos) ? content.logos.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Partners & Network"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Logo & Jaringan',
            'Kelola logo mitra, klien, atau pihak terkait.',
            'logos',
          )}

          {renderObjectArrayEditor('logos', logos, [
            {
              key: 'name',
              label: 'Nama',
            },
            {
              key: 'image_url',
              label: 'URL Gambar Logo',
              placeholder: 'https://...',
            },
            {
              key: 'href',
              label: 'Tautan',
              placeholder: 'https://...',
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'faq') {
    const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: FAQ"
        />

        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Pertanyaan Umum',
            'Kelola pertanyaan dan jawaban yang ditampilkan kepada pengunjung.',
            'items',
          )}

          {renderObjectArrayEditor('items', items, [
            {
              key: 'question',
              label: 'Pertanyaan',
            },
            {
              key: 'answer',
              label: 'Jawaban',
              multiline: true,
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'contact_cta') {
    return (
      <div className="space-y-4">
        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Deskripsi"
          value={asString(content.description)}
          onChange={(description) => update({ description })}
          multiline
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Label CTA"
            value={asString(content.primary_cta_label)}
            onChange={(primary_cta_label) => update({ primary_cta_label })}
          />

          <Field
            label="Tautan CTA"
            value={asString(content.primary_cta_href)}
            onChange={(primary_cta_href) => update({ primary_cta_href })}
          />
        </div>
      </div>
    )
  }

  if (kind === 'legal_notice' || kind === 'rich_content') {
    return (
      <div className="space-y-4">
        <Field
          label="Judul"
          value={asString(content.title)}
          onChange={(title) => update({ title })}
        />

        <Field
          label="Konten"
          value={asString(content.content)}
          onChange={(body) => update({ content: body })}
          multiline
        />
      </div>
    )
  }

  return (
    <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
  )
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Draf'
    case 'review':
      return 'Ditinjau'
    case 'approved':
      return 'Disetujui'
    case 'published':
      return 'Terbit'
    case 'archived':
      return 'Diarsipkan'
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
      try {
        const result = await action()

        if (!result.ok) {
          setError(result.error?.message ?? 'Perubahan status gagal.')
          return
        }

        router.refresh()
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : 'Terjadi kesalahan saat mengubah status halaman.',
        )
      }
    })
  }

  function addSection() {
    setError(null)

    startTransition(async () => {
      try {
        const result = await createPortalSection({
          pageId,
          sectionKind: selectedKind,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Gagal menambahkan section.')
      }
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

      try {
        const result = await savePortalSection({
          sectionId: section.id,
          content: content as never,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        router.refresh()
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : 'Gagal menyimpan draf section.',
        )
      }
    })
  }

  function toggle(section: Section) {
    setError(null)

    startTransition(async () => {
      try {
        const result = await setPortalSectionVisibility({
          sectionId: section.id,
          isVisible: !section.is_visible,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        router.refresh()
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : 'Gagal mengubah visibilitas section.',
        )
      }
    })
  }

  function confirmDeleteSection(section: Section) {
    const label = SECTION_LABELS[section.section_kind as SectionKind] ?? section.section_kind

    const confirmed = window.confirm(
      `Hapus bagian "${label}" secara permanen?\\n\\nTindakan ini tidak dapat dibatalkan.`,
    )

    if (!confirmed) return

    setError(null)

    startTransition(async () => {
      try {
        const result = await deletePortalSection({
          sectionId: section.id,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        if (openId === section.id) {
          setOpenId(null)
        }

        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Gagal menghapus bagian.')
      }
    })
  }

  function resetToTemplate(section: Section) {
    const kind = section.section_kind as SectionKind

    if (!SECTION_KINDS.includes(kind)) {
      setError(`Bagian "${section.section_kind}" tidak memiliki templat visual.`)
      return
    }

    setDrafts((current) => ({
      ...current,
      [section.id]: JSON.stringify(createDefaultContent(kind), null, 2),
    }))
  }

  function confirmArchive() {
    const confirmed = window.confirm(
      'Arsipkan halaman ini?\n\nHalaman yang diarsipkan tidak lagi menjadi bagian dari halaman aktif yang diterbitkan.',
    )

    if (!confirmed) return

    runTransition(() => archivePortalPage({ pageId }))
  }

  function restoreArchivedPage() {
    runTransition(() => returnPortalPageToDraft({ pageId }))
  }

  function confirmDelete() {
    const confirmed = window.confirm(
      'Hapus halaman ini secara permanen?\n\nTindakan ini tidak dapat dibatalkan.',
    )

    if (!confirmed) return

    setError(null)

    startTransition(async () => {
      try {
        const result = await deletePortalPage({ pageId })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        router.push('/admin/portal/pages')
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Gagal menghapus halaman.')
      }
    })
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
            <p className="text-fg text-sm font-semibold">Siklus Publikasi</p>

            <p className="text-fg-muted text-xs">
              Status: <strong className="text-fg">{statusLabel(status)}</strong>
            </p>
          </div>

          {status === 'draft' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition(() => submitPortalPageForReview({ pageId }))}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Memproses...' : 'Kirim untuk Ditinjau'}
            </button>
          ) : null}

          {status === 'review' ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => runTransition(() => approvePortalPage({ pageId }))}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Memproses...' : 'Setujui'}
              </button>

              <button
                type="button"
                disabled={pending}
                onClick={() => runTransition(() => returnPortalPageToDraft({ pageId }))}
                className="border-border text-fg rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kembalikan ke Draf
              </button>
            </>
          ) : null}

          {status === 'approved' ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => runTransition(() => publishPortalPage({ pageId }))}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Memproses...' : 'Terbitkan'}
              </button>

              <button
                type="button"
                disabled={pending}
                onClick={() => runTransition(() => returnPortalPageToDraft({ pageId }))}
                className="border-border text-fg rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kembalikan ke Draf
              </button>
            </>
          ) : null}

          {status === 'published' ? (
            <button
              type="button"
              disabled={pending}
              onClick={confirmArchive}
              className="border-border text-fg rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Memproses...' : 'Arsipkan'}
            </button>
          ) : null}

          {status === 'archived' ? (
            <>
              <span className="border-border bg-background text-fg-muted rounded-lg border px-4 py-2 text-sm">
                Halaman telah diarsipkan
              </span>

              {canUpdate ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={restoreArchivedPage}
                  className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? 'Memproses...' : 'Kembalikan ke Draf'}
                </button>
              ) : null}

              {canUpdate ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={confirmDelete}
                  className="border-danger text-danger hover:bg-danger/5 rounded-lg border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? 'Menghapus...' : 'Hapus Permanen'}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {canUpdate && status !== 'published' && status !== 'archived' ? (
        <div className="border-border bg-surface rounded-xl border p-4">
          <div className="mb-4">
            <p className="text-fg text-sm font-semibold">Pembangun Bagian</p>

            <p className="text-fg-muted mt-1 text-xs">
              Tambahkan section visual untuk membangun halaman Hubungan Investor.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-fg flex-1 text-sm font-medium">
              Jenis Bagian
              <select
                value={selectedKind}
                onChange={(event) => setSelectedKind(event.target.value as SectionKind)}
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
              className="bg-primary text-primary-foreground h-10 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Memproses...' : '+ Tambah Bagian'}
            </button>
          </div>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="border-border text-fg-muted rounded-xl border border-dashed p-8 text-center text-sm">
          Belum ada bagian. Tambahkan bagian pertama dari Pembangun Bagian.
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
                      ? `Draf v${section.current_version.version_number}`
                      : 'Belum ada versi'}{' '}
                    · {statusLabel(section.status)} ·{' '}
                    {section.is_visible ? 'Tampil' : 'Tersembunyi'}
                  </span>
                </span>

                <span className="text-fg-muted text-lg">{open ? '−' : '+'}</span>
              </button>

              {open ? (
                <div className="border-border border-t p-4">
                  <div className="border-border bg-muted/20 mb-5 rounded-lg border p-4">
                    <p className="text-fg text-sm font-semibold">
                      {SECTION_LABELS[kind] ?? section.section_kind}
                    </p>

                    <p className="text-fg-muted mt-1 text-xs leading-5">
                      {SECTION_DESCRIPTIONS[kind] ?? 'Kelola struktur konten section portal.'}
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
                          Editor JSON Lanjutan
                        </span>

                        <span className="text-fg-subtle mt-0.5 block text-xs">
                          Gunakan untuk field dan struktur konten lanjutan.
                        </span>
                      </span>

                      <span className="text-fg-muted text-sm">{isAdvanced ? 'Tutup' : 'Buka'}</span>
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
                          disabled={
                            !canUpdate || pending || status === 'published' || status === 'archived'
                          }
                          spellCheck={false}
                          className="border-border bg-background text-fg focus:border-primary mt-1 min-h-80 w-full rounded-lg border p-3 font-mono text-xs leading-5 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    ) : null}
                  </div>

                  {canUpdate && status !== 'published' && status !== 'archived' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => save(section)}
                        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pending ? 'Menyimpan...' : 'Simpan Draf'}
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggle(section)}
                        className="border-border text-fg rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {section.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => resetToTemplate(section)}
                        className="border-border text-fg-muted rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Atur Ulang Templat
                      </button>

                      {!section.published_version_id ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => confirmDeleteSection(section)}
                          className="border-danger text-danger hover:bg-danger/5 rounded-lg border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Hapus Bagian
                        </button>
                      ) : null}
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
