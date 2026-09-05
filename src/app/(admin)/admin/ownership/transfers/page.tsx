import type { Metadata } from 'next'

import { AdminModulePage } from '@/features/admin/admin-module-page'
import { OwnershipTransferActions } from '@/features/admin/ownership/ownership-transfer-actions'
import { adminWithPermission } from '@/server/auth/page-guards'
import {
  listAdminSaleTransfers,
  type OwnershipTransferStatus,
} from '@/server/ownership/transfer-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = {
  title: 'Transfer Kepemilikan',
}

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

export default async function OwnershipTransfersPage() {
  const principal = await adminWithPermission(
    'ownership_transfers.view',
    '/admin/ownership/transfers',
  )

  if (!principal) {
    return (
      <AdminModulePage
        eyebrow="Kepemilikan"
        title="Transfer Kepemilikan"
        description="Kelola permintaan penjualan dan perpindahan kepemilikan investor."
        permission="ownership_transfers.view"
        allowed={false}
      />
    )
  }

  const supabase = await getServerSupabase()

  const transfers = await listAdminSaleTransfers(supabase)

  const participantIds = [
    ...new Set(
      transfers.flatMap((transfer) => [
        transfer.from_investor_id,
        ...(transfer.to_investor_id
          ? [transfer.to_investor_id]
          : []),
      ]),
    ),
  ]

  const [{ data: participantInvestors }, { data: buyerInvestors }] =
    await Promise.all([
      participantIds.length
        ? supabase
            .from('investors')
            .select(
              'id, legal_name, reference_code, status',
            )
            .in('id', participantIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('investors')
        .select('id, legal_name, reference_code, status')
        .in('status', ['approved', 'active'])
        .order('legal_name', { ascending: true }),
    ])

  const investorMap = new Map(
    (participantInvestors ?? []).map((investor) => [
      investor.id,
      investor,
    ]),
  )

  const buyers = (buyerInvestors ?? []).map((investor) => ({
    id: investor.id,
    legalName: investor.legal_name,
    referenceCode: investor.reference_code,
  }))

  const permissions = Array.from(principal.permissions)

  const pendingCount = transfers.filter(
    (transfer) => transfer.status === 'pending',
  ).length

  const processingCount = transfers.filter(
    (transfer) =>
      transfer.status === 'approved' ||
      transfer.status === 'processing',
  ).length

  const completedCount = transfers.filter(
    (transfer) => transfer.status === 'completed',
  ).length

  const activeValue = transfers
    .filter((transfer) =>
      ['pending', 'approved', 'processing'].includes(
        transfer.status,
      ),
    )
    .reduce(
      (sum, transfer) =>
        sum +
        Number(transfer.units) *
          Number(transfer.requested_unit_price ?? 0),
      0,
    )

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Kepemilikan"
        title="Transfer & Penjualan Saham"
        description="Tinjau dan proses permintaan penjualan saham investor hingga kepemilikan resmi berpindah."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody>
            <div className="text-caption text-fg-subtle">
              Menunggu Persetujuan
            </div>
            <div className="text-heading-lg mt-1 font-semibold tabular">
              {pendingCount.toLocaleString('id-ID')}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-caption text-fg-subtle">
              Sedang Diproses
            </div>
            <div className="text-heading-lg mt-1 font-semibold tabular">
              {processingCount.toLocaleString('id-ID')}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-caption text-fg-subtle">
              Transaksi Selesai
            </div>
            <div className="text-heading-lg mt-1 font-semibold tabular">
              {completedCount.toLocaleString('id-ID')}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-caption text-fg-subtle">
              Nilai Pengajuan Aktif
            </div>
            <div className="text-heading-md mt-1 font-semibold tabular">
              {rupiah(activeValue)}
            </div>
          </CardBody>
        </Card>
      </div>

      {!transfers.length ? (
        <EmptyState
          title="Belum ada permintaan penjualan"
          description="Permintaan investor untuk menjual saham akan muncul di halaman ini."
        />
      ) : (
        <div className="grid gap-4">
          {transfers.map((transfer) => {
            const seller = investorMap.get(
              transfer.from_investor_id,
            )

            const buyer = transfer.to_investor_id
              ? investorMap.get(transfer.to_investor_id)
              : null

            const requestedTotal =
              transfer.requested_unit_price === null
                ? null
                : Number(transfer.units) *
                  Number(transfer.requested_unit_price)

            const agreedTotal =
              transfer.agreed_unit_price === null
                ? null
                : Number(transfer.units) *
                  Number(transfer.agreed_unit_price)

            return (
              <Card key={transfer.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>
                        {seller?.legal_name ??
                          'Investor tidak ditemukan'}
                      </CardTitle>

                      <div className="text-body-sm mt-1 text-fg-subtle">
                        {seller?.reference_code ?? '—'} ·{' '}
                        {new Date(
                          transfer.requested_at,
                        ).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    <div className="rounded-full border border-border px-3 py-1 text-body-sm font-medium">
                      {STATUS_LABELS[transfer.status]}
                    </div>
                  </div>
                </CardHeader>

                <CardBody>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-caption text-fg-subtle">
                        Jumlah Unit
                      </div>
                      <div className="mt-1 font-semibold tabular">
                        {Number(
                          transfer.units,
                        ).toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div>
                      <div className="text-caption text-fg-subtle">
                        Harga Diajukan / Unit
                      </div>
                      <div className="mt-1 font-semibold tabular">
                        {rupiah(
                          transfer.requested_unit_price,
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-caption text-fg-subtle">
                        Total Pengajuan
                      </div>
                      <div className="mt-1 font-semibold tabular">
                        {rupiah(requestedTotal)}
                      </div>
                    </div>

                    <div>
                      <div className="text-caption text-fg-subtle">
                        Dapat Dialihkan Sejak
                      </div>
                      <div className="mt-1 font-semibold">
                        {new Date(
                          transfer.eligible_at,
                        ).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    <div>
                      <div className="text-caption text-fg-subtle">
                        Pembeli
                      </div>
                      <div className="mt-1 font-semibold">
                        {buyer?.legal_name ?? 'Belum ditentukan'}
                      </div>
                    </div>

                    <div>
                      <div className="text-caption text-fg-subtle">
                        Harga Kesepakatan / Unit
                      </div>
                      <div className="mt-1 font-semibold tabular">
                        {rupiah(transfer.agreed_unit_price)}
                      </div>
                    </div>

                    <div>
                      <div className="text-caption text-fg-subtle">
                        Total Kesepakatan
                      </div>
                      <div className="mt-1 font-semibold tabular">
                        {rupiah(agreedTotal)}
                      </div>
                    </div>

                    <div>
                      <div className="text-caption text-fg-subtle">
                        Selesai Pada
                      </div>
                      <div className="mt-1 font-semibold">
                        {transfer.completed_at
                          ? new Date(
                              transfer.completed_at,
                            ).toLocaleDateString('id-ID')
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {transfer.notes ? (
                    <div className="mt-5 rounded-md border border-border bg-sunken p-3 text-body-sm">
                      <span className="text-fg-subtle">
                        Catatan investor:{' '}
                      </span>
                      {transfer.notes}
                    </div>
                  ) : null}

                  {transfer.rejection_reason ? (
                    <div className="mt-5 rounded-md border border-border p-3 text-body-sm">
                      <span className="text-fg-subtle">
                        Alasan penolakan:{' '}
                      </span>
                      {transfer.rejection_reason}
                    </div>
                  ) : null}

                  <div className="mt-5 border-t border-border pt-5">
                    <OwnershipTransferActions
                      transfer={transfer}
                      sellerName={
                        seller?.legal_name ?? 'Investor'
                      }
                      permissions={permissions}
                      buyers={buyers}
                    />
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </Stack>
  )
}
