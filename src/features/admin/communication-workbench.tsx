'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircleMore, Plus, Search } from 'lucide-react'

import { topics } from '@/core/realtime/events'
import { LiveMessageThread } from '@/features/messaging/live-message-thread'
import { useRealtime } from '@/features/realtime/realtime-provider'
import {
  createInvestorMessageThread,
  convertInquiryToThread,
  updateInquiryStatus,
} from '@/server/messaging/admin-actions'
import { markThreadRead } from '@/server/messaging/read-actions'
import type { ActionResult } from '@/server/auth/guards'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

type Thread = {
  id: string
  subject: string
  thread_kind: string
  investor_id: string | null
  last_message_at: string | null
  is_closed: boolean
}

type Message = {
  id: string
  body_text: string
  sender_label: string | null
  sender_id: string | null
  sent_at: string
}

type Investor = {
  id: string
  legal_name: string
  organization_name: string | null
  reference_code: string
}

type InquiryStatus = 'new' | 'in_progress' | 'converted' | 'closed'

type Inquiry = {
  id: string
  name: string
  email: string
  phone: string | null
  organization: string | null
  message: string
  status: InquiryStatus
  thread_id: string | null
  created_at: string
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'IN'
}

export function CommunicationWorkbench({
  threads,
  selectedThread,
  messages,
  unreadByThread,
  inquiries,
  investors,
  canSend,
  canHandle,
  currentUserId,
  timezone,
}: {
  threads: Thread[]
  selectedThread: Thread | null
  messages: Message[]
  unreadByThread: Record<string, number>
  inquiries?: Inquiry[]
  investors?: Investor[]
  canSend: boolean
  canHandle: boolean
  currentUserId: string
  timezone: string
}) {
  const router = useRouter()
  const realtime = useRealtime()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [investorId, setInvestorId] = useState(investors?.[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [optimisticallyReadThread, setOptimisticallyReadThread] = useState<string | null>(null)

  const selectedInvestor = investors?.find((investor) => investor.id === selectedThread?.investor_id)
  const filteredThreads = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    if (!query) return threads

    return threads.filter((thread) => {
      const investor = investors?.find((item) => item.id === thread.investor_id)
      return [thread.subject, investor?.legal_name, investor?.organization_name, investor?.reference_code]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('id-ID').includes(query))
    })
  }, [investors, search, threads])

  const effectiveUnreadByThread = useMemo(() => {
    if (!optimisticallyReadThread) return unreadByThread
    return { ...unreadByThread, [optimisticallyReadThread]: 0 }
  }, [optimisticallyReadThread, unreadByThread])

  const totalUnread = Object.values(effectiveUnreadByThread).reduce((sum, count) => sum + count, 0)

  useEffect(() => {
    const unsubscribe = realtime.subscribe(topics.admin(), (event) => {
      if (event.kind === 'message.received' || event.kind === 'inquiry.received') {
        router.refresh()
      }
    })
    return unsubscribe
  }, [realtime, router])

  useEffect(() => {
    if (realtime.resumeToken > 0) router.refresh()
  }, [realtime.resumeToken, router])

  useEffect(() => {
    const threadId = selectedThread?.id
    if (!threadId || !unreadByThread[threadId] || document.visibilityState !== 'visible') return

    setOptimisticallyReadThread(threadId)
    void markThreadRead({ threadId }).then((result) => {
      if (result.ok) {
        router.refresh()
      } else {
        setOptimisticallyReadThread(null)
      }
    })
  }, [router, selectedThread?.id, unreadByThread])

  useEffect(() => {
    if (optimisticallyReadThread && (unreadByThread[optimisticallyReadThread] ?? 0) === 0) {
      setOptimisticallyReadThread(null)
    }
  }, [optimisticallyReadThread, unreadByThread])

  function run(action: () => Promise<ActionResult<unknown>>, success: string) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      push({ tone: 'success', title: 'Berhasil', description: success })
      router.refresh()
    })
  }

  const selectedLastMessageId = messages.at(-1)?.id ?? 'empty'

  return (
    <div className="min-w-0 space-y-5">
      <div className="border-border bg-surface grid min-w-0 overflow-hidden rounded-2xl border shadow-sm lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="border-border min-w-0 border-b lg:border-r lg:border-b-0">
          <div className="border-border border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-body text-fg font-semibold">Pesan Investor</h2>
                <p className="text-caption text-fg-muted mt-0.5">
                  {totalUnread ? `${totalUnread} pesan belum dibaca` : `${threads.length} percakapan`}
                </p>
              </div>
              {canSend ? (
                <button
                  type="button"
                  onClick={() => document.getElementById('new-investor-conversation')?.showPopover?.()}
                  className="border-border text-fg-muted hover:bg-surface-muted hover:text-fg inline-flex size-9 items-center justify-center rounded-lg border transition"
                  aria-label="Buat percakapan baru"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <label className="border-border bg-canvas focus-within:border-accent-solid mt-3 flex h-10 items-center gap-2 rounded-lg border px-3 transition">
              <Search className="text-fg-subtle size-4 shrink-0" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari investor atau percakapan"
                className="text-body-sm text-fg placeholder:text-fg-subtle min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
          </div>

          <div className="max-h-[24rem] overflow-y-auto lg:h-[min(72vh,49rem)] lg:max-h-none">
            {filteredThreads.length ? (
              <div className="divide-border divide-y">
                {filteredThreads.map((thread) => {
                  const investor = investors?.find((item) => item.id === thread.investor_id)
                  const investorName = investor?.legal_name ?? 'Investor'
                  const active = selectedThread?.id === thread.id
                  const unread = effectiveUnreadByThread[thread.id] ?? 0

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => router.push(`/admin/messages?thread=${thread.id}`)}
                      className={`w-full px-4 py-3.5 text-left transition ${active ? 'bg-accent-soft' : 'hover:bg-surface-muted'}`}
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-accent-solid text-on-accent' : 'bg-surface-muted text-fg-muted'}`}>
                          {initials(investorName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <p className={`text-body-sm text-fg truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{investorName}</p>
                            <span className="text-caption text-fg-subtle shrink-0">
                              {thread.last_message_at
                                ? new Intl.DateTimeFormat('id-ID', { timeZone: timezone, day: '2-digit', month: 'short' }).format(new Date(thread.last_message_at))
                                : ''}
                            </span>
                          </div>
                          <p className={`text-caption mt-0.5 truncate ${unread ? 'text-fg font-medium' : 'text-fg-muted'}`}>{thread.subject}</p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-caption text-fg-subtle truncate">{investor?.reference_code ?? 'Percakapan investor'}</p>
                            <div className="flex items-center gap-2">
                              {unread ? (
                                <span className="bg-accent-solid text-on-accent inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold">
                                  {unread > 99 ? '99+' : unread}
                                </span>
                              ) : null}
                              {thread.is_closed ? (
                                <span className="border-border text-caption text-fg-subtle shrink-0 rounded-full border px-1.5 py-0.5">Ditutup</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <MessageCircleMore className="text-fg-subtle mx-auto size-6" aria-hidden="true" />
                <p className="text-body-sm text-fg-muted mt-2">{search ? 'Percakapan tidak ditemukan.' : 'Belum ada percakapan.'}</p>
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {selectedThread ? (
            <>
              <div className="border-border flex min-w-0 items-center gap-3 border-b px-4 py-3.5 sm:px-5">
                <div className="bg-accent-soft text-accent-solid flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {initials(selectedInvestor?.legal_name ?? 'Investor')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="text-body text-fg truncate font-semibold">{selectedInvestor?.legal_name ?? 'Investor'}</h2>
                    {selectedThread.is_closed ? <span className="border-border text-caption text-fg-subtle shrink-0 rounded-full border px-2 py-0.5">Ditutup</span> : null}
                  </div>
                  <p className="text-caption text-fg-muted mt-0.5 truncate">
                    {selectedThread.subject}{selectedInvestor?.reference_code ? ` · ${selectedInvestor.reference_code}` : ''}
                  </p>
                </div>
              </div>

              <LiveMessageThread
                key={`${selectedThread.id}:${selectedLastMessageId}`}
                threadId={selectedThread.id}
                initialMessages={messages}
                currentUserId={currentUserId}
                actor="admin"
                timezone={timezone}
                canSend={canSend}
                isClosed={selectedThread.is_closed}
                counterpartLabel={selectedInvestor?.legal_name ?? 'Investor'}
              />
            </>
          ) : (
            <div className="flex min-h-[34rem] items-center justify-center p-6 text-center lg:min-h-[min(72vh,49rem)]">
              <div className="max-w-sm">
                <div className="bg-surface-muted text-fg-muted mx-auto flex size-12 items-center justify-center rounded-full"><MessageCircleMore className="size-5" aria-hidden="true" /></div>
                <h2 className="text-body text-fg mt-3 font-semibold">Pilih percakapan</h2>
                <p className="text-body-sm text-fg-muted mt-1">Pilih investor di sebelah kiri untuk membaca riwayat dan mengirim pesan teks.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {canSend ? (
        <div id="new-investor-conversation" popover="auto" className="border-border bg-surface m-auto w-[min(92vw,34rem)] rounded-2xl border p-0 shadow-xl backdrop:bg-black/30">
          <div className="border-border border-b px-5 py-4">
            <h2 className="text-body text-fg font-semibold">Percakapan baru</h2>
            <p className="text-caption text-fg-muted mt-1">Pilih investor dan kirim pesan pertama.</p>
          </div>
          <div className="space-y-3 p-5">
            {investors?.length ? (
              <select value={investorId} onChange={(event) => setInvestorId(event.target.value)} className="border-border bg-canvas text-body-sm h-10 w-full rounded-lg border px-3">
                <option value="">Pilih investor</option>
                {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.legal_name} · {investor.reference_code}</option>)}
              </select>
            ) : <p className="text-caption text-fg-subtle">Belum ada investor yang dapat dipilih.</p>}
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subjek percakapan" maxLength={200} className="border-border bg-canvas text-body-sm h-10 w-full rounded-lg border px-3" />
            <textarea value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} placeholder="Tulis pesan pertama…" rows={5} maxLength={20000} className="border-border bg-canvas text-body-sm w-full resize-none rounded-lg border px-3 py-2" />
            <p className="text-caption text-fg-subtle">Pesan hanya berupa teks. Tidak ada pengiriman gambar atau file.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" popoverTarget="new-investor-conversation" popoverTargetAction="hide" className="border-border text-body-sm text-fg hover:bg-surface-muted h-9 rounded-lg border px-3 font-medium transition">Batal</button>
              <Button disabled={pending || !investorId || !subject.trim() || !firstMessage.trim()} onClick={() => run(() => createInvestorMessageThread({ investorId, subject, body: firstMessage }), 'Percakapan dibuat.')}>Buat & Kirim</Button>
            </div>
          </div>
        </div>
      ) : null}

      {inquiries ? (
        <div className="border-border bg-surface rounded-2xl border p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-body text-fg font-semibold">Permintaan masuk</h2>
              <p className="text-caption text-fg-muted mt-1">Tindak lanjuti inquiry dan konversi menjadi percakapan.</p>
            </div>
            <span className="border-border text-caption text-fg-subtle rounded-full border px-2.5 py-1">{inquiries.length} permintaan</span>
          </div>
          <div className="border-border mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-border bg-surface-muted border-b">
                <tr className="text-caption text-fg-subtle"><th className="px-4 py-3">Pengirim</th><th className="px-4 py-3">Pesan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Diterima</th><th className="px-4 py-3 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-border divide-y">
                {inquiries.length ? inquiries.map((inquiry) => (
                  <tr key={inquiry.id}>
                    <td className="px-4 py-4"><p className="text-body-sm text-fg font-medium">{inquiry.name}</p><p className="text-caption text-fg-muted">{inquiry.email}{inquiry.organization ? ` · ${inquiry.organization}` : ''}</p></td>
                    <td className="text-body-sm text-fg-muted max-w-md px-4 py-4"><p className="line-clamp-2">{inquiry.message}</p></td>
                    <td className="px-4 py-4"><span className="border-border text-caption text-fg rounded-full border px-2.5 py-1">{inquiry.status}</span></td>
                    <td className="text-caption text-fg-muted px-4 py-4">{new Intl.DateTimeFormat('id-ID', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(inquiry.created_at))}</td>
                    <td className="px-4 py-4 text-right">
                      {canHandle ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" disabled={pending} onClick={() => inquiry.thread_id ? router.push(`/admin/messages?thread=${inquiry.thread_id}`) : run(() => convertInquiryToThread({ inquiryId: inquiry.id }), 'Permintaan dikonversi menjadi percakapan.')}>Buka Percakapan</Button>
                          <select value={inquiry.status} disabled={pending} onChange={(event) => run(() => updateInquiryStatus({ inquiryId: inquiry.id, status: event.target.value as InquiryStatus }), 'Status permintaan diperbarui.')} className="border-border bg-canvas text-caption h-9 rounded-lg border px-2">
                            <option value="new">Baru</option><option value="in_progress">Diproses</option><option value="converted">Dikonversi</option><option value="closed">Ditutup</option>
                          </select>
                        </div>
                      ) : <span className="text-caption text-fg-subtle">Baca saja</span>}
                    </td>
                  </tr>
                )) : <tr><td colSpan={5} className="text-body-sm text-fg-muted px-4 py-10 text-center">Belum ada permintaan masuk.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {error ? <Alert tone="danger" title="Operasi gagal">{error}</Alert> : null}
    </div>
  )
}
