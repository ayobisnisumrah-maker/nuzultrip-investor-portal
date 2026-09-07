import type { Metadata } from 'next'

import { InvestorMessageWorkspace } from '@/features/messaging/investor-message-workspace'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'

export const metadata: Metadata = { title: 'Pesan' }

type Thread = {
  id: string
  subject: string
  last_message_at: string | null
  is_closed: boolean
  created_at: string
  initiated_by: string
  awaiting_admin_reply: boolean
  expires_at: string | null
  reply_deadline_at: string | null
}

type Message = {
  id: string
  thread_id: string
  body_text: string
  sender_id: string | null
  sender_label: string | null
  sent_at: string
}

export default async function InvestorMessagesPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: rawThreads } = await supabase
    .from('message_threads')
    .select(
      'id, subject, last_message_at, is_closed, created_at, initiated_by, awaiting_admin_reply, expires_at, reply_deadline_at',
    )
    .eq('investor_id', principal.investorId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const threads = (rawThreads ?? []) as unknown as Thread[]
  const threadIds = threads.map((thread) => thread.id)

  const { data: rawMessages } = threadIds.length
    ? await supabase
        .from('messages')
        .select('id, thread_id, body_text, sender_id, sender_label, sent_at')
        .in('thread_id', threadIds)
        .order('sent_at', { ascending: false })
        .limit(300)
    : { data: [] }

  const messages = (rawMessages ?? []) as unknown as Message[]

  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow="Investor Relations"
        title="Pesan"
        description="Pilih percakapan di sebelah kiri dan lanjutkan chat tanpa berpindah halaman."
      />

      <InvestorMessageWorkspace
        initialThreads={threads}
        initialMessages={messages}
        currentUserId={principal.userId}
        timezone={principal.timezone}
      />
    </Stack>
  )
}
