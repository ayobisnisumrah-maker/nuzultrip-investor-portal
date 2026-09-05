import { CancelSaleButton } from '@/features/investor/ownership/cancel-sale-button'
import type {
  OwnershipSaleTransfer,
  OwnershipTransferStatus,
} from '@/server/ownership/transfer-service'

const STATUS_LABELS: Record<
  OwnershipTransferStatus,
  string
> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  processing: 'Dalam Proses',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

function rupiah(value: number | null) {
  if (value === null) return '—'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function SaleHistory({
  transfers,
}: {
  transfers: OwnershipSaleTransfer[]
}) {
  if (!transfers.length) {
    return (
      <div className="text-body-sm text-fg-subtle">
        Belum ada pengajuan penjualan saham.
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {transfers.map((transfer) => (
        <div
          key={transfer.id}
          className="rounded-xl border border-border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold">
                {transfer.units.toLocaleString('id-ID')} unit
              </div>

              <div className="text-body-sm text-fg-subtle">
                Diajukan{' '}
                {new Date(
                  transfer.requested_at,
                ).toLocaleDateString('id-ID')}
              </div>
            </div>

            <div className="rounded-full border border-border px-3 py-1 text-body-sm font-medium">
              {STATUS_LABELS[transfer.status]}
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-body-sm sm:grid-cols-3">
            <div>
              <div className="text-fg-subtle">
                Harga yang diajukan
              </div>
              <div className="font-semibold">
                {rupiah(transfer.requested_unit_price)}
              </div>
            </div>

            <div>
              <div className="text-fg-subtle">
                Harga disepakati
              </div>
              <div className="font-semibold">
                {rupiah(transfer.agreed_unit_price)}
              </div>
            </div>

            <div>
              <div className="text-fg-subtle">
                Total disepakati
              </div>
              <div className="font-semibold">
                {transfer.agreed_unit_price === null
                  ? '—'
                  : rupiah(
                      transfer.agreed_unit_price *
                        transfer.units,
                    )}
              </div>
            </div>
          </div>

          {transfer.notes ? (
            <div className="mt-4 rounded-lg border border-border p-3 text-body-sm">
              <span className="text-fg-subtle">
                Catatan:{' '}
              </span>
              {transfer.notes}
            </div>
          ) : null}

          {transfer.rejection_reason ? (
            <div className="mt-4 rounded-lg border border-border p-3 text-body-sm">
              <span className="text-fg-subtle">
                Alasan penolakan:{' '}
              </span>
              {transfer.rejection_reason}
            </div>
          ) : null}

          {transfer.status === 'pending' ? (
            <div className="mt-4 border-t border-border pt-4">
              <CancelSaleButton
                transferId={transfer.id}
                units={transfer.units}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
