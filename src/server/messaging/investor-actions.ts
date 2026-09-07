'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import { ConflictError, NotFoundError } from '@/core/errors'
import { defineAction, requireInvestorAccess } from '@/server/auth/guards'
import type { Database } from '@/types/database'

type AppRpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

function appRpc(supabase: SupabaseClient<Database>, name: string, args: Record<string, unknown>) {
  return (supabase.schema('app') as unknown as AppRpcClient).rpc(name, args)
}

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(20000),
})

const createRequestSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
})

export const createInvestorMessageRequest = defineAction({
  access: 'investor',
  input: createRequestSchema,
  audit: { action: 'message.request_created', entityType: 'message_thread' },
  handler: async ({ input, supabase, principal, audit }) => {
    const investor = requireInvestorAccess(principal)
    const result = await appRpc(supabase, 'create_investor_message_request', {
      p_subject: input.subject,
      p_body: input.body,
    })

    if (result.error || typeof result.data !== 'string') {
      const pending = result.error?.message?.includes('pending request exists')
      throw new ConflictError(
        `Failed to create investor message request: ${result.error?.message ?? 'no thread returned'}`,
        pending
          ? 'Masih ada pertanyaan yang menunggu jawaban tim Nuzultrip.'
          : 'Pertanyaan tidak dapat diajukan saat ini.',
      )
    }

    audit({
      entityId: result.data,
      summary: `Investor ${investor.investorId} mengajukan pertanyaan baru.`,
    })

    return { threadId: result.data }
  },
})

export const sendInvestorMessage = defineAction({
  access: 'investor',
  input: sendMessageSchema,
  audit: { action: 'message.sent', entityType: 'message' },
  handler: async ({ input, supabase, principal, audit }) => {
    const investor = requireInvestorAccess(principal)

    const { data: rawThread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, subject, investor_id, is_closed, awaiting_admin_reply, expires_at, reply_deadline_at')
      .eq('id', input.threadId)
      .eq('investor_id', investor.investorId)
      .maybeSingle()

    if (threadError) {
      throw new ConflictError(
        `Failed to read thread: ${threadError.message}`,
        'Percakapan tidak dapat dibaca saat ini.',
      )
    }

    const thread = rawThread as unknown as {
      id: string
      subject: string
      investor_id: string | null
      is_closed: boolean
      awaiting_admin_reply: boolean
      expires_at: string | null
      reply_deadline_at: string | null
    } | null

    if (!thread) throw new NotFoundError('Percakapan')
    if (thread.is_closed) {
      throw new ConflictError('Thread is closed.', 'Percakapan sudah ditutup dan hanya dapat dibaca.')
    }
    if (thread.awaiting_admin_reply) {
      throw new ConflictError(
        'Thread awaits admin response.',
        'Pertanyaan Anda sedang menunggu jawaban tim Nuzultrip. Anda dapat melanjutkan chat setelah admin membalas.',
      )
    }

    const now = Date.now()
    if (thread.expires_at && new Date(thread.expires_at).getTime() <= now) {
      throw new ConflictError(
        'Thread session expired.',
        'Masa berlaku percakapan telah berakhir. Percakapan sekarang hanya dapat dibaca.',
      )
    }
    if (thread.reply_deadline_at && new Date(thread.reply_deadline_at).getTime() <= now) {
      throw new ConflictError(
        'Thread inactivity deadline expired.',
        'Percakapan ditutup karena tidak ada respons selama 4 jam. Silakan ajukan pertanyaan baru bila masih diperlukan.',
      )
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
        'Pesan tidak dapat dikirim saat ini. Masa percakapan mungkin telah berakhir.',
      )
    }

    audit({
      entityId: message.id,
      summary: `Investor membalas percakapan ${thread.subject}.`,
    })

    return message
  },
})
