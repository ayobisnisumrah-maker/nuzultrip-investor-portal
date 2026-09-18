import 'server-only'
import { createHash } from 'node:crypto'
import { getServiceRoleClient } from './service-client'

function senderHash(sender: string) { return createHash('sha256').update(sender, 'utf8').digest('hex') }

export async function claimWhatsAppInbound(wamid: string, sender: string): Promise<boolean> {
  // Service role is required: anonymous webhook callers must never read or claim another event.
  const client = getServiceRoleClient()
  const { data, error } = await client.rpc('claim_whatsapp_inbound_event', { p_wamid: wamid, p_sender_hash: senderHash(sender), p_lease_seconds: 120 })
  if (error) throw new Error(`WhatsApp inbound claim failed: ${error.message}`)
  return data === true
}
export async function beginWhatsAppInboundDelivery(wamid: string) {
  const client = getServiceRoleClient()
  const { data, error } = await client.rpc('begin_whatsapp_inbound_delivery', { p_wamid: wamid })
  if (error || data !== true) throw new Error(`WhatsApp inbound delivery start failed: ${error?.message ?? 'not started'}`)
}

export async function completeWhatsAppInbound(wamid: string, providerMessageId: string | null) {
  const client = getServiceRoleClient()
  const { data, error } = await client.rpc('complete_whatsapp_inbound_event', { p_wamid: wamid, p_provider_message_id: providerMessageId ?? '' })
  if (error || data !== true) throw new Error(`WhatsApp inbound completion failed: ${error?.message ?? 'not completed'}`)
}
export async function failWhatsAppInbound(wamid: string, errorMessage: string) {
  const client = getServiceRoleClient()
  const { error } = await client.rpc('fail_whatsapp_inbound_event', { p_wamid: wamid, p_error: errorMessage.slice(0, 500) })
  if (error) throw new Error(`WhatsApp inbound failure record failed: ${error.message}`)
}
