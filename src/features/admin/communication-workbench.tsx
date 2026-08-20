'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createInvestorMessageThread, sendAdminMessage, convertInquiryToThread, updateInquiryStatus } from '@/server/messaging/admin-actions'
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

type Inquiry = {
  id: string
  name: string
  email: string
  phone: string | null
  organization: string | null
  message: string
  status: string
  thread_id: string | null
  created_at: string
}

export function CommunicationWorkbench({
  threads,
  selectedThread,
  messages,
  inquiries,
}: {
  threads: Thread[]
  selectedThread: Thread | null
  messages: Message[]
  inquiries?: Inquiry[]
}) {
  const router = useRouter()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState('')
  const [investorId, setInvestorId] = useState('')
  const [subject, setSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ ok: boolean; data?: any; error?: { message: string } }>, success: string) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error?.message ?? 'Operasi gagal.')
        return
      }
      push({ tone: 'success', title: 'Berhasil', description: success })
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-fg">Percakapan</h2>
          <p className="mt-1 text-caption text-fg-muted">Thread tersimpan di database dan mengikuti RLS.</p>
          <div className="mt-4 space-y-2">
            {threads.length ? threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => router.push(`/admin/messages?thread=${thread.id}`)}
                className={`w-full rounded-lg border p-3 text-left transition hover:bg-surface-muted ${selectedThread?.id === thread.id ? 'border-accent-solid bg-surface-muted' : 'border-border'}`}
              >
                <p className="truncate text-body-sm font-medium text-fg">{thread.subject}</p>
                <p className="mt-1 font-mono text-[11px] text-fg-subtle">{thread.investor_id ?? thread.thread_kind}</p>
                <p className="mt-1 text-caption text-fg-subtle">{thread.last_message_at ? new Date(thread.last_message_at).toLocaleString('id-ID') : 'Belum ada pesan'}</p>
              </button>
            )) : <p className="text-body-sm text-fg-muted">Belum ada percakapan.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-fg">Buat percakapan</h2>
          <div className="mt-3 space-y-3">
            <input value={investorId} onChange={(e) => setInvestorId(e.target.value)} placeholder="Investor UUID" className="h-10 w-full rounded-lg border border-border bg-canvas px-3 text-body-sm" />
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subjek" className="h-10 w-full rounded-lg border border-border bg-canvas px-3 text-body-sm" />
            <textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} placeholder="Pesan pertama" rows={4} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-body-sm" />
            <Button disabled={pending} onClick={() => run(() => createInvestorMessageThread({ investorId, subject, body: firstMessage }), 'Percakapan dibuat.')}>Buat & Kirim</Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        {selectedThread ? (
          <>
            <div className="border-b border-border pb-4">
              <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">Percakapan</p>
              <h2 className="mt-1 text-heading-md font-semibold text-fg">{selectedThread.subject}</h2>
              <p className="mt-1 font-mono text-caption text-fg-subtle">{selectedThread.id}</p>
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto py-5">
              {messages.length ? messages.map((message) => (
                <div key={message.id} className="rounded-lg border border-border bg-surface-muted p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body-sm font-medium text-fg">{message.sender_label ?? (message.sender_id ? 'Admin' : 'Pengirim')}</span>
                    <span className="text-caption text-fg-subtle">{new Date(message.sent_at).toLocaleString('id-ID')}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-body-sm text-fg-muted">{message.body_text}</p>
                </div>
              )) : <p className="text-body-sm text-fg-muted">Belum ada pesan.</p>}
            </div>
            {selectedThread.is_closed ? (
              <Alert tone="info" title="Percakapan ditutup">Percakapan ini tidak menerima balasan baru.</Alert>
            ) : (
              <div className="border-t border-border pt-4">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tulis balasan..." rows={5} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-body-sm" />
                <div className="mt-3 flex justify-end"><Button disabled={pending || !body.trim()} onClick={() => run(() => sendAdminMessage({ threadId: selectedThread.id, body }), 'Pesan terkirim.')}>Kirim</Button></div>
              </div>
            )}
          </>
        ) : <div className="flex min-h-[32rem] items-center justify-center text-center"><div><h2 className="text-body font-semibold text-fg">Pilih percakapan</h2><p className="mt-1 text-body-sm text-fg-muted">Pilih thread untuk membaca dan membalas pesan.</p></div></div>}
      </div>

      {inquiries ? (
        <div className="xl:col-span-2 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-body font-semibold text-fg">Permintaan masuk</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-border bg-surface-muted"><tr className="text-caption text-fg-subtle"><th className="px-4 py-3">Pengirim</th><th className="px-4 py-3">Pesan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Diterima</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-border">
                {inquiries.map((inquiry) => <tr key={inquiry.id}>
                  <td className="px-4 py-4"><p className="text-body-sm font-medium text-fg">{inquiry.name}</p><p className="text-caption text-fg-muted">{inquiry.email}{inquiry.organization ? ` · ${inquiry.organization}` : ''}</p></td>
                  <td className="max-w-md px-4 py-4 text-body-sm text-fg-muted"><p className="line-clamp-2">{inquiry.message}</p></td>
                  <td className="px-4 py-4"><span className="rounded-full border border-border px-2.5 py-1 text-caption text-fg">{inquiry.status}</span></td>
                  <td className="px-4 py-4 text-caption text-fg-muted">{new Date(inquiry.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-4 text-right"><div className="flex justify-end gap-2">{!inquiry.thread_id ? <Button variant="secondary" disabled={pending} onClick={() => run(() => convertInquiryToThread({ inquiryId: inquiry.id }), 'Permintaan dikonversi menjadi percakapan.')}>Buka Percakapan</Button> : null}<select value={inquiry.status} disabled={pending} onChange={(e) => run(() => updateInquiryStatus({ inquiryId: inquiry.id, status: e.target.value as any }), 'Status permintaan diperbarui.')} className="h-9 rounded-lg border border-border bg-canvas px-2 text-caption"><option value="new">Baru</option><option value="in_progress">Diproses</option><option value="converted">Dikonversi</option><option value="closed">Ditutup</option></select></div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {error ? <div className="xl:col-span-2"><Alert tone="danger" title="Operasi gagal">{error}</Alert></div> : null}
    </div>
  )
}
