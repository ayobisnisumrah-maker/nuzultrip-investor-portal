'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { MessageCircleMore, Plus, Search } from 'lucide-react'

import { LiveMessageThread } from '@/features/messaging/live-message-thread'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { createInvestorMessageRequest } from '@/server/messaging/investor-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

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

type Props = {
  initialThreads: Thread[]
  initialMessages: Message[]
  initialReadMessageIds: string[]
  currentUserId: string
  timezone: string
}

function isExpired(thread: Thread, now: number) {
  return Boolean(
    thread.is_closed ||
      (thread.expires_at && new Date(thread.expires_at).getTime() <= now) ||
      (thread.reply_deadline_at && new Date(thread.reply_deadline_at).getTime() <= now),
  )
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function InvestorMessageWorkspace({
  initialThreads,
  initialMessages,
  initialReadMessageIds,
  currentUserId,
  timezone,
}: Props) {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const { push } = useToast()
  const [threads, setThreads] = useState(initialThreads)
  const [messages, setMessages] = useState(initialMessages)
  const [readMessageIds, setReadMessageIds] = useState(() => new Set(initialReadMessageIds))
  const [selectedId, setSelectedId] = useState(initialThreads[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [showRequest, setShowRequest] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sync = useCallback(async () => {
    const [{ data: threadRows }, { data: messageRows }] = await Promise.all([
      supabase
        .from('message_threads')
        .select('id, subject, last_message_at, is_closed, created_at, initiated_by, awaiting_admin_reply, expires_at, reply_deadline_at')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('id, thread_id, body_text, sender_id, sender_label, sent_at')
        .order('sent_at', { ascending: false })
        .limit(500),
    ])

    const nextThreads = (threadRows ?? []) as unknown as Thread[]
    const nextMessages = (messageRows ?? []) as unknown as Message[]
    const incomingIds = nextMessages
      .filter((message) => message.sender_id !== currentUserId)
      .map((message) => message.id)

    const { data: readRows } = incomingIds.length
      ? await supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', currentUserId)
          .in('message_id', incomingIds)
      : { data: [] }

    setThreads(nextThreads)
    setMessages(nextMessages)
    setReadMessageIds(new Set((readRows ?? []).map((row) => row.message_id)))
    setSelectedId((current) => current || nextThreads[0]?.id || '')
  }, [currentUserId, supabase])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    const fallbackTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) void sync()
    }, 15_000)

    const channel = supabase
      .channel(`investor-message-workspace:${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_threads' }, () => void sync())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void sync())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reads' }, () => void sync())
      .subscribe()

    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(timer)
      window.clearInterval(fallbackTimer)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase, sync])

  const latestByThread = useMemo(() => {
    const map = new Map<string, Message>()
    for (const message of messages) if (!map.has(message.thread_id)) map.set(message.thread_id, message)
    return map
  }, [messages])

  const unreadByThread = useMemo(() => {
    const map = new Map<string, number>()
    for (const message of messages) {
      if (message.sender_id === currentUserId || readMessageIds.has(message.id)) continue
      map.set(message.thread_id, (map.get(message.thread_id) ?? 0) + 1)
    }
    return map
  }, [currentUserId, messages, readMessageIds])

  const selected = threads.find((thread) => thread.id === selectedId) ?? null
  const selectedMessages = selected
    ? messages
        .filter((message) => message.thread_id === selected.id)
        .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
    : []

  useEffect(() => {
    if (!selectedId || document.visibilityState !== 'visible') return

    const unreadIncoming = messages.filter(
      (message) =>
        message.thread_id === selectedId &&
        message.sender_id !== currentUserId &&
        !readMessageIds.has(message.id),
    )
    if (!unreadIncoming.length) return

    const ids = unreadIncoming.map((message) => message.id)
    setReadMessageIds((current) => {
      const next = new Set(current)
      ids.forEach((id) => next.add(id))
      return next
    })

    void supabase
      .from('message_reads')
      .upsert(
        ids.map((messageId) => ({ message_id: messageId, user_id: currentUserId })),
        { onConflict: 'message_id,user_id', ignoreDuplicates: true },
      )
  }, [currentUserId, messages, readMessageIds, selectedId, supabase])

  const filteredThreads = threads.filter((thread) =>
    thread.subject.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const pendingRequest = threads.some(
    (thread) =>
      thread.initiated_by === 'investor' &&
      thread.awaiting_admin_reply &&
      !isExpired(thread, now),
  )

  function submitRequest() {
    if (!subject.trim() || !body.trim() || pending) return
    setError(null)
    startTransition(async () => {
      const result = await createInvestorMessageRequest({ subject, body })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setSubject('')
      setBody('')
      setShowRequest(false)
      await sync()
      setSelectedId(result.data.threadId)
      push({ tone: 'success', title: 'Pertanyaan dikirim', description: 'Menunggu jawaban tim Nuzultrip.' })
    })
  }

  return (
    <div className="border-border bg-surface grid min-h-[38rem] overflow-hidden rounded-2xl border lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]">
      <aside className="border-border flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
        <div className="border-border space-y-3 border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-body text-fg font-semibold">Percakapan</h2>
              <p className="text-caption text-fg-muted">
                {Array.from(unreadByThread.values()).reduce((sum, count) => sum + count, 0)} pesan belum dibaca
              </p>
            </div>
            <Button variant="secondary" disabled={pendingRequest} onClick={() => setShowRequest(true)}>
              <Plus className="size-4" aria-hidden="true" />
              <span className="ml-2">Pertanyaan</span>
            </Button>
          </div>
          <div className="border-border bg-canvas flex items-center gap-2 rounded-lg border px-3">
            <Search className="text-fg-subtle size-4" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari percakapan..."
              className="text-body-sm text-fg h-10 min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredThreads.length ? filteredThreads.map((thread) => {
            const latest = latestByThread.get(thread.id)
            const expired = isExpired(thread, now)
            const active = selectedId === thread.id
            const unread = unreadByThread.get(thread.id) ?? 0
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedId(thread.id)}
                className={`border-border w-full border-b px-4 py-3 text-left transition ${active ? 'bg-accent-soft' : 'hover:bg-surface-muted/60'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-body-sm text-fg truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{thread.subject}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {unread ? (
                      <span className="bg-accent-solid text-on-accent inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : null}
                    <span className="text-caption text-fg-subtle">
                      {expired ? 'Selesai' : thread.awaiting_admin_reply ? 'Menunggu' : 'Aktif'}
                    </span>
                  </div>
                </div>
                <p className={`text-caption mt-1 truncate ${unread ? 'text-fg font-medium' : 'text-fg-muted'}`}>
                  {latest ? `${latest.sender_id === currentUserId ? 'Anda: ' : 'Tim Nuzultrip: '}${latest.body_text}` : 'Belum ada pesan'}
                </p>
                <p className="text-caption text-fg-subtle mt-1">
                  {latest ? formatTime(latest.sent_at, timezone) : formatTime(thread.created_at, timezone)}
                </p>
              </button>
            )
          }) : (
            <div className="p-6 text-center">
              <MessageCircleMore className="text-fg-subtle mx-auto size-6" />
              <p className="text-body-sm text-fg-muted mt-2">Belum ada percakapan.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        {selected ? (
          <div className="flex h-full min-h-[38rem] flex-col">
            <div className="border-border border-b px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-body-sm text-fg font-semibold">Tim Nuzultrip</p>
                  <p className="text-caption text-fg-muted mt-0.5">{selected.subject}</p>
                </div>
                <div className="text-caption text-fg-subtle text-right">
                  {selected.awaiting_admin_reply && !isExpired(selected, now)
                    ? 'Menunggu jawaban admin'
                    : isExpired(selected, now)
                      ? 'Percakapan hanya dapat dibaca'
                      : selected.reply_deadline_at
                        ? `Batas respons ${formatTime(selected.reply_deadline_at, timezone)}`
                        : 'Percakapan aktif'}
                </div>
              </div>
            </div>

            <LiveMessageThread
              key={selected.id}
              threadId={selected.id}
              initialMessages={selectedMessages}
              currentUserId={currentUserId}
              actor="investor"
              timezone={timezone}
              canSend={!selected.awaiting_admin_reply && !isExpired(selected, now)}
              isClosed={isExpired(selected, now)}
              counterpartLabel="Tim Nuzultrip"
            />
          </div>
        ) : (
          <div className="flex min-h-[38rem] items-center justify-center p-6 text-center">
            <div>
              <MessageCircleMore className="text-fg-subtle mx-auto size-8" />
              <h2 className="text-body text-fg mt-3 font-semibold">Pilih percakapan</h2>
              <p className="text-body-sm text-fg-muted mt-1">Riwayat pesan akan tampil di panel ini.</p>
            </div>
          </div>
        )}
      </section>

      {showRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="border-border bg-surface w-full max-w-lg rounded-2xl border p-5 shadow-xl">
            <h2 className="text-heading-sm text-fg font-semibold">Ajukan pertanyaan</h2>
            <p className="text-body-sm text-fg-muted mt-1">Setelah dikirim, tunggu jawaban admin sebelum mengirim pesan lanjutan.</p>
            <div className="mt-4 space-y-3">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={200}
                placeholder="Subjek pertanyaan"
                className="border-border bg-canvas text-body-sm h-10 w-full rounded-lg border px-3"
              />
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Tulis pertanyaan Anda..."
                className="border-border bg-canvas text-body-sm w-full rounded-lg border px-3 py-2"
              />
              {error ? <Alert tone="danger" title="Pertanyaan gagal dikirim">{error}</Alert> : null}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" disabled={pending} onClick={() => setShowRequest(false)}>Batal</Button>
                <Button disabled={pending || !subject.trim() || !body.trim()} onClick={submitRequest}>
                  {pending ? 'Mengirim...' : 'Kirim pertanyaan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
