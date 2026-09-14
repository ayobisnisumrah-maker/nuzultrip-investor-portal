import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type WhatsAppSettings = {
  enabled: boolean
  sender_number: string
  phone_number_id: string
  language_code: string
  investor_invitation_template: string
  investor_invitation_preview: string
  inquiry_completed_template: string
  inquiry_completed_preview: string
}

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  enabled: false,
  sender_number: '',
  phone_number_id: '',
  language_code: 'id',
  investor_invitation_template: 'investor_invitation',
  investor_invitation_preview:
    'Halo {{1}}, Anda telah didaftarkan sebagai calon investor Nuzultrip. Tautan untuk membuat kata sandi sudah dikirim ke {{2}}. Silakan periksa kotak masuk atau folder spam.',
  inquiry_completed_template: 'inquiry_completed',
  inquiry_completed_preview:
    'Halo {{1}}, permintaan informasi/dokumen Anda telah selesai ditindaklanjuti oleh tim Nuzultrip. Silakan periksa kanal yang sebelumnya digunakan atau hubungi kami kembali bila masih memerlukan bantuan.',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'whatsapp.notifications')
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load WhatsApp settings: ${error.message}`)
  }

  if (!isRecord(data?.value)) return DEFAULT_WHATSAPP_SETTINGS

  const value = data.value

  return {
    enabled:
      typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_WHATSAPP_SETTINGS.enabled,
    sender_number: readString(value.sender_number, DEFAULT_WHATSAPP_SETTINGS.sender_number),
    phone_number_id: readString(value.phone_number_id, DEFAULT_WHATSAPP_SETTINGS.phone_number_id),
    language_code: readString(value.language_code, DEFAULT_WHATSAPP_SETTINGS.language_code) || 'id',
    investor_invitation_template:
      readString(
        value.investor_invitation_template,
        DEFAULT_WHATSAPP_SETTINGS.investor_invitation_template,
      ) || DEFAULT_WHATSAPP_SETTINGS.investor_invitation_template,
    investor_invitation_preview:
      readString(
        value.investor_invitation_preview,
        DEFAULT_WHATSAPP_SETTINGS.investor_invitation_preview,
      ) || DEFAULT_WHATSAPP_SETTINGS.investor_invitation_preview,
    inquiry_completed_template:
      readString(
        value.inquiry_completed_template,
        DEFAULT_WHATSAPP_SETTINGS.inquiry_completed_template,
      ) || DEFAULT_WHATSAPP_SETTINGS.inquiry_completed_template,
    inquiry_completed_preview:
      readString(
        value.inquiry_completed_preview,
        DEFAULT_WHATSAPP_SETTINGS.inquiry_completed_preview,
      ) || DEFAULT_WHATSAPP_SETTINGS.inquiry_completed_preview,
  }
}
