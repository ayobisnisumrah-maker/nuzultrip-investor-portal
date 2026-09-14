import 'server-only'

import { getServerEnv } from '@/lib/server-env'
import { getWhatsAppSettings } from '@/server/settings/whatsapp'

type TemplateParameter = string | number

export type WhatsAppDeliveryResult =
  | { status: 'sent'; providerMessageId: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

function normalizeRecipient(value: string): string | null {
  let digits = value.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`
  }

  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

function textParameter(value: TemplateParameter) {
  return {
    type: 'text' as const,
    text: String(value),
  }
}

export async function sendWhatsAppTemplate(input: {
  to: string
  templateName: string
  parameters?: TemplateParameter[]
}): Promise<WhatsAppDeliveryResult> {
  const settings = await getWhatsAppSettings()

  if (!settings.enabled) {
    return { status: 'skipped', reason: 'WhatsApp notifications are disabled.' }
  }

  const recipient = normalizeRecipient(input.to)
  if (!recipient) {
    return { status: 'failed', reason: 'Nomor WhatsApp penerima tidak valid.' }
  }

  const env = getServerEnv()
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim()
  const graphBaseUrl = env.WHATSAPP_GRAPH_API_BASE_URL?.replace(/\/$/, '')
  const phoneNumberId = settings.phone_number_id.trim()

  if (!accessToken || !graphBaseUrl || !phoneNumberId) {
    return {
      status: 'failed',
      reason:
        'Konfigurasi provider WhatsApp belum lengkap. Periksa token/base URL environment dan Phone Number ID di Pengaturan.',
    }
  }

  try {
    const bodyParameters = (input.parameters ?? []).map(textParameter)
    const response = await fetch(`${graphBaseUrl}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: settings.language_code || 'id' },
          ...(bodyParameters.length
            ? {
                components: [
                  {
                    type: 'body',
                    parameters: bodyParameters,
                  },
                ],
              }
            : {}),
        },
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | { messages?: Array<{ id?: string }>; error?: { message?: string } }
      | null

    if (!response.ok) {
      return {
        status: 'failed',
        reason: payload?.error?.message?.trim() || `WhatsApp provider returned HTTP ${response.status}.`,
      }
    }

    return {
      status: 'sent',
      providerMessageId: payload?.messages?.[0]?.id ?? null,
    }
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Unknown WhatsApp delivery error.',
    }
  }
}

export async function sendInvestorInvitationWhatsApp(input: {
  to: string
  investorName: string
  email: string
}): Promise<WhatsAppDeliveryResult> {
  const settings = await getWhatsAppSettings()

  return sendWhatsAppTemplate({
    to: input.to,
    templateName: settings.investor_invitation_template,
    parameters: [input.investorName, input.email],
  })
}

export async function sendInquiryCompletedWhatsApp(input: {
  to: string
  requesterName: string
}): Promise<WhatsAppDeliveryResult> {
  const settings = await getWhatsAppSettings()

  return sendWhatsAppTemplate({
    to: input.to,
    templateName: settings.inquiry_completed_template,
    parameters: [input.requesterName],
  })
}
