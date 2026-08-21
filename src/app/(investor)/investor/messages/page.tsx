import type { Metadata } from 'next'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Pesan' }

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
    ? await supabase.from('messages').select('id, thread_id, body_text, sender_id, sender_label, sent_at').in('thread_id', threadIds).order('sent_at', { ascending: false }).limit(50)
    : { data: [] }

  const latestByThread = new Map<string, (typeof messages)[number]>(
    (messages ?? []).map((message) => [message.thread_id, message]),
  )

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Investor Relations" title="Pesan" description="Percakapan Anda dengan tim Nuzultrip." />
      {!threads?.length ? (
        <EmptyState title="Belum ada percakapan" description="Pesan dari tim Nuzultrip akan muncul di sini." />
      ) : (
        <div className="grid gap-4">
          {threads.map((thread) => {
            const latest = latestByThread.get(thread.id)
            return (
              <Card key={thread.id}>
                <CardHeader><CardTitle>{thread.subject}</CardTitle></CardHeader>
                <CardBody>
                  <div className="flex flex-col gap-2 text-body-sm">
                    <div className="text-caption text-fg-subtle">{thread.thread_kind} · {thread.is_closed ? 'Ditutup' : 'Aktif'}</div>
                    <p className="line-clamp-2 text-fg-muted">{latest?.body_text ?? 'Belum ada pesan.'}</p>
                    <a href={`/investor/messages/${thread.id}`} className="text-link hover:underline">Buka percakapan →</a>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </Stack>
  )
}
