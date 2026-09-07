import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, MessageCircleMore } from 'lucide-react'

import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Pesan' }

type MessagePreview = {
  id: string
  thread_id: string
  body_text: string
  sender_id: string | null
  sender_label: string | null
  sent_at: string
}

function formatPreviewTime(value: string, timezone: string): string {
  const date = new Date(value)
  const now = new Date()
  const sameDay = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now)

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    ...(sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short' }),
  }).format(date)
}

export default async function InvestorMessagesPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, subject, thread_kind, last_message_at, is_closed, created_at')
    .eq('investor_id', principal.investorId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const threadIds = (threads ?? []).map((thread) => thread.id)
  const { data: messages } = threadIds.length
    ? await supabase
        .from('messages')
        .select('id, thread_id, body_text, sender_id, sender_label, sent_at')
        .in('thread_id', threadIds)
        .order('sent_at', { ascending: false })
        .limit(100)
    : { data: [] as MessagePreview[] }

  const latestByThread = new Map<string, MessagePreview>()
  for (const message of messages ?? []) {
    if (!latestByThread.has(message.thread_id)) latestByThread.set(message.thread_id, message)
  }

  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow="Investor Relations"
        title="Pesan"
        description="Percakapan pribadi Anda dengan tim Nuzultrip."
      />

      {!threads?.length ? (
        <EmptyState
          title="Belum ada percakapan"
          description="Pesan dari tim Nuzultrip akan muncul di sini."
        />
      ) : (
        <section className="border-border bg-surface overflow-hidden rounded-2xl border shadow-sm">
          <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-body text-fg font-semibold">Percakapan</h2>
              <p className="text-caption text-fg-muted mt-0.5">
                Setiap pesan tampil sebagai bubble terpisah di dalam percakapan.
              </p>
            </div>
            <span className="text-caption text-fg-subtle shrink-0">{threads.length}</span>
          </div>

          <div className="divide-border divide-y">
            {threads.map((thread) => {
              const latest = latestByThread.get(thread.id)
              const lastActivity = latest?.sent_at ?? thread.last_message_at ?? thread.created_at
              const sender = latest?.sender_id === principal.userId ? 'Anda' : latest?.sender_label || 'Tim Nuzultrip'

              return (
                <Link
                  key={thread.id}
                  href={`/investor/messages/${thread.id}`}
                  className="hover:bg-surface-muted group flex min-w-0 items-center gap-3 px-4 py-4 transition sm:px-5"
                >
                  <div className="bg-accent-soft text-accent-solid flex size-11 shrink-0 items-center justify-center rounded-full font-bold">
                    NZ
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-body-sm text-fg truncate font-semibold">Tim Nuzultrip</p>
                        {thread.is_closed ? (
                          <span className="border-border text-caption text-fg-subtle hidden shrink-0 rounded-full border px-2 py-0.5 sm:inline-flex">
                            Ditutup
                          </span>
                        ) : null}
                      </div>
                      <time className="text-caption text-fg-subtle shrink-0" dateTime={lastActivity}>
                        {formatPreviewTime(lastActivity, principal.timezone)}
                      </time>
                    </div>
                    <p className="text-caption text-fg-muted mt-0.5 truncate font-medium">{thread.subject}</p>
                    <p className="text-body-sm text-fg-muted mt-1 truncate">
                      {latest ? `${sender}: ${latest.body_text}` : 'Belum ada pesan.'}
                    </p>
                  </div>

                  <ChevronRight className="text-fg-subtle group-hover:text-fg size-4 shrink-0 transition" aria-hidden="true" />
                </Link>
              )
            })}
          </div>

          <div className="border-border bg-surface-muted text-caption text-fg-subtle flex items-center gap-2 border-t px-4 py-3 sm:px-5">
            <MessageCircleMore className="size-4 shrink-0" aria-hidden="true" />
            Chat mendukung pesan teks. Gambar dan file tidak dikirim melalui percakapan investor.
          </div>
        </section>
      )}
    </Stack>
  )
}
