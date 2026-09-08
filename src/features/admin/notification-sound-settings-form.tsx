'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Upload } from 'lucide-react'

import { getBrowserSupabase } from '@/lib/supabase-browser'
import type { NotificationSoundSettings } from '@/server/settings/notification-sound'
import { updateAdminNotificationSoundSettings } from '@/server/admin/settings-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

const MAX_SOUND_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'])

function extensionFor(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fromName) return fromName
  if (file.type === 'audio/mpeg') return 'mp3'
  if (file.type === 'audio/wav') return 'wav'
  if (file.type === 'audio/ogg') return 'ogg'
  return 'm4a'
}

export function NotificationSoundSettingsForm({
  settings,
  canUpdate,
}: {
  settings: NotificationSoundSettings
  canUpdate: boolean
}) {
  const router = useRouter()
  const { push } = useToast()
  const [enabled, setEnabled] = useState(settings.enabled)
  const [volume, setVolume] = useState(Math.round(settings.volume * 100))
  const [path, setPath] = useState<string | null>(settings.path)
  const [publicUrl, setPublicUrl] = useState<string | null>(settings.publicUrl)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function upload(file: File) {
    setError(null)
    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Format suara harus MP3, WAV, OGG, M4A, atau MP4 audio.')
      return
    }
    if (file.size > MAX_SOUND_BYTES) {
      setError('Ukuran suara notifikasi maksimal 2 MB.')
      return
    }

    const supabase = getBrowserSupabase()
    setUploading(true)
    const nextPath = `chime/${crypto.randomUUID()}.${extensionFor(file)}`
    const { error: uploadError } = await supabase.storage
      .from('notification-sounds')
      .upload(nextPath, file, { cacheControl: '3600', upsert: false, contentType: file.type })

    if (uploadError) {
      setUploading(false)
      setError(`Upload gagal: ${uploadError.message}`)
      return
    }

    const nextUrl = supabase.storage.from('notification-sounds').getPublicUrl(nextPath).data.publicUrl
    setPath(nextPath)
    setPublicUrl(nextUrl)
    setUploading(false)
    push({ tone: 'success', title: 'Suara berhasil diunggah', description: 'Klik Simpan agar digunakan oleh aplikasi.' })
  }

  function save() {
    if (!canUpdate || pending) return
    setError(null)
    startTransition(async () => {
      const result = await updateAdminNotificationSoundSettings({
        enabled,
        path,
        volume: volume / 100,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
      push({ tone: 'success', title: 'Pengaturan disimpan', description: 'Suara baru langsung digunakan pada notifikasi berikutnya.' })
    })
  }

  function preview() {
    if (!publicUrl) return
    const audio = new Audio(publicUrl)
    audio.volume = volume / 100
    void audio.play().catch(() => setError('Browser memblokir pemutaran suara. Klik halaman lalu coba lagi.'))
  }

  return (
    <section className="border-border bg-surface rounded-2xl border p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="font-display text-heading-sm text-fg">Nada Notifikasi</h3>
          <p className="text-body-sm text-fg-muted mt-1">
            Nada ini digunakan untuk pesan dan notifikasi baru di dashboard Admin dan Investor.
          </p>
        </div>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <label className="text-body-sm text-fg flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canUpdate}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Aktifkan nada notifikasi
        </label>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div>
            <p className="text-caption text-fg-muted mb-2 font-medium">File suara</p>
            <div className="border-border bg-canvas text-body-sm text-fg-muted rounded-xl border px-4 py-3">
              {path ? path.split('/').pop() : 'Belum ada file suara yang dipilih'}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,.mp3,.wav,.ogg,.m4a"
            className="hidden"
            disabled={!canUpdate || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
              event.currentTarget.value = ''
            }}
          />
          <Button variant="secondary" disabled={!canUpdate || uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" aria-hidden="true" />
            <span className="ml-2">{uploading ? 'Mengunggah…' : 'Upload'}</span>
          </Button>
          <Button variant="secondary" disabled={!publicUrl} onClick={preview}>
            <Play className="size-4" aria-hidden="true" />
            <span className="ml-2">Tes</span>
          </Button>
        </div>

        <label className="block">
          <div className="text-body-sm text-fg mb-2 flex items-center justify-between gap-3">
            <span>Volume</span>
            <span className="text-caption text-fg-muted">{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            disabled={!canUpdate}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-full"
          />
        </label>

        <div className="flex justify-end">
          <Button disabled={!canUpdate || pending || uploading} onClick={save}>
            {pending ? 'Menyimpan…' : 'Simpan nada notifikasi'}
          </Button>
        </div>
      </div>
    </section>
  )
}
