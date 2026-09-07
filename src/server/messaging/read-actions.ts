'use server'

import { z } from 'zod'

import { ConflictError } from '@/core/errors'
import { defineAction, requireAuthenticated } from '@/server/auth/guards'

const markThreadReadSchema = z.object({
  threadId: z.string().uuid(),
})

export const markThreadRead = defineAction({
  access: 'authenticated',
  input: markThreadReadSchema,
  handler: async ({ input, supabase, principal }) => {
    const user = requireAuthenticated(principal)

    // The messages SELECT policy is the authorization boundary. An investor can
    // only see messages in their own thread; an admin additionally needs
    // messages.view. Never accept message IDs supplied by the browser.
    const { data: incoming, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .eq('thread_id', input.threadId)
      .neq('sender_id', user.userId)

    if (messageError) {
      throw new ConflictError(
        `Failed to load unread messages: ${messageError.message}`,
        'Status pesan belum dapat diperbarui.',
      )
    }

    if (!incoming?.length) return { read: 0 }

    // Read receipts are append-only. Existing receipts are ignored so this
    // never requires an UPDATE policy and refreshing the page remains idempotent.
    const { error: readError } = await supabase
      .from('message_reads')
      .upsert(
        incoming.map((message) => ({
          message_id: message.id,
          user_id: user.userId,
          read_at: new Date().toISOString(),
        })),
        { onConflict: 'message_id,user_id', ignoreDuplicates: true },
      )

    if (readError) {
      throw new ConflictError(
        `Failed to persist read receipts: ${readError.message}`,
        'Status pesan belum dapat diperbarui.',
      )
    }

    return { read: incoming.length }
  },
})
