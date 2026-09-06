import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LiveMessageThread } from '@/features/messaging/live-message-thread'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Card } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export const metadata: Metadata = { title: 'Percakapan' }

export default async function InvestorMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const principal = await requireInvestorPage()
  const { id } = await params
  const supabase = await getServerSupabase()

  const { data: thread } = await supabase
    .from('message_threads')
    .select('id, subject, thread_kind, is_closed, created_at')
    .eq('id', id)
    .eq('investor_id', principal.investorId)
    .maybeSingle()

  if (!thread) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('id, body_text, sender_id, sender_label, sent_at')
    .eq('thread_id', thread.id)
    .order('sent_at', { ascending: true })

  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow="Pesan"
        title={thread.subject}
        description={
          thread.is_closed
            ? 'Percakapan ini telah ditutup.'
            : 'Percakapan aktif dengan tim Nuzultrip.'
        }
      />

      <Card className="overflow-hidden p-0">
        <LiveMessageThread
          threadId={thread.id}
          initialMessages={messages ?? []}
          currentUserId={principal.userId}
          actor="investor"
          timezone={principal.timezone}
          canSend
          isClosed={thread.is_closed}
          counterpartLabel="Tim Nuzultrip"
        />
      </Card>
    </Stack>
  )
}
