'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  initializeCompanyProfile,
  saveCompanyProfileDraft,
  transitionCompanyProfile,
} from '@/server/company-profile/admin-actions'

type BlockKey =
  | 'identity'
  | 'legal_information'
  | 'history'
  | 'vision'
  | 'mission'
  | 'leadership'
  | 'business_overview'
  | 'business_ecosystem'
  | 'strategic_direction'
  | 'milestones'
  | 'achievements'
  | 'statistics'
  | 'contact'
  | 'brand_assets'

type JsonObject = Record<string, unknown>

type Version = {
  id: string
  version_number: number
  status: string
  change_note: string | null
  published_at: string | null
} & Record<BlockKey, unknown>

type Profile = {
  id: string
  legal_name: string
  display_name: string
  status: string
  current_version: Version | null
  published_version: Version | null
}

const BLOCKS: Array<{ key: BlockKey; label: string; description: string }> = [
  { key: 'identity', label: 'Identitas', description: 'Nama brand, tagline, deskripsi singkat, dan identitas utama perusahaan.' },
  { key: 'legal_information', label: 'Legalitas', description: 'Informasi legal dan perizinan yang memang telah terverifikasi.' },
  { key: 'history', label: 'Sejarah', description: 'Riwayat pembentukan dan perkembangan perusahaan.' },
  { key: 'vision', label: 'Visi', description: 'Arah dan visi perusahaan.' },
  { key: 'mission', label: 'Misi', description: 'Misi utama perusahaan.' },
  { key: 'leadership', label: 'Pimpinan', description: 'Struktur pimpinan dan informasi manajemen.' },
  { key: 'business_overview', label: 'Ikhtisar Bisnis', description: 'Ringkasan model, layanan, dan fokus bisnis.' },
  { key: 'business_ecosystem', label: 'Ekosistem Bisnis', description: 'Komponen ekosistem dan jaringan bisnis Nuzultrip.' },
  { key: 'strategic_direction', label: 'Arah Strategis', description: 'Prioritas dan fokus pengembangan perusahaan.' },
  { key: 'milestones', label: 'Tonggak Perjalanan', description: 'Tahapan perkembangan perusahaan.' },
  { key: 'achievements', label: 'Pencapaian', description: 'Pencapaian yang sudah dapat dibuktikan.' },
  { key: 'statistics', label: 'Statistik', description: 'Statistik perusahaan yang telah diverifikasi.' },
  { key: 'contact', label: 'Kontak', description: 'Alamat, email, telepon, dan kanal kontak perusahaan.' },
  { key: 'brand_assets', label: 'Aset Brand', description: 'Referensi logo, brand assets, dan media resmi.' },
]

function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {}
}

function pretty(value: unknown) {
  return JSON.stringify(asObject(value), null, 2)
}

export function CompanyProfileEditor({
  profile,
  canUpdate,
  canPublish,
}: {
  profile: Profile | null
  canUpdate: boolean
  canPublish: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [legalName, setLegalName] = useState(profile?.legal_name ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? 'Nuzultrip')
  const [changeNote, setChangeNote] = useState('')

  const initialBlocks = useMemo(
    () =>
      Object.fromEntries(
        BLOCKS.map(({ key }) => [key, pretty(profile?.current_version?.[key])]),
      ) as Record<BlockKey, string>,
    [profile],
  )
  const [blocks, setBlocks] = useState<Record<BlockKey, string>>(initialBlocks)

  function run(task: () => Promise<{ ok: boolean; error?: { message?: string } | null }>) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await task()
        if (!result.ok) {
          setError(result.error?.message ?? 'Operasi gagal.')
          return
        }
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan pada sistem.')
      }
    })
  }

  function initialize() {
    if (!legalName.trim() || !displayName.trim()) {
      setError('Nama legal dan nama tampilan wajib diisi.')
      return
    }
    run(async () => {
      const result = await initializeCompanyProfile({ legalName, displayName })
      if (result.ok) setMessage('Profil perusahaan berhasil dibuat sebagai Draf.')
      return result
    })
  }

  function save() {
    if (!profile) return
    const parsed = {} as Record<BlockKey, JsonObject>
    try {
      for (const { key } of BLOCKS) parsed[key] = JSON.parse(blocks[key] || '{}') as JsonObject
    } catch {
      setError('Salah satu blok JSON tidak valid. Periksa tanda kurung, koma, dan tanda kutip.')
      return
    }

    run(async () => {
      const result = await saveCompanyProfileDraft({
        profileId: profile.id,
        legalName,
        displayName,
        blocks: parsed,
        changeNote,
      })
      if (result.ok) setMessage('Draf profil perusahaan berhasil disimpan.')
      return result
    })
  }

  function transition(toStatus: 'draft' | 'review' | 'approved' | 'published') {
    if (!profile) return
    run(async () => {
      const result = await transitionCompanyProfile({ profileId: profile.id, toStatus })
      if (result.ok) setMessage(`Status profil berhasil diubah menjadi ${toStatus}.`)
      return result
    })
  }

  if (!profile) {
    return (
      <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
        <h2 className="text-fg text-lg font-semibold">Inisialisasi Profil Perusahaan</h2>
        <p className="text-fg-muted mt-1 text-sm">Belum ada profil perusahaan di database production. Isi identitas dasar untuk membuat versi Draf pertama.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-fg text-sm font-medium">Nama Legal Perusahaan</span>
            <input value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="Isi sesuai dokumen legal" className="border-border bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm" />
          </label>
          <label className="block">
            <span className="text-fg text-sm font-medium">Nama Tampilan</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="border-border bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm" />
          </label>
        </div>
        {error ? <p className="text-danger mt-4 text-sm">{error}</p> : null}
        <button type="button" onClick={initialize} disabled={!canUpdate || pending} className="bg-primary text-primary-foreground mt-5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {pending ? 'Membuat...' : 'Buat Profil Draf'}
        </button>
      </div>
    )
  }

  const editable = canUpdate && profile.status === 'draft'

  return (
    <div className="space-y-5">
      <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-fg-muted text-xs uppercase tracking-[0.18em]">Lifecycle Profil</p>
            <h2 className="text-fg mt-1 text-xl font-semibold">{displayName || 'Nuzultrip'}</h2>
            <p className="text-fg-muted mt-1 text-sm">Status: <strong className="text-fg">{profile.status}</strong> · Versi aktif: v{profile.current_version?.version_number ?? 0}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.status === 'published' && canPublish ? <button type="button" onClick={() => transition('draft')} disabled={pending} className="border-border rounded-lg border px-3 py-2 text-sm font-semibold">Mulai Revisi</button> : null}
            {profile.status === 'draft' && canPublish ? <button type="button" onClick={() => transition('review')} disabled={pending} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold">Kirim untuk Ditinjau</button> : null}
            {profile.status === 'review' && canPublish ? <><button type="button" onClick={() => transition('draft')} disabled={pending} className="border-border rounded-lg border px-3 py-2 text-sm font-semibold">Kembalikan ke Draf</button><button type="button" onClick={() => transition('approved')} disabled={pending} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold">Setujui</button></> : null}
            {profile.status === 'approved' && canPublish ? <><button type="button" onClick={() => transition('draft')} disabled={pending} className="border-border rounded-lg border px-3 py-2 text-sm font-semibold">Kembalikan ke Draf</button><button type="button" onClick={() => transition('published')} disabled={pending} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold">Terbitkan</button></> : null}
          </div>
        </div>
      </div>

      {message ? <div className="border-success/30 bg-success/10 rounded-xl border px-4 py-3 text-sm">{message}</div> : null}
      {error ? <div className="border-danger/30 bg-danger/5 text-danger rounded-xl border px-4 py-3 text-sm">{error}</div> : null}

      <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-fg text-sm font-medium">Nama Legal Perusahaan</span>
            <input value={legalName} onChange={(event) => setLegalName(event.target.value)} disabled={!editable} className="border-border bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-60" />
          </label>
          <label className="block">
            <span className="text-fg text-sm font-medium">Nama Tampilan</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!editable} className="border-border bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-60" />
          </label>
        </div>
      </div>

      {BLOCKS.map(({ key, label, description }) => (
        <section key={key} className="border-border bg-surface rounded-xl border p-5 sm:p-6">
          <h3 className="text-fg text-base font-semibold">{label}</h3>
          <p className="text-fg-muted mt-1 text-xs leading-5">{description}</p>
          <textarea
            value={blocks[key]}
            onChange={(event) => setBlocks((current) => ({ ...current, [key]: event.target.value }))}
            disabled={!editable}
            spellCheck={false}
            className="border-border bg-background text-fg mt-4 min-h-40 w-full rounded-lg border p-3 font-mono text-xs leading-5 outline-none disabled:opacity-60"
          />
        </section>
      ))}

      <div className="border-border bg-surface sticky bottom-4 rounded-xl border p-4 shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="min-w-64 flex-1">
            <span className="text-fg text-sm font-medium">Catatan Perubahan</span>
            <input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} disabled={!editable} placeholder="Contoh: memperbarui visi dan layanan utama" className="border-border bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-60" />
          </label>
          <button type="button" onClick={save} disabled={!editable || pending} className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            {pending ? 'Memproses...' : 'Simpan Draf'}
          </button>
        </div>
      </div>
    </div>
  )
}
