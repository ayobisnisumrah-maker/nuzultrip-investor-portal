import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type WhatsAppTemplateSettings = {
  enabled: boolean
  templateName: string
  languageCode: string
  preview: string
}

export type WhatsAppSettings = {
  enabled: boolean
  senderPhone: string
  phoneNumberId: string
  investorInvitation: WhatsAppTemplateSettings
  inquiryCompleted: WhatsAppTemplateSettings
}

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  enabled: false,
  senderPhone: '',
  phoneNumberId: '',
  investorInvitation: {
    enabled: true,
    templateName: 'investor_invitation',
    languageCode: 'id',
    preview:
      'Halo {{name}}, akun investor Nuzultrip telah didaftarkan. Tautan pembuatan kata sandi telah dikirim ke {{email}}. Silakan periksa kotak masuk dan folder spam.',
  },
  inquiryCompleted: {
    enabled: true,
    templateName: 'inquiry_completed',
    languageCode: 'id',
    preview:
      'Halo {{name}}, permintaan informasi/dokumen Anda telah selesai ditindaklanjuti oleh tim Nuzultrip. Silakan periksa kanal yang sebelumnya digunakan. Jika masih memerlukan bantuan, silakan hubungi kami kembali.',
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readTemplate(
  value: unknown,
  fallback: WhatsAppTemplateSettings,
): WhatsAppTemplateSettings {
  const record = isRecord(value) ? value : {}
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : fallback.enabled,
    templateName:
      typeof record.template_name === 'string' && record.template_name.trim()
        ? record.template_name.trim()
        : fallback.templateName,
    languageCode:
      typeof record.language_code === 'string' && record.language_code.trim()
        ? record.language_code.trim()
        : fallback.languageCode,
    preview:
      typeof record.preview === 'string' && record.preview.trim()
        ? record.preview.trim()
        : fallback.preview,
  }
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [
      'whatsapp.provider',
      'whatsapp.investor_invitation',
      'whatsapp.inquiry_completed',
    ])

  if (error) throw new Error(`Failed to load WhatsApp settings: ${error.message}`)

  const values = new Map((data ?? []).map((row) => [row.key, row.value] as const))
  const provider = values.get('whatsapp.provider')
  const providerRecord = isRecord(provider) ? provider : {}

  return {
    enabled:
      typeof providerRecord.enabled === 'boolean'
        ? providerRecord.enabled
        : DEFAULT_WHATSAPP_SETTINGS.enabled,
    senderPhone:
      typeof providerRecord.sender_phone === 'string'
        ? providerRecord.sender_phone.trim()
        : DEFAULT_WHATSAPP_SETTINGS.senderPhone,
    phoneNumberId:
      typeof providerRecord.phone_number_id === 'string'
        ? providerRecord.phone_number_id.trim()
        : DEFAULT_WHATSAPP_SETTINGS.phoneNumberId,
    investorInvitation: readTemplate(
      values.get('whatsapp.investor_invitation'),
      DEFAULT_WHATSAPP_SETTINGS.investorInvitation,
    ),
    inquiryCompleted: readTemplate(
      values.get('whatsapp.inquiry_completed'),
      DEFAULT_WHATSAPP_SETTINGS.inquiryCompleted,
    ),
  }
}
