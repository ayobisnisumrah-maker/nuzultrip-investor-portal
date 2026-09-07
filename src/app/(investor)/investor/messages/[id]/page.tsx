import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LiveMessageThread } from '@/features/messaging/live-message-thread'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

export const metadata: Metadata = { title: 'Pesan' }

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
    <div className="min-w-0 space-y-4">
      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">Pesan</p>
        <h1 className="font-display text-heading-lg text-fg mt-1">Percakapan dengan Tim Nuzultrip</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
          {thread.is_closed
            ? 'Percakapan ini telah ditutup.'
            : 'Pesan dari tim Nuzultrip dan balasan Anda ditampilkan sebagai percakapan terpisah dan real-time.'}
        </p>
      </div>

      <section className="border-border bg-surface min-w-0 overflow-hidden rounded-2xl border shadow-sm">
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
      </section>
    </div>
  )
}
