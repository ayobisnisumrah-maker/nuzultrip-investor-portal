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

const PORTAL_SECTION_ORDER: readonly SectionKind[] = [
  'hero_3d',
  'intro',
  'stat_grid',
  'investment_info',
  'business_overview',
  'ecosystem',
  'growth_story',
  'logo_wall',
  'documents',
  'contact_cta',
  'rich_content',
  'vision_mission',
  'financial_highlights',
  'faq',
  'milestones',
]

function portalSectionRank(kind: string) {
  const index = PORTAL_SECTION_ORDER.indexOf(kind as SectionKind)
  return index === -1 ? PORTAL_SECTION_ORDER.length : index
}

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
  intro: 'Tentang Kami',
  vision_mission: 'Visi & Misi',
  business_overview: 'Perjalanan Muslim',
  growth_story: 'Peta Jalan Pertumbuhan',
  ecosystem: 'Layanan Utama',
  investment_info: 'Peluang Equity',
  milestones: 'Roadmap Lama (Kompatibilitas)',
  strategic_direction: 'Strategi Pertumbuhan',
  financial_highlights: 'Sorotan Keuangan',
  investor_updates: 'Informasi Investor',
  documents: 'Informasi & Dokumen',
  contact_cta: 'Quick Action & Kontak',
  legal_notice: 'Pemberitahuan Hukum',
  rich_content: 'Artikel & Berita',
  stat_grid: 'Statistik',
  logo_wall: 'Mitra & Jaringan',
  faq: 'FAQ',
}

const SECTION_DESCRIPTIONS: Record<SectionKind, string> = {
  hero_3d: 'Judul utama dan positioning Nuzultrip Equity Relations.',
  intro: 'Pengenalan singkat mengenai Nuzultrip, fondasi bisnis, dan arah pengembangannya.',
  vision_mission: 'Visi, misi, dan arah besar perusahaan.',
  business_overview:
    'Penjelasan mengenai bisnis Nuzultrip, sistem yang telah dibangun, dan fondasi operasional yang sudah berjalan.',
  growth_story:
    'Roadmap perusahaan dalam format slider fase. Kelola periode, status, judul, poin fase, dan KPI dari sini.',
  ecosystem: 'Komponen bisnis dan ekosistem Nuzultrip.',
  investment_info:
    'Penjelasan kebutuhan modal dan fokus penggunaan modal untuk pengembangan digital serta penguatan operasional.',
  milestones: 'Format roadmap lama. Dipertahankan hanya untuk kompatibilitas konten yang pernah diterbitkan.',
  strategic_direction:
    'Prioritas pengembangan kapabilitas digital dan penguatan kapasitas operasional Nuzultrip.',
  financial_highlights:
    'Indikator dan informasi keuangan utama yang telah disetujui untuk dipublikasikan.',
  investor_updates:
    'Pembaruan perusahaan dan perkembangan penting yang relevan bagi pemangku kepentingan.',
  documents: 'Atur teks area informasi. File publik tetap bersumber dari Dokumen Portal.',
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
        image_url: '',
        image_alt: '',
        image_caption: '',
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
        eyebrow: 'Model Bisnis',
        title: '',
        description: '',
        items: [],
      }

    case 'growth_story':
      return {
        kind,
        eyebrow: 'Perkembangan Usaha',
        title: '',
        description: '',
        milestones: [],
      }

    case 'ecosystem':
      return {
        kind,
        eyebrow: 'Ekosistem Bisnis',
        title: '',
        description: '',
        items: [],
      }

    case 'investment_info':
      return {
        kind,
        eyebrow: 'Penawaran Equity',
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
        eyebrow: 'Sorotan Keuangan',
        title: '',
        description: '',
        metrics: [],
      }

    case 'investor_updates':
      return {
        kind,
        eyebrow: 'Pembaruan Investor',
        title: '',
        description: '',
        items: [],
      }

    case 'documents':
      return {
        kind,
        eyebrow: 'Dokumen Investor',
        title: '',
        description: '',
        items: [],
      }

    case 'contact_cta':
      return {
        kind,
        eyebrow: 'Hubungan Investor',
        title: '',
        description: '',
        primary_cta_label: '',
        primary_cta_href: '',
      }

    case 'legal_notice':
      return {
        kind,
        eyebrow: 'Faktor Risiko',
        title: '',
        content: '',
      }

    case 'stat_grid':
      return {
        kind,
        eyebrow: 'Metrik Utama',
        title: '',
        description: '',
        metrics: [],
      }

    case 'logo_wall':
      return {
        kind,
        eyebrow: 'Mitra & Jaringan',
        title: '',
        logos: [],
      }

    case 'faq':
      return {
        kind,
        eyebrow: 'Pertanyaan Umum',
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

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function upload(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('purpose', 'portal')
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body })
      const result = (await response.json()) as {
        error?: string
        asset?: { public_url?: string }
      }
      if (!response.ok || !result.asset?.public_url) {
        setUploadError(result.error ?? 'Gambar gagal diunggah.')
        return
      }
      onChange(result.asset.public_url)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Gambar gagal diunggah.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Field label={label} value={value} onChange={onChange} placeholder="https://..." />
      <label className="border-border bg-muted/20 text-fg-muted flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 text-xs">
        <span>{uploading ? 'Mengunggah…' : 'Unggah JPG, PNG, WebP, atau AVIF (maks. 6 MB)'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
            event.currentTarget.value = ''
          }}
        />
        <span className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 font-semibold">
          Pilih
        </span>
      </label>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Pratinjau"
          className="border-border h-28 w-full rounded-lg border object-cover"
        />
      ) : null}
      {uploadError ? <p className="text-danger text-xs">{uploadError}</p> : null}
    </div>
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
                    {field.key === 'image_url' || field.key === 'icon_url' ? (
                      <ImageField
                        label={field.label}
                        value={asString(item[field.key])}
                        onChange={(fieldValue) =>
                          updateArray(arrayKey, index, { [field.key]: fieldValue })
                        }
                      />
                    ) : (
                      <Field
                        label={field.label}
                        value={
                          field.key === 'bullets'
                            ? (Array.isArray(item[field.key]) ? item[field.key] as unknown[] : [])
                                .filter((value: unknown): value is string => typeof value === 'string')
                                .join('\n')
                            : asString(item[field.key])
                        }
                        onChange={(fieldValue) =>
                          updateArray(arrayKey, index, {
                            [field.key]:
                              field.key === 'bullets'
                                ? fieldValue
                                    .split('\n')
                                    .map((value) => value.trim())
                                    .filter(Boolean)
                                : fieldValue,
                          })
                        }
                        multiline={field.multiline}
                        placeholder={field.placeholder}
                      />
                    )}
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

        <div className="md:col-span-2">
          <ImageField
            label="Gambar Hero"
            value={asString(content.image_url)}
            onChange={(image_url) => update({ image_url })}
          />
        </div>
        <Field
          label="Teks Alternatif Gambar"
          value={asString(content.image_alt)}
          onChange={(image_alt) => update({ image_alt })}
        />
        <Field
          label="Tulisan di Atas Gambar"
          value={asString(content.image_caption)}
          onChange={(image_caption) => update({ image_caption })}
        />

        <div className="md:col-span-2 border-border space-y-4 rounded-xl border p-4">
          <p className="text-fg text-sm font-semibold">Tag Hero</p>
          <p className="text-fg-muted text-xs leading-5">Satu tag per baris. Maksimal 6 tag ditampilkan pada portal.</p>
          <Field
            label="Daftar Tag"
            value={Array.isArray(content.tags) ? content.tags.filter((value): value is string => typeof value === 'string').join('\n') : ''}
            onChange={(value) => update({ tags: value.split('\n').map((item) => item.trim()).filter(Boolean) })}
            multiline
            placeholder={"Umrah\nHalal Tour\nLand Arrangement"}
          />
        </div>
      </div>
    )
  }

  if (kind === 'intro') {
    return (
      <div className="space-y-4">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} placeholder="TENTANG KAMI" />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Label CTA" value={asString(content.cta_label)} onChange={(cta_label) => update({ cta_label })} placeholder="Lebih tentang kami" />
          <Field label="Tautan CTA" value={asString(content.cta_href)} onChange={(cta_href) => update({ cta_href })} placeholder="Kosongkan untuk menuju section Perusahaan" />
        </div>
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

  if (kind === 'stat_grid' || kind === 'financial_highlights') {
    const metrics = Array.isArray(content.metrics) ? content.metrics.filter(isRecord) : []
    return (
      <div className="space-y-5">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader('Angka Penting', 'Maksimal 5 angka utama pada area Tentang Kami. Nilai akan tetap disimpan sebagai teks agar format seperti 70JT+, +17,1%, dan 40% terjaga.', 'metrics')}
          {renderObjectArrayEditor('metrics', metrics, [
            { key: 'value', label: 'Nilai', placeholder: 'Contoh: 70JT+' },
            { key: 'label', label: 'Label' },
            { key: 'description', label: 'Keterangan', multiline: true },
          ])}
        </div>
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
          placeholder="Contoh: Penawaran Equity"
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

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Label CTA Peluang Equity" value={asString(content.cta_label)} onChange={(cta_label) => update({ cta_label })} placeholder="Lihat Detail Penawaran" />
          <Field label="Tautan CTA Peluang Equity" value={asString(content.cta_href)} onChange={(cta_href) => update({ cta_href })} placeholder="/hubungi" />
          <Field label="Headline Card Equity" value={asString(content.card_title)} onChange={(card_title) => update({ card_title })} placeholder="Investasi Hari Ini, Untuk Masa Depan..." />
          <Field label="Label CTA Card Equity" value={asString(content.card_cta_label)} onChange={(card_cta_label) => update({ card_cta_label })} placeholder="Ajukan Minat Equity" />
          <Field label="Tautan CTA Card Equity" value={asString(content.card_cta_href)} onChange={(card_cta_href) => update({ card_cta_href })} placeholder="/hubungi" />
        </div>

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader('Ringkasan Penawaran', 'Kelola angka dan ketentuan utama yang tampil pada tabel Peluang Equity.', 'terms')}
          {renderObjectArrayEditor(
            'terms',
            Array.isArray(content.terms) ? content.terms.filter(isRecord) : [],
            [
              { key: 'label', label: 'Label' },
              { key: 'value', label: 'Nilai' },
            ],
          )}
        </div>

        <div className="border-border space-y-4 rounded-xl border p-4">
          <Field label="Eyebrow Proses" value={asString(content.process_eyebrow)} onChange={(process_eyebrow) => update({ process_eyebrow })} />
          <Field label="Judul Proses" value={asString(content.process_title)} onChange={(process_title) => update({ process_title })} />
          <Field label="Deskripsi Proses" value={asString(content.process_description)} onChange={(process_description) => update({ process_description })} multiline />
          {renderArrayHeader('Tahapan Investasi', 'Kelola empat langkah pada section proses.', 'process_steps')}
          {renderObjectArrayEditor(
            'process_steps',
            Array.isArray(content.process_steps) ? content.process_steps.filter(isRecord) : [],
            [
              { key: 'title', label: 'Judul Langkah' },
              { key: 'description', label: 'Deskripsi', multiline: true },
              { key: 'duration', label: 'Durasi' },
              { key: 'output', label: 'Output' },
            ],
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Label CTA Proses" value={asString(content.process_cta_label)} onChange={(process_cta_label) => update({ process_cta_label })} />
            <Field label="Tautan CTA Proses" value={asString(content.process_cta_href)} onChange={(process_cta_href) => update({ process_cta_href })} />
          </div>
        </div>

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
          placeholder="Contoh: Arah Strategis"
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

  if (kind === 'ecosystem') {
    const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field
          label="Eyebrow"
          value={asString(content.eyebrow)}
          onChange={(eyebrow) => update({ eyebrow })}
          placeholder="Contoh: Model Bisnis"
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

        <ImageField
          label="Gambar Utama Bagian"
          value={asString(content.image_url)}
          onChange={(image_url) => update({ image_url })}
        />

        <Field
          label="Teks Alternatif Gambar"
          value={asString(content.image_alt)}
          onChange={(image_alt) => update({ image_alt })}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Label CTA" value={asString(content.cta_label)} onChange={(cta_label) => update({ cta_label })} />
          <Field label="Tautan CTA" value={asString(content.cta_href)} onChange={(cta_href) => update({ cta_href })} placeholder="/halaman atau https://..." />
        </div>

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader(
            'Daftar Item',
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
            {
              key: 'icon',
              label: 'Ikon (emoji atau simbol)',
              placeholder: 'Contoh: ✈',
            },
            {
              key: 'icon_url',
              label: 'File Ikon',
            },
            {
              key: 'image_url',
              label: 'Gambar',
            },
            {
              key: 'href',
              label: 'Tautan',
              placeholder: '/halaman atau https://...',
            },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'investor_updates') {
    const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []
    return (
      <div className="space-y-5">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} placeholder="TATA KELOLA" />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <ImageField label="Gambar Informasi" value={asString(content.image_url)} onChange={(image_url) => update({ image_url })} />
        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader('Kartu Informasi', 'Konten pendukung tata kelola/informasi investor.', 'items')}
          {renderObjectArrayEditor('items', items, [
            { key: 'title', label: 'Judul' },
            { key: 'description', label: 'Deskripsi', multiline: true },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'logo_wall') {
    const items = Array.isArray(content.items)
      ? content.items.filter(isRecord)
      : Array.isArray(content.logos)
        ? content.logos.filter(isRecord)
        : []

    return (
      <div className="space-y-5">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} placeholder="JARINGAN & MITRA" />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Label CTA" value={asString(content.cta_label)} onChange={(cta_label) => update({ cta_label })} placeholder="Pelajari Selengkapnya" />
          <Field label="Tautan CTA" value={asString(content.cta_href)} onChange={(cta_href) => update({ cta_href })} />
        </div>
        <ImageField label="Gambar Jaringan & Mitra" value={asString(content.image_url)} onChange={(image_url) => update({ image_url })} />
        <Field label="Teks Alternatif Gambar" value={asString(content.image_alt)} onChange={(image_alt) => update({ image_alt })} />
        <Field label="Headline pada Gambar" value={asString(content.image_caption)} onChange={(image_caption) => update({ image_caption })} placeholder="Satu Ekosistem, Banyak Peluang" />
        <Field label="Judul Highlight" value={asString(content.highlight_title)} onChange={(highlight_title) => update({ highlight_title })} placeholder="Satu Ekosistem, Banyak Peluang" />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader('Kartu Jaringan & Mitra', 'Tiga kartu pertama ditampilkan pada portal.', 'items')}
          {renderObjectArrayEditor('items', items, [
            { key: 'title', label: 'Nama / Judul' },
            { key: 'description', label: 'Deskripsi', multiline: true },
            { key: 'icon', label: 'Ikon (emoji atau simbol)' },
            { key: 'icon_url', label: 'File Ikon' },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'business_overview') {
    const images = Array.isArray(content.images) ? content.images.filter(isRecord) : []
    const metrics = Array.isArray(content.metrics) ? content.metrics.filter(isRecord) : []

    return (
      <div className="space-y-5">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} placeholder="PERUSAHAAN" />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Label CTA" value={asString(content.cta_label)} onChange={(cta_label) => update({ cta_label })} />
          <Field label="Tautan CTA" value={asString(content.cta_href)} onChange={(cta_href) => update({ cta_href })} />
        </div>
        <ImageField label="Gambar Utama Perusahaan" value={asString(content.image_url)} onChange={(image_url) => update({ image_url })} />
        <Field label="Teks Alternatif Gambar Utama" value={asString(content.image_alt)} onChange={(image_alt) => update({ image_alt })} />

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader('Galeri Perusahaan', 'Tambahkan hingga 5 gambar. Portal akan mengganti gambar saat interaksi hover.', 'images')}
          {renderObjectArrayEditor('images', images, [
            { key: 'image_url', label: 'Gambar' },
            { key: 'alt', label: 'Teks Alternatif' },
            { key: 'title', label: 'Judul Gambar' },
          ])}
        </div>

        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader('Metrik Perusahaan', 'Angka penting yang tampil pada galeri perusahaan.', 'metrics')}
          {renderObjectArrayEditor('metrics', metrics, [
            { key: 'value', label: 'Nilai', placeholder: 'Contoh: 4.500+' },
            { key: 'label', label: 'Label', placeholder: 'Contoh: Jamaah' },
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
          placeholder="Contoh: Perkembangan Usaha"
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
              key: 'period',
              label: 'Periode',
              placeholder: 'Contoh: Jan – Des 2026',
            },
            {
              key: 'status',
              label: 'Status',
              placeholder: 'Terlaksana / Fase Aktif / Rencana Mendatang',
            },
            {
              key: 'title',
              label: 'Judul Fase',
            },
            {
              key: 'description',
              label: 'Deskripsi',
              multiline: true,
            },
            {
              key: 'bullets',
              label: 'Poin Fase',
              placeholder: 'Satu poin per baris',
              multiline: true,
            },
            {
              key: 'metric_label',
              label: 'Label KPI',
              placeholder: 'Contoh: Target Equity',
            },
            {
              key: 'metric_value',
              label: 'Nilai KPI',
              placeholder: 'Contoh: Rp5 Miliar',
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
          placeholder="Contoh: Tonggak Pencapaian"
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


  if (kind === 'documents') {
    return (
      <div className="space-y-5">
        <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
          <p className="text-fg text-sm font-semibold">Konten Section Dokumen</p>
          <p className="text-fg-muted mt-1 text-xs leading-5">
            Judul, deskripsi, dan gambar section diatur di sini. Daftar file yang tampil di portal
            otomatis mengikuti Dokumen Portal yang berstatus Terbit dan Publik.
          </p>
        </div>
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} placeholder="INFORMASI INVESTOR" />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} placeholder="Informasi penting dalam satu tempat" />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <ImageField label="Gambar Section" value={asString(content.image_url)} onChange={(image_url) => update({ image_url })} />
        <Field label="Teks Alternatif Gambar" value={asString(content.image_alt)} onChange={(image_alt) => update({ image_alt })} />
      </div>
    )
  }
  if (kind === 'contact_cta') {
    return (
      <div className="space-y-5">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} placeholder="Contoh: QUICK ACTION" />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <Field label="Kontak / Nilai Tambahan" value={asString(content.contact_value)} onChange={(contact_value) => update({ contact_value })} placeholder="Contoh: investor@nuzultrip.com" />

        <div className="border-border space-y-4 rounded-xl border p-4">
          <p className="text-fg text-sm font-semibold">CTA Investor Relations</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Label CTA Utama" value={asString(content.primary_cta_label)} onChange={(primary_cta_label) => update({ primary_cta_label })} />
            <Field label="Tautan CTA Utama" value={asString(content.primary_cta_href)} onChange={(primary_cta_href) => update({ primary_cta_href })} />
          </div>
          <Field label="Deskripsi CTA Utama" value={asString(content.primary_cta_description)} onChange={(primary_cta_description) => update({ primary_cta_description })} multiline />
        </div>

        <div className="border-border space-y-4 rounded-xl border p-4">
          <p className="text-fg text-sm font-semibold">CTA Dokumen Resmi</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Label CTA Sekunder" value={asString(content.secondary_cta_label)} onChange={(secondary_cta_label) => update({ secondary_cta_label })} />
            <Field label="Tautan CTA Sekunder (opsional)" value={asString(content.secondary_cta_href)} onChange={(secondary_cta_href) => update({ secondary_cta_href })} placeholder="Kosongkan untuk memakai dokumen publik pertama" />
          </div>
          <Field label="Deskripsi CTA Sekunder" value={asString(content.secondary_cta_description)} onChange={(secondary_cta_description) => update({ secondary_cta_description })} multiline />
        </div>

        <div className="border-border space-y-4 rounded-xl border p-4">
          <p className="text-fg text-sm font-semibold">Gambar Quick Action</p>
          <ImageField label="Gambar" value={asString(content.image_url)} onChange={(image_url) => update({ image_url })} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Eyebrow Gambar" value={asString(content.image_eyebrow)} onChange={(image_eyebrow) => update({ image_eyebrow })} />
            <Field label="Judul Gambar" value={asString(content.image_title)} onChange={(image_title) => update({ image_title })} />
          </div>
          <Field label="Deskripsi Gambar" value={asString(content.image_description)} onChange={(image_description) => update({ image_description })} multiline />
          <Field label="Teks Alternatif Gambar" value={asString(content.image_alt)} onChange={(image_alt) => update({ image_alt })} />
        </div>
      </div>
    )
  }

  if (kind === 'rich_content') {
    const items = Array.isArray(content.items) ? content.items.filter(isRecord) : []
    return (
      <div className="space-y-5">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} placeholder="ARTIKEL & BERITA" />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Label CTA" value={asString(content.cta_label)} onChange={(cta_label) => update({ cta_label })} placeholder="Lebih Artikel Lainnya" />
          <Field label="Tautan CTA" value={asString(content.cta_href)} onChange={(cta_href) => update({ cta_href })} />
        </div>
        <div className="border-border space-y-4 rounded-xl border p-4">
          {renderArrayHeader('Artikel & Berita', 'Kelola kartu artikel yang tampil pada portal.', 'items')}
          {renderObjectArrayEditor('items', items, [
            { key: 'type', label: 'Jenis', placeholder: 'Artikel / Berita' },
            { key: 'date', label: 'Tanggal', placeholder: 'Contoh: 21 Sep 2026' },
            { key: 'title', label: 'Judul' },
            { key: 'description', label: 'Ringkasan', multiline: true },
            { key: 'image_url', label: 'Gambar' },
            { key: 'href', label: 'Tautan Artikel' },
          ])}
        </div>
      </div>
    )
  }

  if (kind === 'legal_notice') {
    return (
      <div className="space-y-4">
        <Field label="Eyebrow" value={asString(content.eyebrow)} onChange={(eyebrow) => update({ eyebrow })} />
        <Field label="Judul" value={asString(content.title)} onChange={(title) => update({ title })} />
        <Field label="Deskripsi" value={asString(content.description)} onChange={(description) => update({ description })} multiline />
        <Field label="Konten" value={asString(content.content)} onChange={(body) => update({ content: body })} multiline />
        <ImageField label="Gambar Informasi" value={asString(content.image_url)} onChange={(image_url) => update({ image_url })} />
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
  const firstPortalSection = [...sections].sort((a, b) => {
    const rank = portalSectionRank(a.section_kind) - portalSectionRank(b.section_kind)
    return rank || a.position - b.position
  })[0]
  const [openId, setOpenId] = useState<string | null>(firstPortalSection?.id ?? null)
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
  const orderedSections = [...sections].sort((a, b) => {
    const rank = portalSectionRank(a.section_kind) - portalSectionRank(b.section_kind)
    return rank || a.position - b.position
  })

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
      `Hapus bagian "${label}" secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`,
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
    const confirmed = window.confirm(
      'Kembalikan halaman ini ke Draf?\n\nVersi yang sudah diterbitkan tetap disimpan sebagai riwayat. Salinan baru akan dibuat sebagai versi Draf yang dapat diedit.',
    )

    if (!confirmed) return

    setError(null)

    startTransition(async () => {
      try {
        const result = await returnPortalPageToDraft({ pageId })

        if (!result.ok) {
          setError(result.error?.message ?? 'Gagal mengembalikan halaman ke Draf.')
          return
        }

        router.refresh()
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : 'Gagal mengembalikan halaman ke Draf.',
        )
      }
    })
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

      {canPublish || (status === 'archived' && canUpdate) ? (
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

      {canUpdate && status !== 'published' && status !== 'archived' && sections.length === 0 ? (
        <div className="border-border bg-surface rounded-xl border p-4">
          <div className="mb-4">
            <p className="text-fg text-sm font-semibold">Pembangun Bagian</p>

            <p className="text-fg-muted mt-1 text-xs">
              Tambahkan bagian visual untuk membangun halaman Hubungan Investor.
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
        orderedSections.map((section, visualIndex) => {
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
                    {visualIndex + 1}. {SECTION_LABELS[kind] ?? section.section_kind}
                  </strong>

                  <span className="text-fg-subtle mt-1 block text-xs">
                    {section.current_version
                      ? `Draf v${section.current_version.version_number}`
                      : 'Belum ada versi'}{' '}
                    · {statusLabel(section.status)} ·{' '}
                    {section.is_visible ? 'Tampil' : 'Tersembunyi'}
                  </span>
                </span>

                <span className="border-border text-fg-muted inline-flex h-8 min-w-20 items-center justify-center rounded-lg border px-2 text-xs font-semibold">
                  {open ? 'Tutup' : 'Edit'}
                </span>
              </button>

              {open ? (
                <div className="border-border border-t p-4">
                  <div className="border-border bg-muted/20 mb-5 rounded-lg border p-4">
                    <p className="text-fg text-sm font-semibold">
                      {SECTION_LABELS[kind] ?? section.section_kind}
                    </p>

                    <p className="text-fg-muted mt-1 text-xs leading-5">
                      {SECTION_DESCRIPTIONS[kind] ?? 'Kelola struktur konten bagian portal.'}
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
                        <span className="text-fg block text-sm font-semibold">Pengaturan Lanjutan</span>
                        <span className="text-fg-subtle mt-0.5 block text-xs">
                          Opsional. Gunakan hanya jika perlu mengubah struktur data lanjutan.
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
