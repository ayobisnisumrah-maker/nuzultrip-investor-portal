'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  issueFinanceInvoice,
  recordFinancePayment,
  updateFinanceInvoiceDueDate,
} from '@/server/financials/operation-actions'
import { updateFinanceInvoiceDeparture } from '@/server/financials/policy-actions'
import { requestFinanceRefund } from '@/server/financials/refund-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'

export function FinanceInvoiceActions({
  invoiceId,
  status,
  outstanding,
  refundable,
  refundPolicyNote,
  currentDueOn,
  currentDepartureOn,
}: {
  invoiceId: string
  status: string
  outstanding: number
  refundable: number
  refundPolicyNote?: string | null
  currentDueOn: string | null
  currentDepartureOn: string | null
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
            <span>Referensi</span>
            <Input name="reference" />
          </label>
          <div className="sm:col-span-3">
            <Button type="submit" loading={pending}>
              Catat pembayaran
            </Button>
          </div>
        </form>
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
              Maksimal berdasarkan pembayaran dan kebijakan: {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(refundable)}
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
