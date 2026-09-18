import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getServerEnv } from '@/lib/server-env'
import { claimWhatsAppInbound, completeWhatsAppInbound, failWhatsAppInbound } from '@/server/admin/whatsapp-inbound'
import { answerHaloNuzul } from '@/server/halo-nuzul/answer'
import { sendHaloNuzulWhatsAppReply } from '@/server/notifications/whatsapp'
import { getWhatsAppSettings } from '@/server/settings/whatsapp'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const env = getServerEnv()
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  if (!env.WHATSAPP_VERIFY_TOKEN || mode !== 'subscribe' || token !== env.WHATSAPP_VERIFY_TOKEN || !challenge) return new NextResponse('Forbidden', { status: 403 })
  return new NextResponse(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
}

function validSignature(body: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature?.startsWith('sha256=')) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(body).digest('hex'), 'utf8')
  const actual = Buffer.from(signature.slice(7), 'utf8')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

type MetaMessage = { id?: string; from?: string; type?: string; text?: { body?: string } }
type MetaPayload = { entry?: Array<{ changes?: Array<{ value?: { metadata?: { phone_number_id?: string }; messages?: MetaMessage[] } }> }> }

export async function POST(request: Request) {
  const raw = await request.text()
  const env = getServerEnv()
  if (!validSignature(raw, request.headers.get('x-hub-signature-256'), env.WHATSAPP_APP_SECRET)) return new NextResponse('Unauthorized', { status: 401 })
  const settings = await getWhatsAppSettings()
  if (!settings.enabled || !settings.aiAutoReplyEnabled) return NextResponse.json({ received: true })

  let payload: MetaPayload
  try { payload = JSON.parse(raw) as MetaPayload } catch { return new NextResponse('Bad Request', { status: 400 }) }
  const work: Promise<unknown>[] = []
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    const value = change.value
    if (!value || value.metadata?.phone_number_id !== settings.phoneNumberId) continue
    for (const message of value.messages ?? []) {
      const body = message.type === 'text' ? message.text?.body?.trim() : ''
      const from = message.from?.trim()
      if (!message.id || !from || !body) continue
      work.push((async () => {
        let claimed = false
        try {
          claimed = await claimWhatsAppInbound(message.id!, from)
          if (!claimed) return
          const answer = await answerHaloNuzul(body)
          const delivery = await sendHaloNuzulWhatsAppReply({ phone: from, text: answer.reply })
          if (delivery.status !== 'sent') throw new Error(delivery.reason)
          await completeWhatsAppInbound(message.id!, delivery.providerMessageId)
        } catch (error) {
          if (claimed) {
            try { await failWhatsAppInbound(message.id!, error instanceof Error ? error.message : 'WhatsApp AI processing failed.') } catch { /* lease expiry remains the recovery path */ }
          }
        }
      })())
    }
  }
  await Promise.allSettled(work)
  return NextResponse.json({ received: true })
}
