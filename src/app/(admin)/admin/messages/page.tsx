import type { Metadata } from 'next'

import { CommunicationWorkbench } from '@/features/admin/communication-workbench'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'

export const metadata: Metadata = { title: 'Pesan' }

type SearchParams = { thread?: string }

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
  const params = await searchParams
  const { data: threads, error } = await supabase
    .from('message_threads')
    .select('id, subject, thread_kind, investor_id, last_message_at, is_closed')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error)
    return (
      <Alert tone="danger" title="Pesan tidak dapat dimuat">
        Data percakapan gagal diambil. Silakan coba lagi.
      </Alert>
    )

  const selectedId = params.thread
  const selectedThread = threads?.find((thread) => thread.id === selectedId) ?? null
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

  const { data: investors } = principal.permissions.has('messages.send')
    ? await supabase
        .from('investors')
        .select('id, legal_name, organization_name, reference_code')
        .order('legal_name', { ascending: true })
        .limit(500)
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
          Komunikasi
        </p>
        <h1 className="font-display text-heading-lg text-fg mt-1">Pesan</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
          Kelola percakapan investor secara real-time dari inbox admin.
        </p>
      </div>
      <CommunicationWorkbench
        threads={threads ?? []}
        selectedThread={selectedThread}
        messages={messages}
        investors={investors ?? []}
        canSend={principal.permissions.has('messages.send')}
        canHandle={principal.permissions.has('inquiries.handle')}
      />
    </div>
  )
}
