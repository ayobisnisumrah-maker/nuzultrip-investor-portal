import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type WhatsAppSettings = {
  enabled: boolean
  senderPhone: string
  phoneNumberId: string
  investorInvitation: {
    enabled: boolean
    templateName: string
    languageCode: string
    preview: string
  }
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['whatsapp.provider', 'whatsapp.investor_invitation'])

  if (error) throw new Error(`Failed to load WhatsApp settings: ${error.message}`)

  const values = new Map((data ?? []).map((row) => [row.key, row.value] as const))
  const provider = values.get('whatsapp.provider')
  const invitation = values.get('whatsapp.investor_invitation')

  const providerRecord = isRecord(provider) ? provider : {}
  const invitationRecord = isRecord(invitation) ? invitation : {}

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
    investorInvitation: {
      enabled:
        typeof invitationRecord.enabled === 'boolean'
          ? invitationRecord.enabled
          : DEFAULT_WHATSAPP_SETTINGS.investorInvitation.enabled,
      templateName:
        typeof invitationRecord.template_name === 'string' && invitationRecord.template_name.trim()
          ? invitationRecord.template_name.trim()
          : DEFAULT_WHATSAPP_SETTINGS.investorInvitation.templateName,
      languageCode:
        typeof invitationRecord.language_code === 'string' && invitationRecord.language_code.trim()
          ? invitationRecord.language_code.trim()
          : DEFAULT_WHATSAPP_SETTINGS.investorInvitation.languageCode,
      preview:
        typeof invitationRecord.preview === 'string' && invitationRecord.preview.trim()
          ? invitationRecord.preview.trim()
          : DEFAULT_WHATSAPP_SETTINGS.investorInvitation.preview,
    },
  }
}
