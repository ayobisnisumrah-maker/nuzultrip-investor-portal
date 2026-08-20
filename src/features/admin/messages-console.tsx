'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Plus, RefreshCw, MessageSquare } from 'lucide-react'

import {
  createInvestorMessageThread,
  sendAdminMessage,
} from '@/server/messaging/admin-actions'

type Thread = {
  id: string
  subject: string
  thread_kind: 'investor_admin' | 'broadcast' | 'portal_inquiry'
  investor_id: string | null
  last_message_at: string | null
  is_closed: boolean
}

type Message = {
  id: string
  thread_id: string
  sender_id: string | null
  sender_label: string | null
  body_text: string
  sent_at: string
}

type Investor = {
  id: string
  legal_name: string
  organization_name: string | null
  reference_code: string
}

export function MessagesConsole({
  threads,
  messages,
  investors,
  canSend,
}: {
  threads: Thread[]
  messages: Message[]
  investors: Investor[]
  canSend: boolean
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? '')
  const [body, setBody] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [investorId, setInvestorId] = useState(investors[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const selected = threads.find((thread) => thread.id === selectedId) ?? null
  const selectedMessages = useMemo(
    () => messages.filter((message) => message.thread_id === selectedId),
    [messages, selectedId],
  )

  function submitMessage() {
    if (!selected || !body.trim() || pending) return
    setError('')
    const value = body.trim()
    startTransition(async () => {
      const result = await sendAdminMessage({ threadId: selected.id, body: value })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setBody('')
      router.refresh()
    })
  }

  function submitThread() {
    if (!investorId || !subject.trim() || !newBody.trim() || pending) return
    setError('')
    startTransition(async () => {
      const result = await createInvestorMessageThread({
        investorId,
        subject: subject.trim(),
        body: newBody.trim(),
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setNewOpen(false)
      setSubject('')
      setNewBody('')
      setSelectedId(result.data.threadId)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-body font-semibold text-fg">Inbox percakapan</h2>
            <p className="text-caption text-fg-subtle">{threads.length} percakapan</p>
          </div>
          {canSend ? (
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="inline-flex size-9 items-center justify-center rounded-lg bg-accent-solid text-accent-contrast hover:opacity-90"
              title="Percakapan baru"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="max-h-[34rem] overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-6 text-body-sm text-fg-muted">Belum ada percakapan.</div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedId(thread.id)}
                className={`w-full border-b border-border p-4 text-left transition hover:bg-surface-muted ${selectedId === thread.id ? 'bg-surface-muted' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-fg">{thread.subject}</p>
                    <p className="mt-1 text-caption text-fg-subtle">
                      {thread.thread_kind === 'portal_inquiry' ? 'Permintaan masuk' : 'Investor'}
                      {thread.is_closed ? ' · Ditutup' : ''}
                    </p>
                    {thread.last_message_at ? (
                      <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                        {new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(thread.last_message_at))}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <p className="text-caption font-medium uppercase tracking-[0.12em] text-fg-subtle">Percakapan</p>
                <h2 className="mt-1 text-heading-sm font-semibold text-fg">{selected.subject}</h2>
              </div>
              <button type="button" onClick={() => router.refresh()} className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:bg-surface-muted" title="Refresh">
                <RefreshCw className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-[24rem] max-h-[32rem] space-y-3 overflow-y-auto p-4">
              {selectedMessages.length === 0 ? (
                <div className="flex min-h-[20rem] items-center justify-center text-body-sm text-fg-muted">Belum ada pesan.</div>
              ) : selectedMessages.map((message) => (
                <article key={message.id} className="rounded-xl border border-border bg-canvas p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-caption font-medium text-fg">{message.sender_label ?? 'Pengguna'}</p>
                    <time className="font-mono text-[11px] text-fg-subtle" dateTime={message.sent_at}>
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.sent_at))}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-body-sm leading-6 text-fg">{message.body_text}</p>
                </article>
              ))}
            </div>

            {canSend && !selected.is_closed ? (
              <div className="border-t border-border p-4">
                {error ? <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-body-sm text-danger">{error}</p> : null}
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Tulis balasan..."
                  rows={4}
                  maxLength={20000}
                  className="w-full rounded-lg border border-border bg-canvas p-3 text-body-sm text-fg outline-none focus:border-accent-solid focus:ring-2 focus:ring-accent-solid/20"
                />
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={submitMessage} disabled={pending || !body.trim()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-solid px-4 text-body-sm font-medium text-accent-contrast disabled:cursor-not-allowed disabled:opacity-50">
                    <Send className="size-4" aria-hidden="true" />
                    {pending ? 'Mengirim…' : 'Kirim pesan'}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex min-h-[34rem] items-center justify-center p-6 text-body-sm text-fg-muted">Pilih percakapan untuk melihat pesan.</div>
        )}
      </section>

      {newOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-heading-sm font-semibold text-fg">Percakapan baru</h2>
              <button type="button" onClick={() => setNewOpen(false)} className="text-body-sm text-fg-muted hover:text-fg">Tutup</button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-body-sm font-medium text-fg">
                Investor
                <select value={investorId} onChange={(event) => setInvestorId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-body-sm font-normal text-fg">
                  {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.legal_name}{investor.organization_name ? ` · ${investor.organization_name}` : ''} · {investor.reference_code}</option>)}
                </select>
              </label>
              <label className="block text-body-sm font-medium text-fg">
                Subjek
                <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} className="mt-2 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-body-sm font-normal text-fg" />
              </label>
              <label className="block text-body-sm font-medium text-fg">
                Pesan pertama
                <textarea value={newBody} onChange={(event) => setNewBody(event.target.value)} rows={5} maxLength={20000} className="mt-2 w-full rounded-lg border border-border bg-canvas p-3 text-body-sm font-normal text-fg" />
              </label>
              {error ? <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-body-sm text-danger">{error}</p> : null}
              <button type="button" onClick={submitThread} disabled={pending || !investorId || !subject.trim() || !newBody.trim()} className="h-10 w-full rounded-lg bg-accent-solid px-4 text-body-sm font-medium text-accent-contrast disabled:opacity-50">{pending ? 'Membuat…' : 'Buat percakapan'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
