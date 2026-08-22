import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'
import { formatDateTime } from '@/lib/format'

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
    <Stack gap={8}>
      <PageHeader
        eyebrow="Messages"
        title={thread.subject}
        description={
          thread.is_closed ? 'Percakapan ditutup.' : 'Percakapan aktif dengan tim Nuzultrip.'
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Riwayat percakapan</CardTitle>
        </CardHeader>
        <CardBody>
          {!messages?.length ? (
            <EmptyState title="Belum ada pesan" description="Percakapan belum memiliki pesan." />
          ) : (
            <ol className="flex flex-col gap-4">
              {messages.map((message) => (
                <li key={message.id} className="border-border-subtle rounded-xl border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-body-sm font-medium">
                      {message.sender_label ||
                        (message.sender_id === principal.userId ? 'Anda' : 'Tim Nuzultrip')}
                    </span>
                    <time className="text-caption text-fg-subtle">
                      {formatDateTime(message.sent_at, { timeZone: principal.timezone })}
                    </time>
                  </div>
                  <p className="text-body-sm text-fg-muted whitespace-pre-wrap">
                    {message.body_text}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
