'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  issueFinanceInvoice,
  processFinanceRefund,
  recordFinancePayment,
  updateFinanceInvoiceDueDate,
} from '@/server/financials/operation-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
export function FinanceInvoiceActions({
  invoiceId,
  status,
  outstanding,
  refundable,
  documentTitle,
  customerName,
  issuedOn,
  currentDueOn,
}: {
  invoiceId: string
  status: string
  outstanding: number
  refundable: number
  documentTitle: string
  customerName: string
  issuedOn: string | null
  currentDueOn: string | null
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
            const safe = (value: string) =>
              value
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 90)
            const previousTitle = document.title
            document.title = [customerName, issuedOn ?? new Date().toISOString().slice(0, 10), documentTitle]
              .map(safe)
              .filter(Boolean)
              .join('-')
            window.print()
            window.setTimeout(() => {
              document.title = previousTitle
            }, 1000)
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
              Tanggal ini diatur manual oleh kasir. Sistem tidak menentukan batas pelunasan otomatis.
            </span>
          </label>
          <Button type="submit" variant="secondary" loading={pending}>
            Simpan batas pelunasan
          </Button>
        </form>
      ) : null}
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
            run(() =>
              processFinanceRefund({
                invoiceId,
                paymentId: null,
                amount: Number(f.get('amount')),
                reason: String(f.get('reason')),
                notes: '',
              }),
            )
          }}
        >
          <label className="text-body-sm grid gap-1">
            <span>Nominal refund</span>
            <Input name="amount" type="number" min="1" max={refundable} required />
          </label>
          <label className="text-body-sm grid gap-1">
            <span>Alasan refund</span>
            <Input name="reason" required />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="danger" loading={pending}>
              Proses refund
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
