import type { Metadata } from 'next'
import Link from 'next/link'

import { topics } from '@/core/realtime/events'
import { InheritanceCancelButton } from '@/features/investor/ownership/inheritance-cancel-button'
import { InheritanceForm } from '@/features/investor/ownership/inheritance-form'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireInvestorPage } from '@/server/auth/page-guards'
import {
  listMyInheritance,
  type OwnershipInheritanceStatus,
} from '@/server/ownership/inheritance-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Pewaris Saham' }

const STATUS_LABELS: Record<OwnershipInheritanceStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default async function InvestorInheritancePage() {
  const principal = await requireInvestorPage('/investor/ownership/inheritance')
  const supabase = await getServerSupabase()

  const [requests, { data: holdings }] = await Promise.all([
    listMyInheritance(supabase),
    supabase
      .from('ownership_holdings')
      .select('id, offering_id, units, status, acquisition_reference')
      .eq('investor_id', principal.investorId)
      .eq('status', 'active')
      .order('acquisition_at', { ascending: false }),
  ])

  const activeHoldings = holdings ?? []
  const offeringIds = [
    ...new Set(activeHoldings.map((holding) => holding.offering_id)),
  ]

  const { data: offerings } = offeringIds.length
    ? await supabase
        .from('ownership_offerings')
        .select('id, name')
        .in('id', offeringIds)
    : { data: [] }

  const offeringMap = new Map(
    (offerings ?? []).map((offering) => [offering.id, offering.name]),
  )

  const reservedByHolding = new Map<string, number>()
  for (const request of requests) {
    if (!['pending', 'approved'].includes(request.status)) continue
    reservedByHolding.set(
      request.holding_id,
      (reservedByHolding.get(request.holding_id) ?? 0) + Number(request.units),
    )
  }

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={topics.investor(principal.investorId)}
        kinds={['ownership.changed']}
      />

      <PageHeader
        eyebrow="Kepemilikan"
        title="Pewaris Saham"
        description="Ajukan pewaris dari kepemilikan aktif Anda, pantau status pemeriksaan, dan batalkan pengajuan yang masih menunggu persetujuan."
        actions={
          <Button asChild variant="secondary">
            <Link href="/investor/ownership">Kembali ke Kepemilikan</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Tambah Pewaris</CardTitle>
        </CardHeader>
        <CardBody>
          {!activeHoldings.length ? (
            <EmptyState
              title="Tidak ada kepemilikan aktif"
              description="Pengajuan pewarisan hanya dapat dibuat dari kepemilikan yang masih aktif."
            />
          ) : (
            <div className="grid gap-4">
              {activeHoldings.map((holding) => {
                const reserved = reservedByHolding.get(holding.id) ?? 0
                const available = Math.max(0, Number(holding.units) - reserved)

                return (
                  <div key={holding.id} className="grid gap-3 rounded-xl border border-border p-4">
                    <div>
                      <p className="font-semibold">
                        {offeringMap.get(holding.offering_id) ?? 'Kepemilikan Saham'}
                      </p>
                      <p className="text-body-sm text-fg-subtle">
                        {available.toLocaleString('id-ID')} unit tersedia untuk diajukan
                        {holding.acquisition_reference
                          ? ` · Referensi ${holding.acquisition_reference}`
                          : ''}
                      </p>
                    </div>

                    {available > 0 ? (
                      <InheritanceForm
                        holdingId={holding.id}
                        maxUnits={available}
                      />
                    ) : (
                      <p className="text-body-sm text-fg-subtle">
                        Seluruh unit pada kepemilikan ini sedang berada dalam pengajuan pewarisan aktif.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengajuan Pewarisan</CardTitle>
        </CardHeader>
        <CardBody>
          {!requests.length ? (
            <EmptyState
              title="Belum ada pengajuan pewaris"
              description="Pengajuan pewarisan yang Anda buat akan muncul di sini."
            />
          ) : (
            <div className="divide-border divide-y">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="grid gap-4 py-5 first:pt-0 md:grid-cols-[1fr_auto] md:items-start"
                >
                  <div>
                    <p className="font-semibold">{request.beneficiary_name}</p>
                    <p className="text-body-sm text-fg-subtle">
                      {Number(request.units).toLocaleString('id-ID')} unit ·{' '}
                      {STATUS_LABELS[request.status]}
                    </p>
                    <p className="text-caption mt-1 text-fg-subtle">
                      Diajukan {new Date(request.requested_at).toLocaleDateString('id-ID')}
                    </p>
                    {request.beneficiary_email ? (
                      <p className="text-caption text-fg-muted">{request.beneficiary_email}</p>
                    ) : null}
                    {request.beneficiary_phone ? (
                      <p className="text-caption text-fg-muted">{request.beneficiary_phone}</p>
                    ) : null}
                    {request.rejection_reason ? (
                      <p className="text-caption text-danger mt-2">
                        Alasan penolakan: {request.rejection_reason}
                      </p>
                    ) : null}
                  </div>

                  {request.status === 'pending' ? (
                    <InheritanceCancelButton requestId={request.id} />
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
