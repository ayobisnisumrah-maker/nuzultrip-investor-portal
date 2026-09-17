import 'server-only'

import { getServerEnv } from '@/lib/server-env'
import { getWhatsAppSettings } from '@/server/settings/whatsapp'

export type WhatsAppDeliveryResult =
  | { status: 'sent'; providerMessageId: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizeIndonesianPhone(value: string): string {
  const digits = digitsOnly(value)
  if (!digits) return ''
  if (digits.startsWith('62')) return `+${digits}`
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`
  if (digits.startsWith('8')) return `+62${digits}`
  return `+${digits}`
}

export function isValidE164Phone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value)
}

async function sendText(input: { phone: string; text: string }): Promise<WhatsAppDeliveryResult> {
  const phone = normalizeIndonesianPhone(input.phone)
  if (!isValidE164Phone(phone)) return { status: 'failed', reason: 'Nomor WhatsApp penerima tidak valid.' }
  const settings = await getWhatsAppSettings()
  const env = getServerEnv()
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim()
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION?.trim()
  const phoneNumberId = settings.phoneNumberId.trim()
  if (!accessToken || !graphVersion || !phoneNumberId) return { status: 'skipped', reason: 'Kredensial server WhatsApp Cloud API belum lengkap.' }
  const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone.slice(1), type: 'text', text: { preview_url: false, body: input.text.slice(0, 4096) } }),
    cache: 'no-store', signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) return { status: 'failed', reason: `WhatsApp provider returned HTTP ${response.status}.` }
  const payload = (await response.json()) as { messages?: Array<{ id?: string }> }
  return { status: 'sent', providerMessageId: payload.messages?.[0]?.id ?? null }
}

export async function sendHaloNuzulWhatsAppReply(input: { phone: string; text: string }) {
  try { return await sendText(input) } catch (error) { return { status: 'failed' as const, reason: error instanceof Error ? error.message : 'WhatsApp delivery failed.' } }
}

async function sendTemplate(input: {
  phone: string
  templateName: string
  languageCode: string
  parameters: string[]
}): Promise<WhatsAppDeliveryResult> {
  const phone = normalizeIndonesianPhone(input.phone)
  if (!isValidE164Phone(phone)) return { status: 'failed', reason: 'Nomor WhatsApp penerima tidak valid.' }

  const settings = await getWhatsAppSettings()
  const env = getServerEnv()
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim()
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION?.trim()
  const phoneNumberId = settings.phoneNumberId.trim()

  if (!accessToken || !graphVersion || !phoneNumberId) {
    return { status: 'skipped', reason: 'Kredensial server WhatsApp Cloud API belum lengkap.' }
  }

  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.slice(1),
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: input.languageCode },
          components: [
            {
              type: 'body',
              parameters: input.parameters.map((text) => ({ type: 'text', text })),
            },
          ],
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    },
  )

  if (!response.ok) return { status: 'failed', reason: `WhatsApp provider returned HTTP ${response.status}.` }

  const payload = (await response.json()) as { messages?: Array<{ id?: string }> }
  return { status: 'sent', providerMessageId: payload.messages?.[0]?.id ?? null }
}

export async function sendInvestorInvitationWhatsApp(input: {
  phone: string
  name: string
  email: string
}): Promise<WhatsAppDeliveryResult> {
  try {
    const settings = await getWhatsAppSettings()
    if (!settings.enabled || !settings.investorInvitation.enabled) {
      return { status: 'skipped', reason: 'WhatsApp notification is disabled.' }
    }
    return await sendTemplate({
      phone: input.phone,
      templateName: settings.investorInvitation.templateName,
      languageCode: settings.investorInvitation.languageCode,
      parameters: [input.name, input.email],
    })
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'WhatsApp delivery failed.' }
  }
}

export async function sendInquiryCompletionWhatsApp(input: {
  phone: string
  name: string
}): Promise<WhatsAppDeliveryResult> {
  try {
    const settings = await getWhatsAppSettings()
    if (!settings.enabled || !settings.inquiryCompletion.enabled) {
      return { status: 'skipped', reason: 'WhatsApp tindak lanjut permintaan dinonaktifkan.' }
    }
    return await sendTemplate({
      phone: input.phone,
      templateName: settings.inquiryCompletion.templateName,
      languageCode: settings.inquiryCompletion.languageCode,
      parameters: [input.name],
    })
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'WhatsApp delivery failed.' }
  }
}
