'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { processFinanceRefundRequest } from '@/server/financials/refund-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'

export function RefundRequestActions({
  refundId,
  invoiceId,
  reference,
  customerName,
  status,
}: {
  refundId: string
  invoiceId: string
  reference: string
  customerName: string
  status: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const canProcess = ['requested', 'approved'].includes(status)

  return (
    <div className="print:hidden grid gap-3">
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
            document.title = [customerName, reference, 'Form-Pengajuan-Refund']
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
        {canProcess ? (
          <Button
            variant="danger"
            loading={pending}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const result = await processFinanceRefundRequest({ refundId })
                if (!result.ok) {
                  setError(result.error.message)
                  return
                }
                router.refresh()
              })
            }}
          >
            Proses refund
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/financials/operations/invoices/${invoiceId}`)}
        >
          Kembali ke invoice
        </Button>
      </div>
      <p className="text-caption text-fg-muted">
        Status pengajuan: <strong>{status}</strong>. Hanya refund berstatus processed yang masuk
        sebagai refund pada sinkronisasi laporan keuangan.
      </p>
    </div>
  )
}
