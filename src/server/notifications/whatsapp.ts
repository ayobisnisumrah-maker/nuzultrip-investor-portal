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

    const phone = normalizeIndonesianPhone(input.phone)
    if (!isValidE164Phone(phone)) {
      return { status: 'failed', reason: 'Investor phone number is invalid.' }
    }

    const env = getServerEnv()
    const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim()
    const graphVersion = env.WHATSAPP_GRAPH_API_VERSION?.trim()
    const phoneNumberId = settings.phoneNumberId.trim()

    if (!accessToken || !graphVersion || !phoneNumberId) {
      return {
        status: 'skipped',
        reason: 'WhatsApp Cloud API server credentials are not configured.',
      }
    }

    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone.slice(1),
          type: 'template',
          template: {
            name: settings.investorInvitation.templateName,
            language: { code: settings.investorInvitation.languageCode },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: input.name },
                  { type: 'text', text: input.email },
                ],
              },
            ],
          },
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      },
    )

    if (!response.ok) {
      return { status: 'failed', reason: `WhatsApp provider returned HTTP ${response.status}.` }
    }

    const payload = (await response.json()) as {
      messages?: Array<{ id?: string }>
    }

    return {
      status: 'sent',
      providerMessageId: payload.messages?.[0]?.id ?? null,
    }
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'WhatsApp delivery failed.',
    }
  }
}
