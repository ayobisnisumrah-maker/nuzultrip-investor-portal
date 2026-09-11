'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  saveCompanyProfileContentDraft,
  transitionCompanyProfileVersion,
} from '@/server/company-profile/version-actions'

const BLOCKS = [
  ['legal_information', 'Legalitas', 'Informasi legal dan perizinan yang telah diverifikasi.'],
  ['history', 'Sejarah', 'Riwayat pembentukan dan perkembangan perusahaan.'],
  ['vision', 'Visi', 'Arah jangka panjang perusahaan.'],
  ['mission', 'Misi', 'Misi utama dan cara perusahaan mewujudkan visinya.'],
  ['leadership', 'Pimpinan', 'Informasi pimpinan dan struktur manajemen yang relevan.'],
  ['business_overview', 'Ikhtisar Bisnis', 'Model bisnis, layanan utama, dan fokus operasional.'],
  ['business_ecosystem', 'Ekosistem Bisnis', 'Mitra, kanal, produk, dan komponen ekosistem perusahaan.'],
  ['strategic_direction', 'Arah Strategis', 'Prioritas dan fokus pengembangan perusahaan.'],
  ['milestones', 'Tonggak Perjalanan', 'Milestone penting yang dapat diverifikasi.'],
  ['achievements', 'Pencapaian', 'Pencapaian perusahaan yang didukung bukti.'],
  ['statistics', 'Statistik', 'Statistik perusahaan yang telah diverifikasi.'],
  ['contact', 'Kontak', 'Alamat, email, telepon, dan kanal kontak resmi.'],
] as const

type BlockKey = (typeof BLOCKS)[number][0]
type Blocks = Record<BlockKey, string>

type Props = {
  profileId: string
  status: string
  versionNumber: number | null
  publishedVersionNumber: number | null
  initialBlocks: Blocks
  canUpdate: boolean
  canPublish: boolean
}

export function CompanyProfileVersionEditor({
  profileId,
  status,
  versionNumber,
  publishedVersionNumber,
  initialBlocks,
  canUpdate,
  canPublish,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [blocks, setBlocks] = useState<Blocks>(initialBlocks)
  const [changeNote, setChangeNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const editable = canUpdate && status === 'draft'

  function run(task: () => Promise<{ ok: boolean; error?: { message?: string } | null }>, success: string) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await task()
        if (!result.ok) {
          setError(result.error?.message ?? 'Operasi gagal.')
          return
        }
        setMessage(success)
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan pada sistem.')
      }
    })
  }

  function saveDraft() {
    run(
      () => saveCompanyProfileContentDraft({ profileId, blocks, changeNote }),
      'Draf konten profil perusahaan berhasil disimpan sebagai versi baru.',
    )
  }

  function transition(toStatus: 'draft' | 'review' | 'approved' | 'published') {
    run(
      () => transitionCompanyProfileVersion({ profileId, toStatus }),
      `Status profil perusahaan berhasil diubah menjadi ${toStatus}.`,
    )
  }

  return (
    <div className="space-y-5">
      <div className="border-border bg-canvas rounded-xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-caption text-fg-subtle">Lifecycle konten profil</p>
            <p className="text-body-sm text-fg-muted mt-1">
              Status <strong className="text-fg">{status}</strong>
              {' · '}Versi aktif {versionNumber ? `v${versionNumber}` : 'belum ada'}
              {' · '}Versi terbit {publishedVersionNumber ? `v${publishedVersionNumber}` : 'belum ada'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === 'published' && canUpdate ? (
              <button type="button" onClick={() => transition('draft')} disabled={pending} className="border-border rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Mulai Revisi
              </button>
            ) : null}
            {status === 'draft' && canPublish ? (
              <button type="button" onClick={() => transition('review')} disabled={pending || !versionNumber} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Kirim untuk Ditinjau
              </button>
            ) : null}
            {status === 'review' && canUpdate ? (
              <button type="button" onClick={() => transition('draft')} disabled={pending} className="border-border rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Kembalikan ke Draf
              </button>
            ) : null}
            {status === 'review' && canPublish ? (
              <button type="button" onClick={() => transition('approved')} disabled={pending} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Setujui
              </button>
            ) : null}
            {status === 'approved' && canUpdate ? (
              <button type="button" onClick={() => transition('draft')} disabled={pending} className="border-border rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Kembalikan ke Draf
              </button>
            ) : null}
            {status === 'approved' && canPublish ? (
              <button type="button" onClick={() => transition('published')} disabled={pending} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Terbitkan
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {message ? <div role="status" className="border-success/30 bg-success/10 rounded-xl border px-4 py-3 text-sm">{message}</div> : null}
      {error ? <div role="alert" className="border-danger/30 bg-danger/5 text-danger rounded-xl border px-4 py-3 text-sm">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {BLOCKS.map(([key, label, description]) => (
          <label key={key} className="block">
            <span className="text-body-sm text-fg font-semibold">{label}</span>
            <span className="text-caption text-fg-subtle mt-1 block">{description}</span>
            <textarea
              value={blocks[key]}
              onChange={(event) => setBlocks((current) => ({ ...current, [key]: event.target.value }))}
              disabled={!editable || pending}
              rows={7}
              className="border-border bg-background text-fg mt-2 w-full rounded-lg border px-3 py-2 text-sm leading-6 disabled:opacity-60"
            />
          </label>
        ))}
      </div>

      <label className="block">
        <span className="text-body-sm text-fg font-semibold">Catatan perubahan</span>
        <span className="text-caption text-fg-subtle mt-1 block">Jelaskan perubahan utama agar riwayat versi mudah diaudit.</span>
        <input
          value={changeNote}
          onChange={(event) => setChangeNote(event.target.value)}
          disabled={!editable || pending}
          maxLength={500}
          className="border-border bg-background text-fg mt-2 h-10 w-full rounded-lg border px-3 text-sm disabled:opacity-60"
        />
      </label>

      {editable ? (
        <div className="flex justify-end">
          <button type="button" onClick={saveDraft} disabled={pending} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {pending ? 'Menyimpan...' : 'Simpan sebagai Versi Draf Baru'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
