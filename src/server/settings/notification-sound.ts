import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type NotificationSoundSettings = {
  enabled: boolean
  bucket: string
  path: string | null
  volume: number
  publicUrl: string | null
}

const DEFAULT_SETTINGS = {
  enabled: true,
  bucket: 'notification-sounds',
  path: null as string | null,
  volume: 0.75,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function getNotificationSoundSettings(): Promise<NotificationSoundSettings> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'notification.sound')
    .maybeSingle()

  if (error) throw new Error(`Gagal memuat pengaturan suara notifikasi: ${error.message}`)

  const raw = isRecord(data?.value) ? data.value : {}
  const bucket = typeof raw.bucket === 'string' && raw.bucket ? raw.bucket : DEFAULT_SETTINGS.bucket
  const path = typeof raw.path === 'string' && raw.path ? raw.path : null
  const volume = typeof raw.volume === 'number' && Number.isFinite(raw.volume)
    ? Math.min(1, Math.max(0, raw.volume))
    : DEFAULT_SETTINGS.volume
  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_SETTINGS.enabled

  const publicUrl = path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null

  return { enabled, bucket, path, volume, publicUrl }
}
