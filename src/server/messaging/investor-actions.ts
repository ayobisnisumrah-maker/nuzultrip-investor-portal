'use server'

import { z } from 'zod'

import { ConflictError, NotFoundError } from '@/core/errors'
import { defineAction, requireInvestorAccess } from '@/server/auth/guards'

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(20000),
})

export const sendInvestorMessage = defineAction({
  access: 'investor',
  input: sendMessageSchema,
  audit: { action: 'message.sent', entityType: 'message' },
  handler: async ({ input, supabase, principal, audit }) => {
    const investor = requireInvestorAccess(principal)

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, subject, investor_id, is_closed')
      .eq('id', input.threadId)
      .eq('investor_id', investor.investorId)
      .maybeSingle()

    if (threadError) {
      throw new ConflictError(
        `Failed to read thread: ${threadError.message}`,
        'Percakapan tidak dapat dibaca saat ini.',
      )
    }
    if (!thread) throw new NotFoundError('Percakapan')
    if (thread.is_closed) {
      throw new ConflictError('Thread is closed.', 'Percakapan sudah ditutup.')
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: investor.userId,
        sender_label: investor.fullName,
        body_text: input.body,
        body_rich: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: input.body }] }],
        },
        is_system: false,
      })
      .select('id, sent_at')
      .single()

    if (error || !message) {
      throw new ConflictError(
        `Failed to send investor message: ${error?.message ?? 'no row'}`,
        'Pesan tidak dapat dikirim saat ini.',
      )
    }

    audit({
      entityId: message.id,
      summary: `Investor membalas percakapan ${thread.subject}.`,
    })

    return message
  },
})
