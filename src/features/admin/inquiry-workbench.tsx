'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { convertInquiryToThread, updateInquiryStatus } from '@/server/messaging/admin-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useToast } from '@/ui/toast'

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

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'Baru',
  in_progress: 'Diproses',
  converted: 'Dikonversi',
  closed: 'Ditutup',
}

function formatReceivedAt(value: string, timezone: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }
}

export function InquiryWorkbench({
  inquiries,
  canHandle,
  timezone,
}: {
  inquiries: Inquiry[]
  canHandle: boolean
  timezone: string
}) {
  const router = useRouter()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [busyInquiryId, setBusyInquiryId] = useState<string | null>(null)

  function changeStatus(inquiryId: string, status: InquiryStatus) {
    if (pending) return
    setError(null)
    setBusyInquiryId(inquiryId)

    startTransition(async () => {
      const result = await updateInquiryStatus({ inquiryId, status })
      setBusyInquiryId(null)

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      push({
        tone: 'success',
        title: 'Status diperbarui',
        description: `Permintaan sekarang berstatus ${STATUS_LABELS[status]}.`,
      })
      router.refresh()
    })
  }

  function openConversation(inquiry: Inquiry) {
    if (pending) return

    if (inquiry.thread_id) {
      router.push(`/admin/messages?thread=${inquiry.thread_id}`)
      return
    }

    setError(null)
    setBusyInquiryId(inquiry.id)
    startTransition(async () => {
      const result = await convertInquiryToThread({ inquiryId: inquiry.id })
      setBusyInquiryId(null)

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      push({
        tone: 'success',
        title: 'Percakapan dibuat',
        description: 'Permintaan telah dikonversi menjadi percakapan investor.',
      })
      router.push(`/admin/messages?thread=${result.data.threadId}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert tone="danger" title="Operasi gagal">
          {error}
        </Alert>
      ) : null}

      <div className="border-border bg-surface rounded-2xl border p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-body text-fg font-semibold">Permintaan dari portal publik</h2>
            <p className="text-caption text-fg-muted mt-1">
              Tinjau permintaan yang masuk, ubah status, atau lanjutkan menjadi percakapan.
            </p>
          </div>
          <span className="border-border text-caption text-fg-subtle rounded-full border px-2.5 py-1">
            {inquiries.length} permintaan
          </span>
        </div>

        <div className="border-border mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[920px] text-left">
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
                inquiries.map((inquiry) => {
                  const busy = pending && busyInquiryId === inquiry.id
                  return (
                    <tr key={inquiry.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="text-body-sm text-fg font-medium">{inquiry.name}</p>
                        <p className="text-caption text-fg-muted mt-0.5">{inquiry.email}</p>
                        {inquiry.phone ? (
                          <p className="text-caption text-fg-subtle mt-0.5">{inquiry.phone}</p>
                        ) : null}
                        {inquiry.organization ? (
                          <p className="text-caption text-fg-subtle mt-0.5">{inquiry.organization}</p>
                        ) : null}
                      </td>
                      <td className="text-body-sm text-fg-muted max-w-lg px-4 py-4 align-top">
                        <p className="whitespace-pre-wrap line-clamp-4">{inquiry.message}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="border-border text-caption text-fg rounded-full border px-2.5 py-1">
                          {STATUS_LABELS[inquiry.status]}
                        </span>
                      </td>
                      <td className="text-caption text-fg-muted px-4 py-4 align-top">
                        {formatReceivedAt(inquiry.created_at, timezone)}
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        {canHandle ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              loading={busy}
                              disabled={pending && !busy}
                              onClick={() => openConversation(inquiry)}
                            >
                              {inquiry.thread_id ? 'Buka Percakapan' : 'Jadikan Percakapan'}
                            </Button>
                            <select
                              value={inquiry.status}
                              disabled={pending}
                              onChange={(event) =>
                                changeStatus(inquiry.id, event.target.value as InquiryStatus)
                              }
                              className="border-border bg-canvas text-caption h-9 rounded-lg border px-2"
                              aria-label={`Status permintaan ${inquiry.name}`}
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
                  )
                })
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
    </div>
  )
}
