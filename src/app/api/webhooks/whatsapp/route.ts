import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getServerEnv } from '@/lib/server-env'
import { beginWhatsAppInboundDelivery, claimWhatsAppInbound, completeWhatsAppInbound, failWhatsAppInbound } from '@/server/admin/whatsapp-inbound'
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
  if (!env.WHATSAPP_VERIFY_TOKEN || mode !== 'subscribe' || !safeEqualText(token, env.WHATSAPP_VERIFY_TOKEN) || !challenge) return new NextResponse('Forbidden', { status: 403 })
  return new NextResponse(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
}

function safeEqualText(actual: string | null, expected: string): boolean {
  if (actual === null) return false
  const actualBuffer = Buffer.from(actual, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

function validSignature(body: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature?.startsWith('sha256=')) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(body).digest('hex'), 'utf8')
  const actual = Buffer.from(signature.slice(7), 'utf8')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

type MetaMessage = { id?: string; from?: string; type?: string; text?: { body?: string } }
type MetaPayload = { object?: string; entry?: Array<{ changes?: Array<{ field?: string; value?: { metadata?: { phone_number_id?: string }; messages?: MetaMessage[] } }> }> }

export async function POST(request: Request) {
  const raw = await request.text()
  const env = getServerEnv()
  if (!validSignature(raw, request.headers.get('x-hub-signature-256'), env.WHATSAPP_APP_SECRET)) return new NextResponse('Unauthorized', { status: 401 })
  const settings = await getWhatsAppSettings()
  if (!settings.enabled || !settings.aiAutoReplyEnabled) return NextResponse.json({ received: true })

  let payload: MetaPayload
  try { payload = JSON.parse(raw) as MetaPayload } catch { return new NextResponse('Bad Request', { status: 400 }) }
  if (payload.object !== 'whatsapp_business_account') return NextResponse.json({ received: true })
  const work: Promise<unknown>[] = []
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    if (change.field !== 'messages') continue
    const value = change.value
    if (!value || value.metadata?.phone_number_id !== settings.phoneNumberId) continue
    for (const message of value.messages ?? []) {
      const body = message.type === 'text' ? message.text?.body?.trim() : ''
      const from = message.from?.trim()
      if (!message.id || !from || !body || body.length > 2000) continue
      work.push((async () => {
        let claimed = false
        try {
          claimed = await claimWhatsAppInbound(message.id!, from)
          if (!claimed) return
          const answer = await answerHaloNuzul(body)
          await beginWhatsAppInboundDelivery(message.id!)
          const delivery = await sendHaloNuzulWhatsAppReply({ phone: from, text: answer.reply })

          // Once delivery has started, never automatically requeue this wamid. A network
          // timeout can be ambiguous: Meta may already have accepted the outbound message.
          if (delivery.status !== 'sent') return

          // Provider acceptance is authoritative. If our final DB write fails, leave the
          // event in "sending" and acknowledge Meta so a webhook retry cannot duplicate it.
          try { await completeWhatsAppInbound(message.id!, delivery.providerMessageId) } catch { return }
        } catch (error) {
          if (claimed) {
            try { await failWhatsAppInbound(message.id!, error instanceof Error ? error.message : 'WhatsApp AI processing failed.') } catch { /* a sending event is intentionally immutable here */ }
          }
          throw error
        }
      })())
    }
  }
  const results = await Promise.allSettled(work)
  if (results.some((result) => result.status === 'rejected')) return NextResponse.json({ received: false, retry: true }, { status: 503 })
  return NextResponse.json({ received: true })
}
