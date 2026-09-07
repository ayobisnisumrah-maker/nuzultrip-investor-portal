'use client'

import { useMemo, useState, useTransition } from 'react'
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

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase('id-ID')
}

export function InquiryWorkbench({
  inquiries,
  canHandle,
  eligibleEmails,
  timezone,
}: {
  inquiries: Inquiry[]
  canHandle: boolean
  eligibleEmails: string[]
  timezone: string
}) {
  const router = useRouter()
  const { push } = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [busyInquiryId, setBusyInquiryId] = useState<string | null>(null)
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    inquiries[0]?.id ?? null,
  )

  const eligibleEmailSet = useMemo(
    () => new Set(eligibleEmails.map(normalizeEmail)),
    [eligibleEmails],
  )

  const selectedInquiry =
    inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? inquiries[0] ?? null

  function changeStatus(inquiryId: string, status: InquiryStatus) {
    if (pending || status === 'converted') return
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

    const linkedInvestor = eligibleEmailSet.has(normalizeEmail(inquiry.email))
    if (!linkedInvestor) {
      setError(
        'Permintaan ini belum terhubung ke akun investor aktif dengan email yang sama. Isi pesan tetap dapat dibaca dan status dapat diproses dari halaman ini.',
      )
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

  if (!inquiries.length) {
    return (
      <div className="border-border bg-surface rounded-2xl border p-8 text-center shadow-sm">
        <h2 className="text-body text-fg font-semibold">Belum ada permintaan masuk</h2>
        <p className="text-body-sm text-fg-muted mt-2">
          Permintaan dari formulir portal publik akan muncul di halaman ini.
        </p>
      </div>
    )
  }

  const selectedLinkedInvestor = selectedInquiry
    ? Boolean(selectedInquiry.thread_id) || eligibleEmailSet.has(normalizeEmail(selectedInquiry.email))
    : false
  const selectedBusy = Boolean(
    selectedInquiry && pending && busyInquiryId === selectedInquiry.id,
  )

  return (
    <div className="space-y-4">
      {error ? (
        <Alert tone="danger" title="Operasi gagal">
          {error}
        </Alert>
      ) : null}

      <div className="border-border bg-surface overflow-hidden rounded-2xl border shadow-sm">
        <div className="border-border flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-body text-fg font-semibold">Permintaan dari portal publik</h2>
            <p className="text-caption text-fg-muted mt-1">
              Pilih permintaan untuk membaca isi pesan lengkap dan melakukan tindak lanjut.
            </p>
          </div>
          <span className="border-border text-caption text-fg-subtle rounded-full border px-2.5 py-1">
            {inquiries.length} permintaan
          </span>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
          <aside className="border-border bg-surface-muted/35 border-b lg:border-r lg:border-b-0">
            <div className="max-h-[520px] overflow-y-auto">
              {inquiries.map((inquiry) => {
                const active = selectedInquiry?.id === inquiry.id
                const linkedInvestor =
                  Boolean(inquiry.thread_id) || eligibleEmailSet.has(normalizeEmail(inquiry.email))

                return (
                  <button
                    key={inquiry.id}
                    type="button"
                    onClick={() => {
                      setError(null)
                      setSelectedInquiryId(inquiry.id)
                    }}
                    className={`border-border block w-full border-b px-4 py-4 text-left transition-colors last:border-b-0 ${
                      active ? 'bg-canvas' : 'hover:bg-canvas/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-body-sm text-fg truncate font-semibold">{inquiry.name}</p>
                        <p className="text-caption text-fg-muted mt-0.5 truncate">{inquiry.email}</p>
                      </div>
                      <span className="border-border text-caption text-fg shrink-0 rounded-full border px-2 py-0.5">
                        {STATUS_LABELS[inquiry.status]}
                      </span>
                    </div>

                    <p className="text-body-sm text-fg-muted mt-3 line-clamp-2 whitespace-pre-wrap">
                      {inquiry.message}
                    </p>

                    <div className="text-caption text-fg-subtle mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span>{formatReceivedAt(inquiry.created_at, timezone)}</span>
                      <span>
                        {inquiry.thread_id
                          ? 'Percakapan aktif'
                          : linkedInvestor
                            ? 'Investor terhubung'
                            : 'Belum terhubung'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="min-w-0 p-4 sm:p-6">
            {selectedInquiry ? (
              <div className="mx-auto max-w-4xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-caption text-fg-subtle font-medium tracking-[0.1em] uppercase">
                      Detail Permintaan
                    </p>
                    <h3 className="text-heading-md text-fg mt-1 font-semibold">
                      {selectedInquiry.name}
                    </h3>
                    <p className="text-body-sm text-fg-muted mt-1 break-all">
                      {selectedInquiry.email}
                    </p>
                  </div>
                  <span className="border-border text-body-sm text-fg self-start rounded-full border px-3 py-1">
                    {STATUS_LABELS[selectedInquiry.status]}
                  </span>
                </div>

                <dl className="border-border bg-surface-muted/35 mt-5 grid gap-0 overflow-hidden rounded-xl border sm:grid-cols-2">
                  <div className="border-border border-b p-4 sm:border-r">
                    <dt className="text-caption text-fg-subtle">Nomor telepon</dt>
                    <dd className="text-body-sm text-fg mt-1 font-medium">
                      {selectedInquiry.phone || 'Tidak dicantumkan'}
                    </dd>
                  </div>
                  <div className="border-border border-b p-4">
                    <dt className="text-caption text-fg-subtle">Perusahaan / organisasi</dt>
                    <dd className="text-body-sm text-fg mt-1 font-medium">
                      {selectedInquiry.organization || 'Tidak dicantumkan'}
                    </dd>
                  </div>
                  <div className="border-border border-b p-4 sm:border-r sm:border-b-0">
                    <dt className="text-caption text-fg-subtle">Diterima</dt>
                    <dd className="text-body-sm text-fg mt-1 font-medium">
                      {formatReceivedAt(selectedInquiry.created_at, timezone)}
                    </dd>
                  </div>
                  <div className="p-4">
                    <dt className="text-caption text-fg-subtle">Koneksi investor</dt>
                    <dd className="text-body-sm text-fg mt-1 font-medium">
                      {selectedInquiry.thread_id
                        ? 'Sudah menjadi percakapan investor'
                        : selectedLinkedInvestor
                          ? 'Terhubung ke investor aktif'
                          : 'Belum terhubung ke investor aktif'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <p className="text-body-sm text-fg font-semibold">Isi pesan</p>
                  <div className="border-border bg-canvas text-body text-fg mt-2 min-h-40 rounded-xl border p-5 leading-7 whitespace-pre-wrap break-words">
                    {selectedInquiry.message}
                  </div>
                </div>

                {canHandle ? (
                  <div className="border-border mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-caption text-fg-subtle">Status tindak lanjut</span>
                      <select
                        value={selectedInquiry.status}
                        disabled={pending || selectedInquiry.status === 'converted'}
                        onChange={(event) =>
                          changeStatus(selectedInquiry.id, event.target.value as InquiryStatus)
                        }
                        className="border-border bg-canvas text-body-sm h-10 rounded-lg border px-3"
                        aria-label={`Status permintaan ${selectedInquiry.name}`}
                      >
                        <option value="new">Baru</option>
                        <option value="in_progress">Diproses</option>
                        <option value="converted" disabled>
                          Dikonversi
                        </option>
                        <option value="closed">Ditutup</option>
                      </select>
                    </div>

                    <Button
                      variant="primary"
                      loading={selectedBusy}
                      disabled={pending && !selectedBusy}
                      onClick={() => openConversation(selectedInquiry)}
                    >
                      {selectedInquiry.thread_id
                        ? 'Buka Percakapan'
                        : selectedLinkedInvestor
                          ? 'Jadikan Percakapan'
                          : 'Belum Terhubung ke Investor'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-caption text-fg-subtle mt-6">Akses baca saja.</p>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
