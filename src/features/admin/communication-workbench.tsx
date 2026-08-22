'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  createInvestorMessageThread,
  convertInquiryToThread,
  sendAdminMessage,
  updateInquiryStatus,
} from '@/server/messaging/admin-actions'
import type { ActionResult } from '@/server/auth/guards'
import { Button } from '@/ui/button'
import { Alert } from '@/ui/alert'
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

export function CommunicationWorkbench({
  threads,
  selectedThread,
  messages,
  inquiries,
  investors,
  canSend,
  canHandle,
}: {
  threads: Thread[]
  selectedThread: Thread | null
  messages: Message[]
  inquiries?: Inquiry[]
  investors?: Investor[]
  canSend: boolean
  canHandle: boolean
}) {
  const router = useRouter()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState('')
  const [investorId, setInvestorId] = useState(investors?.[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

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
    <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="border-border bg-surface rounded-xl border p-4">
          <h2 className="text-body text-fg font-semibold">Percakapan</h2>
          <p className="text-caption text-fg-muted mt-1">
            Thread tersimpan di database dan mengikuti RLS.
          </p>
          <div className="mt-4 space-y-2">
            {threads.length ? (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => router.push(`/admin/messages?thread=${thread.id}`)}
                  className={`hover:bg-surface-muted w-full rounded-lg border p-3 text-left transition ${selectedThread?.id === thread.id ? 'border-accent-solid bg-surface-muted' : 'border-border'}`}
                >
                  <p className="text-body-sm text-fg truncate font-medium">{thread.subject}</p>
                  <p className="text-fg-subtle mt-1 font-mono text-[11px]">
                    {thread.investor_id ?? thread.thread_kind}
                  </p>
                  <p className="text-caption text-fg-subtle mt-1">
                    {thread.last_message_at
                      ? new Date(thread.last_message_at).toLocaleString('id-ID')
                      : 'Belum ada pesan'}
                  </p>
                </button>
              ))
            ) : (
              <p className="text-body-sm text-fg-muted">Belum ada percakapan.</p>
            )}
          </div>
        </div>

        {canSend ? (
          <div className="border-border bg-surface rounded-xl border p-4">
            <h2 className="text-body text-fg font-semibold">Buat percakapan</h2>
            <div className="mt-3 space-y-3">
              {investors?.length ? (
                <select
                  value={investorId}
                  onChange={(event) => setInvestorId(event.target.value)}
                  className="border-border bg-canvas text-body-sm h-10 w-full rounded-lg border px-3"
                >
                  <option value="">Pilih investor</option>
                  {investors.map((investor) => (
                    <option key={investor.id} value={investor.id}>
                      {investor.legal_name} · {investor.reference_code}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-caption text-fg-subtle">
                  Belum ada investor yang dapat dipilih.
                </p>
              )}
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Subjek"
                maxLength={200}
                className="border-border bg-canvas text-body-sm h-10 w-full rounded-lg border px-3"
              />
              <textarea
                value={firstMessage}
                onChange={(event) => setFirstMessage(event.target.value)}
                placeholder="Pesan pertama"
                rows={4}
                maxLength={20000}
                className="border-border bg-canvas text-body-sm w-full rounded-lg border px-3 py-2"
              />
              <Button
                disabled={pending || !investorId || !subject.trim() || !firstMessage.trim()}
                onClick={() =>
                  run(
                    () => createInvestorMessageThread({ investorId, subject, body: firstMessage }),
                    'Percakapan dibuat.',
                  )
                }
              >
                Buat & Kirim
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-border bg-surface rounded-xl border p-5">
        {selectedThread ? (
          <>
            <div className="border-border border-b pb-4">
              <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
                Percakapan
              </p>
              <h2 className="text-heading-md text-fg mt-1 font-semibold">
                {selectedThread.subject}
              </h2>
              <p className="text-caption text-fg-subtle mt-1 font-mono">{selectedThread.id}</p>
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto py-5">
              {messages.length ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="border-border bg-surface-muted rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-body-sm text-fg font-medium">
                        {message.sender_label ?? (message.sender_id ? 'Admin' : 'Pengirim')}
                      </span>
                      <span className="text-caption text-fg-subtle">
                        {new Date(message.sent_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-body-sm text-fg-muted mt-2 whitespace-pre-wrap">
                      {message.body_text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-body-sm text-fg-muted">Belum ada pesan.</p>
              )}
            </div>
            {selectedThread.is_closed ? (
              <Alert tone="info" title="Percakapan ditutup">
                Percakapan ini tidak menerima balasan baru.
              </Alert>
            ) : canSend ? (
              <div className="border-border border-t pt-4">
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Tulis balasan..."
                  rows={5}
                  maxLength={20000}
                  className="border-border bg-canvas text-body-sm w-full rounded-lg border px-3 py-2"
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    disabled={pending || !body.trim()}
                    onClick={() =>
                      run(
                        () => sendAdminMessage({ threadId: selectedThread.id, body }),
                        'Pesan terkirim.',
                      )
                    }
                  >
                    Kirim
                  </Button>
                </div>
              </div>
            ) : (
              <Alert tone="info" title="Mode baca">
                Peran Anda dapat membaca percakapan tetapi tidak memiliki izin untuk mengirim pesan.
              </Alert>
            )}
          </>
        ) : (
          <div className="flex min-h-[32rem] items-center justify-center text-center">
            <div>
              <h2 className="text-body text-fg font-semibold">Pilih percakapan</h2>
              <p className="text-body-sm text-fg-muted mt-1">
                Pilih thread untuk membaca dan membalas pesan.
              </p>
            </div>
          </div>
        )}
      </div>

      {inquiries ? (
        <div className="border-border bg-surface rounded-xl border p-5 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-body text-fg font-semibold">Permintaan masuk</h2>
              <p className="text-caption text-fg-muted mt-1">
                Setiap inquiry dapat ditindaklanjuti, dikonversi menjadi thread, lalu dibuka
                langsung dari inbox.
              </p>
            </div>
            <span className="border-border text-caption text-fg-subtle rounded-full border px-2.5 py-1">
              {inquiries.length} permintaan
            </span>
          </div>
          <div className="border-border mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-border bg-surface-muted border-b">
                <tr className="text-caption text-fg-subtle">
                  <th className="px-4 py-3">Pengirim</th>
                  <th className="px-4 py-3">Pesan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Diterima</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {inquiries.length ? (
                  inquiries.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td className="px-4 py-4">
                        <p className="text-body-sm text-fg font-medium">{inquiry.name}</p>
                        <p className="text-caption text-fg-muted">
                          {inquiry.email}
                          {inquiry.organization ? ` · ${inquiry.organization}` : ''}
                        </p>
                      </td>
                      <td className="text-body-sm text-fg-muted max-w-md px-4 py-4">
                        <p className="line-clamp-2">{inquiry.message}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="border-border text-caption text-fg rounded-full border px-2.5 py-1">
                          {inquiry.status}
                        </span>
                      </td>
                      <td className="text-caption text-fg-muted px-4 py-4">
                        {new Date(inquiry.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {canHandle ? (
                          <div className="flex justify-end gap-2">
                            {inquiry.thread_id ? (
                              <Button
                                variant="secondary"
                                disabled={pending}
                                onClick={() =>
                                  router.push(`/admin/messages?thread=${inquiry.thread_id}`)
                                }
                              >
                                Buka Percakapan
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                disabled={pending}
                                onClick={() =>
                                  run(
                                    () => convertInquiryToThread({ inquiryId: inquiry.id }),
                                    'Permintaan dikonversi menjadi percakapan.',
                                  )
                                }
                              >
                                Buka Percakapan
                              </Button>
                            )}
                            <select
                              value={inquiry.status}
                              disabled={pending}
                              onChange={(event) =>
                                run(
                                  () =>
                                    updateInquiryStatus({
                                      inquiryId: inquiry.id,
                                      status: event.target.value as InquiryStatus,
                                    }),
                                  'Status permintaan diperbarui.',
                                )
                              }
                              className="border-border bg-canvas text-caption h-9 rounded-lg border px-2"
                            >
                              <option value="new">Baru</option>
                              <option value="in_progress">Diproses</option>
                              <option value="converted">Dikonversi</option>
                              <option value="closed">Ditutup</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-caption text-fg-subtle">Baca saja</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-body-sm text-fg-muted px-4 py-10 text-center">
                      Belum ada permintaan masuk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="xl:col-span-2">
          <Alert tone="danger" title="Operasi gagal">
            {error}
          </Alert>
        </div>
      ) : null}
    </div>
  )
}
