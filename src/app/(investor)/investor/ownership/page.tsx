import type { Metadata } from 'next'
import Link from 'next/link'

import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { SaleHistory } from '@/features/investor/ownership/sale-history'
import { SellSharesForm } from '@/features/investor/ownership/sell-shares-form'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { listMyInheritance } from '@/server/ownership/inheritance-service'
import { listInvestorSaleTransfers } from '@/server/ownership/transfer-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Kepemilikan' }

const RESERVED_SALE_STATUSES = new Set(['pending', 'approved', 'processing'])
const RESERVED_INHERITANCE_STATUSES = new Set(['pending', 'approved'])

const HOLDING_STATUS_LABELS: Record<string, string> = {
  reserved: 'Dicadangkan',
  active: 'Aktif',
  transferred: 'Dialihkan',
  cancelled: 'Dibatalkan',
}

function formatPercentFromBps(value: number) {
  return (value / 100).toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  })
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function InvestorOwnershipPage() {
  const principal = await requireInvestorPage('/investor/ownership')
  const supabase = await getServerSupabase()

  const [{ data: holdings }, saleTransfers, inheritanceRequests] = await Promise.all([
    supabase
      .from('ownership_holdings')
      .select(
        'id, offering_id, units, ownership_bps, acquisition_at, transfer_eligible_at, status, acquisition_reference',
      )
      .eq('investor_id', principal.investorId)
      .order('acquisition_at', { ascending: false }),
    listInvestorSaleTransfers(supabase),
    listMyInheritance(supabase),
  ])

  const allHoldings = holdings ?? []
  const offeringIds = [...new Set(allHoldings.map((holding) => holding.offering_id))]

  const { data: offerings } = offeringIds.length
    ? await supabase
        .from('ownership_offerings')
        .select('id, name, code, unit_price, unit_ownership_bps, status')
        .in('id', offeringIds)
    : { data: [] }

  const offeringMap = new Map((offerings ?? []).map((offering) => [offering.id, offering]))

  const activeHoldings = allHoldings.filter((holding) => holding.status === 'active')
  const totalUnits = activeHoldings.reduce((sum, holding) => sum + Number(holding.units), 0)
  const totalBps = activeHoldings.reduce(
    (sum, holding) => sum + Number(holding.ownership_bps),
    0,
  )

  const reservedSaleUnitsByHolding = new Map<string, number>()
  for (const transfer of saleTransfers) {
    if (!RESERVED_SALE_STATUSES.has(transfer.status)) continue
    reservedSaleUnitsByHolding.set(
      transfer.holding_id,
      (reservedSaleUnitsByHolding.get(transfer.holding_id) ?? 0) + Number(transfer.units),
    )
  }

  const reservedInheritanceUnitsByHolding = new Map<string, number>()
  for (const request of inheritanceRequests) {
    if (!RESERVED_INHERITANCE_STATUSES.has(request.status)) continue
    reservedInheritanceUnitsByHolding.set(
      request.holding_id,
      (reservedInheritanceUnitsByHolding.get(request.holding_id) ?? 0) + Number(request.units),
    )
  }

  // Server Component: eligibility dihitung sekali pada waktu request.
  // Validasi final tetap dilakukan secara atomik oleh RPC database.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={topics.investor(principal.investorId)}
        kinds={['ownership.changed']}
      />

      <PageHeader
        eyebrow="Kepemilikan"
        title="Kepemilikan Saham"
        description="Pantau unit, porsi kepemilikan, penjualan saham, serta pengajuan pewarisan berdasarkan cap table resmi."
        actions={
          <Button asChild variant="secondary">
            <Link href="/investor/ownership/inheritance">Kelola Pewaris</Link>
          </Button>
        }
      />

      {!allHoldings.length ? (
        <>
          <EmptyState
            title="Belum ada kepemilikan"
            description="Kepemilikan yang telah dicatat dan diaktifkan akan muncul di sini."
          />

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Penjualan Saham</CardTitle>
            </CardHeader>
            <CardBody>
              <SaleHistory transfers={saleTransfers} />
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Holding Aktif</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {activeHoldings.length.toLocaleString('id-ID')}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Total Unit Aktif</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {totalUnits.toLocaleString('id-ID')}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Total Kepemilikan</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {formatPercentFromBps(totalBps)}%
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4">
            {allHoldings.map((holding) => {
              const offering = offeringMap.get(holding.offering_id)
              const units = Number(holding.units)
              const reservedSaleUnits = reservedSaleUnitsByHolding.get(holding.id) ?? 0
              const reservedInheritanceUnits =
                reservedInheritanceUnitsByHolding.get(holding.id) ?? 0
              const reservedUnits = reservedSaleUnits + reservedInheritanceUnits
              const availableUnits = Math.max(0, units - reservedUnits)
              const isActive = holding.status === 'active'
              const transferEligibleAt = new Date(holding.transfer_eligible_at)
              const isEligible =
                Number.isFinite(transferEligibleAt.getTime()) && transferEligibleAt.getTime() <= now
              const referenceUnitPrice = Number(offering?.unit_price ?? 0)

              return (
                <Card key={holding.id}>
                  <CardHeader>
                    <CardTitle>{offering?.name ?? 'Kepemilikan Saham'}</CardTitle>
                  </CardHeader>

                  <CardBody>
                    <div className="text-body-sm grid gap-4 sm:grid-cols-3">
                      <div>
                        <span className="text-fg-subtle">Unit Tercatat</span>
                        <div className="tabular font-semibold">
                          {units.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">Unit Tersedia</span>
                        <div className="tabular font-semibold">
                          {availableUnits.toLocaleString('id-ID')}
                        </div>
                        {reservedUnits > 0 ? (
                          <div className="text-caption mt-1 text-fg-subtle">
                            {reservedUnits.toLocaleString('id-ID')} unit sedang dicadangkan
                            {reservedSaleUnits > 0 && reservedInheritanceUnits > 0
                              ? ' untuk penjualan dan pewarisan'
                              : reservedInheritanceUnits > 0
                                ? ' untuk pewarisan'
                                : ' untuk penjualan'}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <span className="text-fg-subtle">Kepemilikan</span>
                        <div className="tabular font-semibold">
                          {formatPercentFromBps(Number(holding.ownership_bps))}%
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">Harga Penawaran / Unit</span>
                        <div className="tabular font-semibold">
                          {formatRupiah(referenceUnitPrice)}
                        </div>
                        <div className="text-caption mt-1 text-fg-subtle">
                          Term resmi dari penawaran kepemilikan, bukan valuasi portofolio.
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">Status</span>
                        <div className="font-semibold">
                          {HOLDING_STATUS_LABELS[holding.status] ?? holding.status}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">Tanggal Akuisisi</span>
                        <div>{new Date(holding.acquisition_at).toLocaleDateString('id-ID')}</div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">Dapat Dijual Mulai</span>
                        <div>{transferEligibleAt.toLocaleDateString('id-ID')}</div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">Referensi</span>
                        <div className="font-mono">{holding.acquisition_reference ?? '—'}</div>
                      </div>
                    </div>

                    {isActive ? (
                      <div className="mt-5 border-t border-border pt-5">
                        {!isEligible ? (
                          <div className="text-body-sm text-fg-subtle">
                            Saham belum memasuki tanggal yang diperbolehkan untuk dijual.
                          </div>
                        ) : availableUnits <= 0 ? (
                          <div className="text-body-sm text-fg-subtle">
                            Seluruh unit tersedia sedang dicadangkan untuk proses aktif.
                          </div>
                        ) : (
                          <SellSharesForm
                            holdingId={holding.id}
                            offeringName={offering?.name ?? 'Kepemilikan Saham'}
                            availableUnits={availableUnits}
                            referenceUnitPrice={referenceUnitPrice}
                          />
                        )}
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Penjualan Saham</CardTitle>
            </CardHeader>
            <CardBody>
              <SaleHistory transfers={saleTransfers} />
            </CardBody>
          </Card>
        </>
      )}
    </Stack>
  )
}
