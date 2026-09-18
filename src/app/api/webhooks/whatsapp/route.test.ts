import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const env = {
  WHATSAPP_VERIFY_TOKEN: 'verify-secret',
  WHATSAPP_APP_SECRET: 'app-secret',
}

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  answer: vi.fn(),
  send: vi.fn(),
  settings: vi.fn(),
}))

vi.mock('@/lib/server-env', () => ({ getServerEnv: () => env }))
vi.mock('@/server/admin/whatsapp-inbound', () => ({
  claimWhatsAppInbound: mocks.claim,
  beginWhatsAppInboundDelivery: mocks.begin,
  completeWhatsAppInbound: mocks.complete,
  failWhatsAppInbound: mocks.fail,
}))
vi.mock('@/server/halo-nuzul/answer', () => ({ answerHaloNuzul: mocks.answer }))
vi.mock('@/server/notifications/whatsapp', () => ({ sendHaloNuzulWhatsAppReply: mocks.send }))
vi.mock('@/server/settings/whatsapp', () => ({ getWhatsAppSettings: mocks.settings }))

import { GET, POST } from './route'

function payload(messageId = 'wamid.1') {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: 'phone-id' },
      messages: [{ id: messageId, from: '628123456789', type: 'text', text: { body: 'Halo' } }],
    } }] }],
  })
}

function signedRequest(raw: string, signature?: string) {
  const sig = signature ?? `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(raw).digest('hex')}`
  return new Request('https://example.test/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' },
    body: raw,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.settings.mockResolvedValue({ enabled: true, aiAutoReplyEnabled: true, phoneNumberId: 'phone-id' })
  mocks.claim.mockResolvedValue(true)
  mocks.begin.mockResolvedValue(undefined)
  mocks.complete.mockResolvedValue(undefined)
  mocks.fail.mockResolvedValue(undefined)
  mocks.answer.mockResolvedValue({ reply: 'Jawaban Halo Nuzul' })
  mocks.send.mockResolvedValue({ status: 'sent', providerMessageId: 'provider.1' })
})

describe('WhatsApp webhook verification', () => {
  it('returns the challenge only for the configured token', async () => {
    const ok = await GET(new Request('https://example.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-secret&hub.challenge=123'))
    expect(ok.status).toBe(200)
    expect(await ok.text()).toBe('123')

    const bad = await GET(new Request('https://example.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123'))
    expect(bad.status).toBe(403)
  })

  it('rejects missing or invalid HMAC signatures before reading settings', async () => {
    const raw = payload()
    const missing = await POST(new Request('https://example.test/api/webhooks/whatsapp', { method: 'POST', body: raw }))
    expect(missing.status).toBe(401)

    const invalid = await POST(signedRequest(raw, 'sha256=deadbeef'))
    expect(invalid.status).toBe(401)
    expect(mocks.settings).not.toHaveBeenCalled()
  })
})

describe('WhatsApp webhook idempotent delivery', () => {
  it('ignores a duplicate wamid when the durable claim is denied', async () => {
    mocks.claim.mockResolvedValue(false)
    const response = await POST(signedRequest(payload()))
    expect(response.status).toBe(200)
    expect(mocks.answer).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('does not deliver when AI auto reply is disabled', async () => {
    mocks.settings.mockResolvedValue({ enabled: true, aiAutoReplyEnabled: false, phoneNumberId: 'phone-id' })
    const response = await POST(signedRequest(payload()))
    expect(response.status).toBe(200)
    expect(mocks.claim).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('acknowledges provider acceptance even when DB completion fails', async () => {
    mocks.complete.mockRejectedValue(new Error('database unavailable'))
    const response = await POST(signedRequest(payload()))
    expect(response.status).toBe(200)
    expect(mocks.begin).toHaveBeenCalledTimes(1)
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(mocks.fail).not.toHaveBeenCalled()
  })

  it('does not mark an attempted delivery failed when the sender result is ambiguous', async () => {
    mocks.send.mockResolvedValue({ status: 'failed', reason: 'network timeout' })
    const response = await POST(signedRequest(payload()))
    expect(response.status).toBe(200)
    expect(mocks.begin).toHaveBeenCalledTimes(1)
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(mocks.fail).not.toHaveBeenCalled()
  })

  it('returns retryable failure when AI processing fails before delivery starts', async () => {
    mocks.answer.mockRejectedValue(new Error('AI unavailable'))
    const response = await POST(signedRequest(payload()))
    expect(response.status).toBe(503)
    expect(mocks.begin).not.toHaveBeenCalled()
    expect(mocks.fail).toHaveBeenCalledTimes(1)
  })
})
