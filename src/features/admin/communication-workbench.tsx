'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { LiveMessageThread } from '@/features/messaging/live-message-thread'
import {
  createInvestorMessageThread,
  convertInquiryToThread,
  updateInquiryStatus,
} from '@/server/messaging/admin-actions'
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

function initials(label: string): string {
  return label
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
  inquiries?: Inquiry[]
  investors?: Investor[]
  canSend: boolean
  canHandle: boolean
  currentUserId: string
  timezone: string
}) {
  const router = useRouter()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [investorId, setInvestorId] = useState(investors?.[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedInvestor = investors?.find((investor) => investor.id === selectedThread?.investor_id)
  const filteredThreads = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    if (!query) return threads
    return threads.filter((thread) => {
      const investor = investors?.find((item) => item.id === thread.investor_id)
      return [thread.subject, investor?.legal_name, investor?.reference_code]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase('id-ID').includes(query))
    })
  }, [investors, search, threads])

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

  return (
    <div className="min-w-0 space-y-5">
      <div className="border-border bg-surface grid min-w-0 overflow-hidden rounded-2xl border shadow-sm lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="border-border min-w-0 border-b lg:border-r lg:border-b-0">
          <div className="border-border border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-body text-fg font-semibold">Percakapan</h2>
                <p className="text-caption text-fg-muted mt-0.5">{threads.length} percakapan investor</p>
              </div>
            </div>
            <label className="border-border bg-canvas mt-3 flex h-10 items-center gap-2 rounded-lg border px-3 focus-within:border-accent-solid">
              <Search className="text-fg-subtle size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Cari percakapan</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari investor atau subjek…"
                className="text-body-sm text-fg placeholder:text-fg-subtle min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
          </div>

          <div className="max-h-[18rem] overflow-y-auto p-2 lg:h-[min(70vh,44rem)] lg:max-h-none" data-testid="admin-conversation-list">
            {filteredThreads.length ? (
              filteredThreads.map((thread) => {
                const investor = investors?.find((item) => item.id === thread.investor_id)
                const investorName = investor?.legal_name ?? 'Investor'
                const active = selectedThread?.id === thread.id
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => router.push(`/admin/messages?thread=${thread.id}`)}
                    className={`mb-1 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-accent-solid/40 bg-accent-soft'
                        : 'border-transparent hover:border-border hover:bg-surface-muted'
                    }`}
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${active ? 'bg-accent-solid text-on-accent' : 'bg-surface-muted text-fg-muted'}`}>
                      {initials(investorName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <strong className="text-body-sm text-fg truncate font-semibold">{investorName}</strong>
                        {thread.last_message_at ? (
                          <time className="text-caption text-fg-subtle shrink-0">
                            {new Intl.DateTimeFormat('id-ID', {
                              timeZone: timezone,
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(thread.last_message_at))}
                          </time>
                        ) : null}
                      </span>
                      <span className="text-caption text-fg-muted mt-0.5 block truncate">{thread.subject}</span>
                      <span className="text-caption text-fg-subtle mt-1 block truncate">
                        {thread.is_closed ? 'Percakapan ditutup' : investor?.reference_code ?? 'Belum ada pesan'}
                      </span>
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="text-body-sm text-fg-muted px-3 py-8 text-center">Tidak ada percakapan yang cocok.</p>
            )}
          </div>

          {canSend ? (
            <details className="border-border border-t p-4">
              <summary className="text-body-sm text-fg cursor-pointer font-semibold">Buat percakapan baru</summary>
              <div className="mt-4 space-y-3">
                {investors?.length ? (
                  <select value={investorId} onChange={(event) => setInvestorId(event.target.value)} className="border-border bg-canvas text-body-sm h-10 w-full rounded-lg border px-3">
                    <option value="">Pilih investor</option>
                    {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.legal_name} · {investor.reference_code}</option>)}
                  </select>
                ) : <p className="text-caption text-fg-subtle">Belum ada investor yang dapat dipilih.</p>}
                <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subjek" maxLength={200} className="border-border bg-canvas text-body-sm h-10 w-full rounded-lg border px-3" />
                <textarea value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} placeholder="Pesan pertama" rows={3} maxLength={20000} className="border-border bg-canvas text-body-sm w-full resize-none rounded-lg border px-3 py-2" />
                <Button disabled={pending || !investorId || !subject.trim() || !firstMessage.trim()} onClick={() => run(() => createInvestorMessageThread({ investorId, subject, body: firstMessage }), 'Percakapan dibuat.')}>Buat & Kirim</Button>
              </div>
            </details>
          ) : null}
        </aside>

        <section className="min-w-0">
          {selectedThread ? (
            <>
              <div className="border-border bg-surface flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-body-sm text-fg truncate font-semibold">{selectedThread.subject}</p>
                  <p className="text-caption text-fg-muted mt-0.5 truncate">
                    {selectedInvestor ? `${selectedInvestor.legal_name} · ${selectedInvestor.reference_code}` : 'Investor'}
                  </p>
                </div>
                {selectedThread.is_closed ? <span className="border-border text-caption text-fg-subtle rounded-full border px-2.5 py-1">Ditutup</span> : null}
              </div>
              <LiveMessageThread
                key={selectedThread.id}
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
            <div className="flex h-[min(70vh,44rem)] min-h-[32rem] items-center justify-center p-6 text-center">
              <div>
                <h2 className="text-body text-fg font-semibold">Pilih percakapan</h2>
                <p className="text-body-sm text-fg-muted mt-1">Pilih investor di panel kiri untuk membaca dan membalas pesan.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {inquiries ? (
        <div className="border-border bg-surface rounded-xl border p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-body text-fg font-semibold">Permintaan masuk</h2>
              <p className="text-caption text-fg-muted mt-1">Tindak lanjuti inquiry dan konversi menjadi percakapan.</p>
            </div>
            <span className="border-border text-caption text-fg-subtle rounded-full border px-2.5 py-1">{inquiries.length} permintaan</span>
          </div>
          <div className="border-border mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-border bg-surface-muted border-b">
                <tr className="text-caption text-fg-subtle">
                  <th className="px-4 py-3">Pengirim</th><th className="px-4 py-3">Pesan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Diterima</th><th className="px-4 py-3 text-right">Aksi</th>
                </tr>
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
