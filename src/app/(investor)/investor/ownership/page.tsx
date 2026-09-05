import type { Metadata } from 'next'

import { SaleHistory } from '@/features/investor/ownership/sale-history'
import { SellSharesForm } from '@/features/investor/ownership/sell-shares-form'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { listInvestorSaleTransfers } from '@/server/ownership/transfer-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Kepemilikan' }

const RESERVED_SALE_STATUSES = new Set([
  'pending',
  'approved',
  'processing',
])

const HOLDING_STATUS_LABELS: Record<string, string> = {
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
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const [{ data: holdings }, saleTransfers] = await Promise.all([
    supabase
      .from('ownership_holdings')
      .select(
        'id, offering_id, units, ownership_bps, acquisition_at, transfer_eligible_at, status, acquisition_reference',
      )
      .eq('investor_id', principal.investorId)
      .order('acquisition_at', { ascending: false }),
    listInvestorSaleTransfers(supabase),
  ])

  const allHoldings = holdings ?? []

  const offeringIds = [
    ...new Set(allHoldings.map((holding) => holding.offering_id)),
  ]

  const { data: offerings } = offeringIds.length
    ? await supabase
        .from('ownership_offerings')
        .select(
          'id, name, code, unit_price, unit_ownership_bps, status',
        )
        .in('id', offeringIds)
    : { data: [] }

  const offeringMap = new Map(
    (offerings ?? []).map((offering) => [offering.id, offering]),
  )

  const activeHoldings = allHoldings.filter(
    (holding) => holding.status === 'active',
  )

  const totalUnits = activeHoldings.reduce(
    (sum, holding) => sum + Number(holding.units),
    0,
  )

  const totalBps = activeHoldings.reduce(
    (sum, holding) => sum + Number(holding.ownership_bps),
    0,
  )

  const totalPortfolioValue = activeHoldings.reduce((sum, holding) => {
    const offering = offeringMap.get(holding.offering_id)

    return (
      sum +
      Number(holding.units) * Number(offering?.unit_price ?? 0)
    )
  }, 0)

  const reservedUnitsByHolding = new Map<string, number>()

  for (const transfer of saleTransfers) {
    if (!RESERVED_SALE_STATUSES.has(transfer.status)) {
      continue
    }

    reservedUnitsByHolding.set(
      transfer.holding_id,
      (reservedUnitsByHolding.get(transfer.holding_id) ?? 0) +
        Number(transfer.units),
    )
  }

  // Server Component: eligibility dihitung sekali pada waktu request.
  // Validasi final tetap dilakukan secara atomik oleh RPC database.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Kepemilikan"
        title="Kepemilikan Saham"
        description="Pantau unit, porsi kepemilikan, nilai portofolio, serta pengajuan penjualan saham Anda."
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
                <div className="text-caption text-fg-subtle">
                  Nilai Portofolio
                </div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {formatRupiah(totalPortfolioValue)}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">
                  Total Unit Aktif
                </div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {totalUnits.toLocaleString('id-ID')}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">
                  Total Kepemilikan
                </div>
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
              const reservedUnits =
                reservedUnitsByHolding.get(holding.id) ?? 0

              const availableUnits = Math.max(
                0,
                units - reservedUnits,
              )

              const isActive = holding.status === 'active'

              const transferEligibleAt =
                new Date(holding.transfer_eligible_at)

              const isEligible =
                Number.isFinite(transferEligibleAt.getTime()) &&
                transferEligibleAt.getTime() <= now

              const unitPrice = Number(offering?.unit_price ?? 0)

              return (
                <Card key={holding.id}>
                  <CardHeader>
                    <CardTitle>
                      {offering?.name ?? 'Kepemilikan Saham'}
                    </CardTitle>
                  </CardHeader>

                  <CardBody>
                    <div className="text-body-sm grid gap-4 sm:grid-cols-3">
                      <div>
                        <span className="text-fg-subtle">
                          Unit Tercatat
                        </span>
                        <div className="tabular font-semibold">
                          {units.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">
                          Unit Tersedia
                        </span>
                        <div className="tabular font-semibold">
                          {availableUnits.toLocaleString('id-ID')}
                        </div>

                        {reservedUnits > 0 ? (
                          <div className="text-caption mt-1 text-fg-subtle">
                            {reservedUnits.toLocaleString('id-ID')} unit
                            sedang dalam proses penjualan
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <span className="text-fg-subtle">
                          Kepemilikan
                        </span>
                        <div className="tabular font-semibold">
                          {formatPercentFromBps(
                            Number(holding.ownership_bps),
                          )}
                          %
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">
                          Harga Referensi / Unit
                        </span>
                        <div className="tabular font-semibold">
                          {formatRupiah(unitPrice)}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">
                          Nilai Kepemilikan
                        </span>
                        <div className="tabular font-semibold">
                          {formatRupiah(units * unitPrice)}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">Status</span>
                        <div className="font-semibold">
                          {HOLDING_STATUS_LABELS[holding.status] ??
                            holding.status}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">
                          Tanggal Akuisisi
                        </span>
                        <div>
                          {new Date(
                            holding.acquisition_at,
                          ).toLocaleDateString('id-ID')}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">
                          Dapat Dijual Mulai
                        </span>
                        <div>
                          {transferEligibleAt.toLocaleDateString(
                            'id-ID',
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-fg-subtle">
                          Referensi
                        </span>
                        <div className="font-mono">
                          {holding.acquisition_reference ?? '—'}
                        </div>
                      </div>
                    </div>

                    {isActive ? (
                      <div className="mt-5 border-t border-border pt-5">
                        {!isEligible ? (
                          <div className="text-body-sm text-fg-subtle">
                            Saham belum memasuki tanggal yang
                            diperbolehkan untuk dijual.
                          </div>
                        ) : availableUnits <= 0 ? (
                          <div className="text-body-sm text-fg-subtle">
                            Seluruh unit tersedia sedang berada
                            dalam proses penjualan.
                          </div>
                        ) : (
                          <SellSharesForm
                            holdingId={holding.id}
                            offeringName={
                              offering?.name ?? 'Kepemilikan Saham'
                            }
                            availableUnits={availableUnits}
                            referenceUnitPrice={unitPrice}
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
