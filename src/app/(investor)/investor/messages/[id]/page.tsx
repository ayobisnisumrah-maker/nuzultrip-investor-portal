import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, LockKeyhole } from 'lucide-react'

import { LiveMessageThread } from '@/features/messaging/live-message-thread'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'

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
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <Link
          href="/investor/messages"
          className="text-body-sm text-fg-muted hover:text-fg inline-flex items-center gap-1.5 font-medium transition"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Semua pesan
        </Link>
        <span className="text-caption text-fg-subtle hidden items-center gap-1.5 sm:inline-flex">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          Percakapan pribadi
        </span>
      </div>

      <section className="border-border bg-surface min-w-0 overflow-hidden rounded-2xl border shadow-sm">
        <div className="border-border bg-surface flex items-center gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="bg-accent-soft text-accent-solid flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
            NZ
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-body text-fg truncate font-semibold">Tim Nuzultrip</h1>
              {!thread.is_closed ? (
                <span className="bg-success-soft text-success-solid text-caption rounded-full px-2 py-0.5 font-medium">
                  Aktif
                </span>
              ) : null}
            </div>
            <p className="text-caption text-fg-muted mt-0.5 truncate">{thread.subject}</p>
          </div>
        </div>

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
