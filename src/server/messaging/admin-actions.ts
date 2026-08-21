'use server'

import { z } from 'zod'

import { ConflictError, NotFoundError } from '@/core/errors'
import {
  defineAction,
  requireAdmin,
  requireAuthenticated,
} from '@/server/auth/guards'

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(20000),
})

const createThreadSchema = z.object({
  investorId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
})

const inquiryIdSchema = z.object({ inquiryId: z.string().uuid() })

export const sendAdminMessage = defineAction({
  access: { permission: 'messages.send' },
  input: sendMessageSchema,
  audit: { action: 'message.sent', entityType: 'message' },
  handler: async ({ input, supabase, principal, audit }) => {
    const admin = requireAdmin(principal)
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, subject, is_closed')
      .eq('id', input.threadId)
      .maybeSingle()

    if (threadError) throw new ConflictError(`Failed to read thread: ${threadError.message}`, 'Percakapan tidak dapat dibaca saat ini.')
    if (!thread) throw new NotFoundError('Percakapan')
    if (thread.is_closed) throw new ConflictError('Thread is closed.', 'Percakapan sudah ditutup.')

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: admin.userId,
        body_text: input.body,
        body_rich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: input.body }] }] },
        is_system: false,
      })
      .select('id, sent_at')
      .single()

    if (error || !message) throw new ConflictError(`Failed to send message: ${error?.message ?? 'no row'}`, 'Pesan tidak dapat dikirim saat ini.')

    audit({ entityId: message.id, summary: `Pesan dikirim dalam percakapan ${thread.subject}.` })
    return message
  },
})

export const createInvestorMessageThread = defineAction({
  access: { permission: 'messages.send' },
  input: createThreadSchema,
  audit: { action: 'message.thread_created', entityType: 'message_thread' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await (supabase.schema('app') as any).rpc('create_investor_message_thread', {
      p_investor_id: input.investorId,
      p_subject: input.subject,
      p_body: input.body,
    })

    if (error || !data) throw new ConflictError(`Failed to create thread: ${error?.message ?? 'no thread returned'}`, 'Percakapan tidak dapat dibuat saat ini.')
    audit({ entityId: data, summary: `Percakapan investor ${input.investorId} dibuat.` })
    return { threadId: data }
  },
})

export const markMessageRead = defineAction({
  access: 'authenticated',
  input: z.object({ messageId: z.string().uuid() }),
  handler: async ({ input, supabase, principal }) => {
    const user = requireAuthenticated(principal)
    const { error } = await supabase.from('message_reads').upsert({ message_id: input.messageId, user_id: user.userId }, { onConflict: 'message_id,user_id' })
    if (error) throw new ConflictError(`Failed to mark message read: ${error.message}`, 'Status pesan tidak dapat diperbarui.')
    return { read: true }
  },
})

export const convertInquiryToThread = defineAction({
  access: { permission: 'inquiries.handle' },
  input: z.object({ inquiryId: inquiryIdSchema.shape.inquiryId, subject: z.string().trim().max(200).optional() }),
  audit: { action: 'inquiry.converted_to_thread', entityType: 'portal_inquiry' },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await (supabase.schema('app') as any).rpc('convert_portal_inquiry_to_thread', {
      p_inquiry_id: input.inquiryId,
      p_subject: input.subject || undefined,
    })
    if (error || !data) throw new ConflictError(`Failed to convert inquiry: ${error?.message ?? 'no thread returned'}`, 'Permintaan tidak dapat dikonversi saat ini.')
    audit({ entityId: input.inquiryId, summary: 'Permintaan masuk dikonversi menjadi percakapan.' })
    return { threadId: data }
  },
})

export const updateInquiryStatus = defineAction({
  access: { permission: 'inquiries.handle' },
  input: z.object({ inquiryId: z.string().uuid(), status: z.enum(['new', 'in_progress', 'converted', 'closed']) }),
  audit: { action: 'inquiry.status_changed', entityType: 'portal_inquiry' },
  handler: async ({ input, supabase, audit }) => {
    const { data: current, error: readError } = await supabase.from('portal_inquiries').select('id, status').eq('id', input.inquiryId).maybeSingle()
    if (readError) throw new ConflictError(`Failed to read inquiry: ${readError.message}`, 'Permintaan tidak dapat dibaca saat ini.')
    if (!current) throw new NotFoundError('Permintaan')

    const { data: updated, error } = await supabase.from('portal_inquiries').update({ status: input.status, handled_at: input.status === 'new' ? null : new Date().toISOString() }).eq('id', input.inquiryId).select('id, status').single()
    if (error || !updated) throw new ConflictError(`Failed to update inquiry: ${error?.message ?? 'no row'}`, 'Status permintaan tidak dapat diperbarui.')
    audit({ entityId: updated.id, summary: `Status permintaan diubah dari ${current.status} menjadi ${updated.status}.`, changes: { status: { before: current.status, after: updated.status } })
    return updated
  },
})
