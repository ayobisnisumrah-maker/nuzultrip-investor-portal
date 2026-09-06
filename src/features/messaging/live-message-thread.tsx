'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Send, Smile, Wifi, WifiOff } from 'lucide-react'

import { ADMIN_MESSAGE_TEMPLATES } from '@/features/messaging/admin-message-templates'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { sendAdminMessage } from '@/server/messaging/admin-actions'
import { sendInvestorMessage } from '@/server/messaging/investor-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

type Message = {
  id: string
  body_text: string
  sender_label: string | null
  sender_id: string | null
  sent_at: string
}

type Props = {
  threadId: string
  initialMessages: Message[]
  currentUserId: string
  actor: 'admin' | 'investor'
  timezone: string
  canSend: boolean
  isClosed: boolean
  counterpartLabel: string
}

const EMOJIS = ['😀', '😊', '🙏', '👍', '✅', '📌', '📈', '💬', '✨', '🤝', '❤️', '🎉'] as const

function formatMessageTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function LiveMessageThread({
  threadId,
  initialMessages,
  currentUserId,
  actor,
  timezone,
  canSend,
  isClosed,
  counterpartLabel,
}: Props) {
  const { push } = useToast()
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  useEffect(() => {
    const supabase = getBrowserSupabase()
    let active = true

    async function syncMessages() {
      const { data, error: syncError } = await supabase
        .from('messages')
        .select('id, body_text, sender_label, sender_id, sent_at')
        .eq('thread_id', threadId)
        .order('sent_at', { ascending: true })

      if (!active || syncError || !data) return

      setMessages((current) => {
        const optimistic = current.filter((message) => message.id.startsWith('optimistic:'))
        return [...data, ...optimistic]
      })
    }

    const topic = actor === 'admin' ? 'admin:global' : `investor:${currentUserId}`
    const channel = supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'message.received' }, () => {
        void syncMessages()
      })
      .subscribe((status) => {
        if (!active) return
        const isSubscribed = status === 'SUBSCRIBED'
        setConnected(isSubscribed)
        if (isSubscribed) void syncMessages()
      })

    function syncWhenVisible() {
      if (document.visibilityState === 'visible') void syncMessages()
    }

    function syncWhenOnline() {
      void syncMessages()
    }

    document.addEventListener('visibilitychange', syncWhenVisible)
    window.addEventListener('online', syncWhenOnline)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', syncWhenVisible)
      window.removeEventListener('online', syncWhenOnline)
      void supabase.removeChannel(channel)
    }
  }, [actor, currentUserId, threadId])

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
    [messages],
  )

  function appendEmoji(emoji: string) {
    setBody((value) => `${value}${emoji}`)
    setShowEmoji(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function submit() {
    const text = body.trim()
    if (!text || pending || !canSend || isClosed) return

    setError(null)
    const optimisticId = `optimistic:${crypto.randomUUID()}`
    const optimistic: Message = {
      id: optimisticId,
      body_text: text,
      sender_label: null,
      sender_id: currentUserId,
      sent_at: new Date().toISOString(),
    }

    setMessages((current) => [...current, optimistic])
    setBody('')
    setShowEmoji(false)

    startTransition(async () => {
      const result =
        actor === 'admin'
          ? await sendAdminMessage({ threadId, body: text })
          : await sendInvestorMessage({ threadId, body: text })

      if (!result.ok) {
        setMessages((current) => current.filter((message) => message.id !== optimisticId))
        setBody(text)
        setError(result.error.message)
        return
      }

      setMessages((current) => {
        const withoutOptimistic = current.filter((message) => message.id !== optimisticId)
        if (withoutOptimistic.some((message) => message.id === result.data.id)) {
          return withoutOptimistic
        }
        return [
          ...withoutOptimistic,
          { ...optimistic, id: result.data.id, sent_at: result.data.sent_at },
        ]
      })
    })
  }

  return (
    <div className="flex min-h-[32rem] flex-col sm:min-h-[36rem] lg:h-[min(68vh,46rem)]">
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-body-sm text-fg truncate font-semibold">{counterpartLabel}</p>
          <p className="text-caption text-fg-subtle mt-0.5">Percakapan pribadi</p>
        </div>
        <div className="text-caption text-fg-subtle flex shrink-0 items-center gap-1.5" aria-live="polite">
          {connected ? <Wifi className="size-3.5" aria-hidden="true" /> : <WifiOff className="size-3.5" aria-hidden="true" />}
          <span className="hidden sm:inline">{connected ? 'Real-time aktif' : 'Menghubungkan'}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5" aria-live="polite">
        {sortedMessages.length ? (
          <ol className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
            {sortedMessages.map((message) => {
              const own = message.sender_id === currentUserId
              return (
                <li key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <article className={`max-w-[88%] sm:max-w-[76%] lg:max-w-[68%] ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-2xl border px-3.5 py-2.5 sm:px-4 sm:py-3 ${
                        own
                          ? 'border-accent-solid/30 bg-accent-soft text-fg rounded-br-md'
                          : 'border-border bg-surface-muted text-fg rounded-bl-md'
                      }`}
                    >
                      <p className="text-body-sm whitespace-pre-wrap break-words">{message.body_text}</p>
                    </div>
                    <div className={`mt-1 flex items-center gap-2 px-1 ${own ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-caption text-fg-subtle">
                        {own ? 'Anda' : message.sender_label || counterpartLabel}
                      </span>
                      <time className="text-caption text-fg-subtle" dateTime={message.sent_at}>
                        {formatMessageTime(message.sent_at, timezone)}
                      </time>
                      {message.id.startsWith('optimistic:') ? (
                        <span className="text-caption text-fg-subtle">Mengirim…</span>
                      ) : null}
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="flex h-full min-h-64 items-center justify-center text-center">
            <div>
              <p className="text-body-sm text-fg font-medium">Belum ada pesan</p>
              <p className="text-caption text-fg-muted mt-1">Mulai percakapan melalui kolom pesan di bawah.</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-border bg-surface border-t p-3 sm:p-4">
        {isClosed ? (
          <Alert tone="info" title="Percakapan ditutup">
            Percakapan ini tidak menerima balasan baru.
          </Alert>
        ) : !canSend ? (
          <Alert tone="info" title="Mode baca">
            Anda dapat membaca percakapan, tetapi tidak memiliki akses untuk mengirim pesan.
          </Alert>
        ) : (
          <div className="mx-auto w-full max-w-4xl">
            {actor === 'admin' ? (
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor={`template-${threadId}`} className="text-caption text-fg-muted shrink-0 font-medium">
                  Template
                </label>
                <select
                  id={`template-${threadId}`}
                  defaultValue=""
                  onChange={(event) => {
                    const template = ADMIN_MESSAGE_TEMPLATES.find((item) => item.id === event.target.value)
                    if (template) {
                      setBody(template.body)
                      requestAnimationFrame(() => textareaRef.current?.focus())
                    }
                    event.currentTarget.value = ''
                  }}
                  className="border-border bg-canvas text-body-sm h-9 min-w-0 flex-1 rounded-lg border px-3 sm:max-w-sm"
                >
                  <option value="">Pilih template pesan…</option>
                  {ADMIN_MESSAGE_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {error ? (
              <div className="mb-2">
                <Alert tone="danger" title="Pesan gagal dikirim">{error}</Alert>
              </div>
            ) : null}

            <div
              className="border-border bg-canvas focus-within:border-accent-solid relative rounded-xl border p-2 transition"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                if (event.dataTransfer.files.length) {
                  push({
                    tone: 'info',
                    title: 'Lampiran tidak didukung',
                    description: 'Chat hanya mendukung pesan teks dan emoji. Dokumen atau file tidak dapat dikirim melalui chat.',
                  })
                }
              }}
            >
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submit()
                  }
                }}
                placeholder="Tulis pesan…"
                rows={3}
                maxLength={20000}
                disabled={pending}
                className="text-body-sm text-fg placeholder:text-fg-subtle min-h-20 w-full resize-none bg-transparent px-2 py-1.5 pr-2 outline-none sm:min-h-24"
              />

              <div className="mt-1 flex items-end justify-between gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmoji((value) => !value)}
                    className="text-fg-muted hover:bg-surface-muted hover:text-fg inline-flex size-9 items-center justify-center rounded-lg transition"
                    aria-label="Pilih emoji"
                    aria-expanded={showEmoji}
                  >
                    <Smile className="size-4" aria-hidden="true" />
                  </button>
                  {showEmoji ? (
                    <div className="border-border bg-surface absolute bottom-11 left-0 z-20 grid w-56 grid-cols-6 gap-1 rounded-xl border p-2 shadow-lg sm:w-64">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => appendEmoji(emoji)}
                          className="hover:bg-surface-muted flex size-8 items-center justify-center rounded-lg text-lg transition"
                          aria-label={`Tambahkan emoji ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-caption text-fg-subtle hidden sm:inline">Enter kirim · Shift+Enter baris baru</span>
                  <Button disabled={pending || !body.trim()} onClick={submit}>
                    <Send className="size-4" aria-hidden="true" />
                    <span className="ml-2">{pending ? 'Mengirim…' : 'Kirim'}</span>
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-caption text-fg-subtle mt-2">
              Chat mendukung teks dan emoji. Dokumen, gambar, dan file tidak dapat dikirim melalui chat.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
