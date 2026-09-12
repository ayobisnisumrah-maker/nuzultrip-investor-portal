'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  issueFinanceInvoice,
  reconcileFinancePayment,
  recordFinancePayment,
  updateFinanceInvoiceDueDate,
} from '@/server/financials/operation-actions'
import { updateFinanceInvoiceDeparture } from '@/server/financials/policy-actions'
import { requestFinanceRefund } from '@/server/financials/refund-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'

type PendingPayment = {
  id: string
  reference: string
  amount: number
  method: string
  receivedAt: string
  externalReference: string | null
}

type UploadResponse = {
  ok?: boolean
  error?: string
  asset?: { id?: string }
}

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function FinanceInvoiceActions({
  invoiceId,
  status,
  outstanding,
  refundable,
  refundPolicyNote,
  currentDueOn,
  currentDepartureOn,
  pendingPayments,
}: {
  invoiceId: string
  status: string
  outstanding: number
  refundable: number
  refundPolicyNote?: string | null
  currentDueOn: string | null
  currentDepartureOn: string | null
  pendingPayments: PendingPayment[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (task: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
    setError(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok) setError(result.error?.message ?? 'Terjadi kesalahan pada sistem.')
      else router.refresh()
    })
  }

  const reconcile = (form: HTMLFormElement, payment: PendingPayment) => {
    const fields = new FormData(form)
    const proof = fields.get('proof')
    const receivedAt = String(fields.get('bankReceivedAt') ?? '')
    const parsedReceivedAt = new Date(receivedAt)

    if (!(proof instanceof File) || proof.size <= 0) {
      setError('Bukti pembayaran wajib dipilih sebelum rekonsiliasi.')
      return
    }
    if (Number.isNaN(parsedReceivedAt.getTime())) {
      setError('Waktu penerimaan dana dari bank tidak valid.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const upload = new FormData()
        upload.set('file', proof)
        upload.set('purpose', 'payment-proof')
        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: upload,
        })
        const payload = (await response.json()) as UploadResponse
        const proofAssetId = payload.asset?.id

        if (!response.ok || !payload.ok || !proofAssetId) {
          setError(payload.error ?? 'Bukti pembayaran tidak dapat diunggah.')
          return
        }

        const result = await reconcileFinancePayment({
          paymentId: payment.id,
          proofAssetId,
          bankReference: String(fields.get('bankReference') ?? ''),
          bankAmount: payment.amount,
          bankReceivedAt: parsedReceivedAt.toISOString(),
          notes: String(fields.get('notes') ?? ''),
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        form.reset()
        router.refresh()
      } catch {
        setError('Rekonsiliasi pembayaran tidak dapat diproses. Silakan coba lagi.')
      }
    })
  }

  const canManageDueDate = ['draft', 'issued', 'partially_paid'].includes(status)
  const canManageDeparture = status !== 'void'

  return (
    <div className="grid gap-4 print:hidden">
      {error ? (
        <Alert tone="danger" title="Tidak dapat diproses">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            window.open(`/print/invoices/${invoiceId}`, '_blank', 'noopener,noreferrer')
          }}
        >
          Cetak / Simpan PDF
        </Button>
        {status === 'draft' ? (
          <Button loading={pending} onClick={() => run(() => issueFinanceInvoice({ invoiceId }))}>
            Terbitkan invoice
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {canManageDueDate ? (
          <form
            className="border-border grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              run(() =>
                updateFinanceInvoiceDueDate({
                  invoiceId,
                  dueOn: String(f.get('dueOn')),
                }),
              )
            }}
          >
            <label className="text-body-sm grid gap-1">
              <span>Batas pelunasan</span>
              <Input name="dueOn" type="date" defaultValue={currentDueOn ?? ''} required />
              <span className="text-caption text-fg-muted">
                Tanggal ini diatur manual oleh kasir.
              </span>
            </label>
            <Button type="submit" variant="secondary" loading={pending}>
              Simpan
            </Button>
          </form>
        ) : null}

        {canManageDeparture ? (
          <form
            className="border-border grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              run(() =>
                updateFinanceInvoiceDeparture({
                  invoiceId,
                  departureOn: String(f.get('departureOn')),
                }),
              )
            }}
          >
            <label className="text-body-sm grid gap-1">
              <span>Tanggal keberangkatan</span>
              <Input
                name="departureOn"
                type="date"
                defaultValue={currentDepartureOn ?? ''}
                required
              />
              <span className="text-caption text-fg-muted">
                Dipakai untuk menentukan persentase refund. Dikunci setelah pengajuan refund dibuat.
              </span>
            </label>
            <Button type="submit" variant="secondary" loading={pending}>
              Simpan
            </Button>
          </form>
        ) : null}
      </div>

      {['issued', 'partially_paid'].includes(status) && outstanding > 0 ? (
        <form
          className="border-border grid gap-3 rounded-xl border p-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            run(() =>
              recordFinancePayment({
                invoiceId,
                amount: Number(f.get('amount')),
                method: String(f.get('method')),
                externalReference: String(f.get('reference')),
                notes: '',
              }),
            )
          }}
        >
          <div className="sm:col-span-3">
            <h3 className="font-semibold">Catat pembayaran masuk</h3>
            <p className="text-caption text-fg-muted mt-1">
              Pembayaran baru berstatus Menunggu Rekonsiliasi dan belum menambah saldo terbayar
              sampai bukti pembayaran cocok dengan transaksi bank.
            </p>
          </div>
          <label className="text-body-sm grid gap-1">
            <span>Nominal pembayaran</span>
            <Input
              name="amount"
              type="number"
              min="1"
              max={outstanding}
              defaultValue={outstanding}
              required
            />
          </label>
          <label className="text-body-sm grid gap-1">
            <span>Metode</span>
            <Input name="method" required />
          </label>
          <label className="text-body-sm grid gap-1">
            <span>Referensi awal</span>
            <Input name="reference" />
          </label>
          <div className="sm:col-span-3">
            <Button type="submit" loading={pending}>
              Catat untuk Rekonsiliasi
            </Button>
          </div>
        </form>
      ) : null}

      {pendingPayments.length > 0 ? (
        <div className="grid gap-3">
          <Alert tone="info" title="Pembayaran menunggu rekonsiliasi">
            Konfirmasi hanya dilakukan setelah bukti pembayaran dan transaksi bank cocok. Nominal
            rekonsiliasi mengikuti pembayaran yang sudah dicatat dan tidak dapat diubah dari form ini.
          </Alert>
          {pendingPayments.map((payment) => (
            <form
              key={payment.id}
              className="border-border grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault()
                reconcile(event.currentTarget, payment)
              }}
            >
              <div className="sm:col-span-2 lg:col-span-4">
                <h3 className="font-semibold">{payment.reference}</h3>
                <p className="text-caption text-fg-muted mt-1">
                  {rupiah.format(payment.amount)} · {payment.method}
                  {payment.externalReference ? ` · ${payment.externalReference}` : ''}
                </p>
              </div>
              <label className="text-body-sm grid gap-1">
                <span>Referensi transaksi bank</span>
                <Input name="bankReference" maxLength={200} required />
              </label>
              <label className="text-body-sm grid gap-1">
                <span>Waktu dana diterima bank</span>
                <Input name="bankReceivedAt" type="datetime-local" required />
              </label>
              <label className="text-body-sm grid gap-1 sm:col-span-2">
                <span>Bukti pembayaran</span>
                <Input
                  name="proof"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  required
                />
                <span className="text-caption text-fg-muted">
                  PDF, JPG, PNG, atau WebP. Maksimal 15 MB.
                </span>
              </label>
              <label className="text-body-sm grid gap-1 sm:col-span-2 lg:col-span-3">
                <span>Catatan rekonsiliasi</span>
                <Input name="notes" maxLength={2000} />
              </label>
              <div className="flex items-end">
                <Button type="submit" loading={pending}>
                  Cocokkan & Konfirmasi
                </Button>
              </div>
            </form>
          ))}
        </div>
      ) : null}

      {refundable > 0 ? (
        <form
          className="border-border grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            setError(null)
            startTransition(async () => {
              const result = await requestFinanceRefund({
                invoiceId,
                paymentId: null,
                amount: Number(f.get('amount')),
                reason: String(f.get('reason')),
                notes: String(f.get('notes')),
              })
              if (!result.ok) {
                setError(result.error.message)
                return
              }
              router.push(
                `/admin/financials/operations/invoices/${invoiceId}/refunds/${result.data.id}`,
              )
            })
          }}
        >
          <div className="sm:col-span-2">
            <h3 className="font-semibold">Pengajuan refund</h3>
            <p className="text-caption text-fg-muted mt-1">
              Data pelanggan, invoice, paket, dan pembayaran ditarik dari data kasir. Refund baru
              memengaruhi laporan keuangan setelah diproses.
            </p>
            {refundPolicyNote ? (
              <p className="text-caption mt-2 font-medium">{refundPolicyNote}</p>
            ) : null}
          </div>
          <label className="text-body-sm grid gap-1">
            <span>Nominal pengajuan refund</span>
            <Input name="amount" type="number" min="1" max={refundable} required />
            <span className="text-caption text-fg-muted">
              Maksimal berdasarkan pembayaran dan kebijakan: {rupiah.format(refundable)}
            </span>
          </label>
          <label className="text-body-sm grid gap-1">
            <span>Alasan refund</span>
            <Input name="reason" required />
          </label>
          <label className="text-body-sm grid gap-1 sm:col-span-2">
            <span>Catatan tambahan</span>
            <Input name="notes" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" loading={pending}>
              Buat formulir pengajuan refund
            </Button>
          </div>
        </form>
      ) : refundPolicyNote ? (
        <Alert tone="info" title="Refund mengikuti kebijakan invoice">
          {refundPolicyNote}
        </Alert>
      ) : null}
    </div>
  )
}
