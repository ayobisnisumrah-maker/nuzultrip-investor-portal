'use server'

import { z } from 'zod'

import { ConflictError, NotFoundError } from '@/core/errors'
import { defineAction, requireInvestorAccess } from '@/server/auth/guards'

const messageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(20000),
})

const notificationSchema = z.object({
  notificationId: z.string().uuid(),
})

/** Investor replies only to a thread they actually own. RLS repeats this check. */
export const sendInvestorMessage = defineAction({
  access: 'investor',
  input: messageSchema,
  audit: { action: 'message.investor_sent', entityType: 'message' },
  handler: async ({ input, supabase, principal, audit }) => {
    const investor = requireInvestorAccess(principal)

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, subject, is_closed, investor_id')
      .eq('id', input.threadId)
      .eq('investor_id', investor.investorId)
      .maybeSingle()

    if (threadError) {
      throw new ConflictError(
        `Failed to read investor thread: ${threadError.message}`,
        'Percakapan tidak dapat dibaca saat ini.',
      )
    }
    if (!thread) throw new NotFoundError('Percakapan')
    if (thread.is_closed) throw new ConflictError('Thread is closed.', 'Percakapan sudah ditutup.')

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

    audit({ entityId: message.id, summary: `Investor membalas percakapan ${thread.subject}.` })
    return message
  },
})

export const markInvestorNotificationRead = defineAction({
  access: 'investor',
  input: notificationSchema,
  audit: { action: 'notification.read', entityType: 'notification' },
  handler: async ({ input, supabase, principal, audit }) => {
    const investor = requireInvestorAccess(principal)
    const readAt = new Date().toISOString()

    const { data: notification, error: readError } = await supabase
      .from('notifications')
      .select('id, recipient_id, read_at')
      .eq('id', input.notificationId)
      .eq('recipient_id', investor.userId)
      .maybeSingle()

    if (readError) {
      throw new ConflictError(
        `Failed to read notification: ${readError.message}`,
        'Notifikasi tidak dapat diperbarui saat ini.',
      )
    }
    if (!notification) throw new NotFoundError('Notifikasi')

    if (!notification.read_at) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('id', notification.id)
        .eq('recipient_id', investor.userId)

      if (error) {
        throw new ConflictError(
          `Failed to mark notification read: ${error.message}`,
          'Notifikasi tidak dapat diperbarui saat ini.',
        )
      }
    }

    audit({
      entityId: notification.id,
      summary: 'Notifikasi investor ditandai sudah dibaca.',
      changes: notification.read_at
        ? undefined
        : { read_at: { before: null, after: readAt } },
    })

    return { id: notification.id, readAt: notification.read_at ?? readAt }
  },
})

export const markAllInvestorNotificationsRead = defineAction({
  access: 'investor',
  input: z.object({}),
  audit: { action: 'notification.all_read', entityType: 'notification' },
  handler: async ({ supabase, principal, audit }) => {
    const investor = requireInvestorAccess(principal)
    const readAt = new Date().toISOString()

    const { data: updated, error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('recipient_id', investor.userId)
      .is('read_at', null)
      .select('id')

    if (error) {
      throw new ConflictError(
        `Failed to mark all notifications read: ${error.message}`,
        'Notifikasi tidak dapat diperbarui saat ini.',
      )
    }

    audit({
      summary: `${updated?.length ?? 0} notifikasi investor ditandai sudah dibaca.`,
    })

    return { count: updated?.length ?? 0, readAt }
  },
})
