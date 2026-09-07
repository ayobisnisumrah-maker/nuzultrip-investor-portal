import type { Metadata } from 'next'

import { CommunicationWorkbench } from '@/features/admin/communication-workbench'
import { requireAdminPage } from '@/server/auth/page-guards'
import { expireMessageThreads } from '@/server/messaging/lifecycle'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'

export const metadata: Metadata = { title: 'Pesan' }

type SearchParams = { thread?: string }

type ListMessage = {
  id: string
  thread_id: string
  sender_id: string | null
  sent_at: string
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const principal = await requireAdminPage('/admin/messages')
  if (!principal.permissions.has('messages.view')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat pesan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  await expireMessageThreads(supabase)

  const params = await searchParams
  const { data: rawThreads, error } = await supabase
    .from('message_threads')
    .select(
      'id, subject, thread_kind, investor_id, last_message_at, is_closed, expires_at, reply_deadline_at, awaiting_admin_reply',
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) {
    return (
      <Alert tone="danger" title="Pesan tidak dapat dimuat">
        Data percakapan gagal diambil. Silakan coba lagi.
      </Alert>
    )
  }

  const threads = (rawThreads ?? []).map((thread) => ({
    id: thread.id,
    subject: thread.subject,
    thread_kind: thread.thread_kind,
    investor_id: thread.investor_id,
    last_message_at: thread.last_message_at,
    // expireMessageThreads above reconciles both deadline columns in the
    // database; use its persisted result as the single render-time authority.
    is_closed: thread.is_closed,
  }))

  const selectedId = params.thread ?? threads[0]?.id
  const selectedThread = threads.find((thread) => thread.id === selectedId) ?? null
  let messages: {
    id: string
    body_text: string
    sender_label: string | null
    sender_id: string | null
    sent_at: string
  }[] = []

  if (selectedThread) {
    const result = await supabase
      .from('messages')
      .select('id, body_text, sender_label, sender_id, sent_at')
      .eq('thread_id', selectedThread.id)
      .order('sent_at', { ascending: true })
    messages = result.data ?? []
  }

  const threadIds = threads.map((thread) => thread.id)
  const { data: listMessagesRaw } = threadIds.length
    ? await supabase
        .from('messages')
        .select('id, thread_id, sender_id, sent_at')
        .in('thread_id', threadIds)
        .order('sent_at', { ascending: false })
        .limit(2000)
    : { data: [] }

  const listMessages = (listMessagesRaw ?? []) as ListMessage[]
  const incomingIds = listMessages
    .filter((message) => message.sender_id !== principal.userId)
    .map((message) => message.id)

  const { data: readRows } = incomingIds.length
    ? await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', principal.userId)
        .in('message_id', incomingIds)
    : { data: [] }

  const readIds = new Set((readRows ?? []).map((row) => row.message_id))
  const unreadByThread: Record<string, number> = {}
  for (const message of listMessages) {
    if (message.sender_id === principal.userId || readIds.has(message.id)) continue
    unreadByThread[message.thread_id] = (unreadByThread[message.thread_id] ?? 0) + 1
  }

  const { data: investors } = await supabase
    .from('investors')
    .select('id, legal_name, organization_name, reference_code')
    .order('legal_name', { ascending: true })
    .limit(500)

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
          Komunikasi
        </p>
        <h1 className="font-display text-heading-lg text-fg mt-1">Pesan</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
          Percakapan dua arah secara real-time antara tim Nuzultrip dan investor.
        </p>
      </div>

      <CommunicationWorkbench
        threads={threads}
        selectedThread={selectedThread}
        messages={messages}
        unreadByThread={unreadByThread}
        investors={investors ?? []}
        canSend={principal.permissions.has('messages.send')}
        canHandle={principal.permissions.has('inquiries.handle')}
        currentUserId={principal.userId}
        timezone={principal.timezone}
      />
    </div>
  )
}
