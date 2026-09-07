import Link from 'next/link'

import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'
import { OwnershipAllocationForm } from './ownership-allocation-form'

const STATUS_LABELS: Record<string, string> = {
  reserved: 'Dicadangkan',
  active: 'Aktif',
  transferred: 'Dialihkan',
  cancelled: 'Dibatalkan',
}

function percentFromBps(value: number) {
  return (value / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

export async function OwnershipAllocationPanel({
  offeringId,
  offeringStatus,
  totalUnits,
  unitOwnershipBps,
  canCreate,
}: {
  offeringId: string
  offeringStatus: string
  totalUnits: number
  unitOwnershipBps: number
  canCreate: boolean
}) {
  const supabase = await getServerSupabase()

  const [{ data: holdings, error: holdingsError }, { data: investors, error: investorsError }] =
    await Promise.all([
      supabase
        .from('ownership_holdings')
        .select(
          'id, investor_id, units, ownership_bps, status, acquisition_at, transfer_eligible_at, acquisition_reference, notes, created_at',
        )
        .eq('offering_id', offeringId)
        .order('created_at', { ascending: false }),
      supabase
        .from('investors')
        .select('id, legal_name, organization_name, reference_code, investor_type, status')
        .in('status', ['approved', 'active'])
        .order('legal_name', { ascending: true }),
    ])

  if (holdingsError) {
    return (
      <Alert tone="danger" title="Alokasi kepemilikan tidak dapat dimuat">
        Sistem gagal mengambil holding untuk penawaran ini.
      </Alert>
    )
  }

  const investorRows = investorsError ? [] : investors ?? []
  const investorMap = new Map(investorRows.map((investor) => [investor.id, investor]))
  const activeAllocatedUnits = (holdings ?? [])
    .filter((holding) => holding.status === 'active' || holding.status === 'reserved')
    .reduce((sum, holding) => sum + Number(holding.units), 0)
  const remainingUnits = Math.max(0, totalUnits - activeAllocatedUnits)

  const options = investorRows.map((investor) => ({
    id: investor.id,
    label:
      investor.investor_type === 'institution'
        ? investor.organization_name || investor.legal_name
        : investor.legal_name,
    referenceCode: investor.reference_code,
  }))

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Alokasi Investor</CardTitle>
              <p className="text-body-sm text-fg-muted mt-1">
                Kepemilikan yang sudah dicatat dari penawaran ini.
              </p>
            </div>
            <div className="text-right">
              <div className="text-caption text-fg-subtle">Sisa unit</div>
              <div className="text-heading-md font-semibold tabular text-fg">
                {remainingUnits.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {!holdings?.length ? (
            <EmptyState
              title="Belum ada alokasi"
              description="Unit yang diberikan kepada investor akan muncul di sini."
            />
          ) : (
            <div className="divide-border divide-y">
              {holdings.map((holding) => {
                const investor = investorMap.get(holding.investor_id)
                const investorName = investor
                  ? investor.investor_type === 'institution'
                    ? investor.organization_name || investor.legal_name
                    : investor.legal_name
                  : 'Investor'

                return (
                  <div key={holding.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/investors/${holding.investor_id}`}
                            className="font-medium text-fg hover:underline"
                          >
                            {investorName}
                          </Link>
                          <span className="rounded-full border border-border px-2 py-0.5 text-caption text-fg-muted">
                            {STATUS_LABELS[holding.status] ?? holding.status}
                          </span>
                        </div>
                        <div className="text-caption text-fg-subtle mt-1">
                          {investor?.reference_code ?? '—'}
                          {holding.acquisition_reference ? ` · ${holding.acquisition_reference}` : ''}
                        </div>
                      </div>

                      <div className="grid shrink-0 grid-cols-2 gap-x-6 text-right">
                        <div>
                          <div className="text-caption text-fg-subtle">Unit</div>
                          <div className="font-semibold tabular text-fg">
                            {Number(holding.units).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div>
                          <div className="text-caption text-fg-subtle">Porsi</div>
                          <div className="font-semibold tabular text-fg">
                            {percentFromBps(Number(holding.ownership_bps))}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-caption text-fg-subtle mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Akuisisi {new Date(holding.acquisition_at).toLocaleDateString('id-ID')}
                      </span>
                      <span>
                        Dapat dialihkan mulai{' '}
                        {new Date(holding.transfer_eligible_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    {holding.notes ? (
                      <p className="text-body-sm text-fg-muted mt-2 whitespace-pre-wrap">
                        {holding.notes}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alokasikan Unit</CardTitle>
          <p className="text-body-sm text-fg-muted mt-1">
            Alokasi dibuat atomik di database agar unit tidak dapat melebihi kapasitas penawaran.
          </p>
        </CardHeader>
        <CardBody>
          {!canCreate ? (
            <Alert tone="info" title="Akses terbatas">
              Anda tidak memiliki permission <code>ownership.create</code>.
            </Alert>
          ) : offeringStatus !== 'open' ? (
            <Alert tone="info" title="Penawaran belum aktif">
              Unit hanya dapat dialokasikan ketika status penawaran Aktif.
            </Alert>
          ) : remainingUnits <= 0 ? (
            <EmptyState
              title="Seluruh unit telah dialokasikan"
              description="Tidak ada sisa unit yang dapat diberikan dari penawaran ini."
            />
          ) : investorsError ? (
            <Alert tone="danger" title="Investor tidak dapat dimuat">
              Sistem gagal mengambil investor yang memenuhi syarat.
            </Alert>
          ) : (
            <OwnershipAllocationForm
              offeringId={offeringId}
              remainingUnits={remainingUnits}
              unitOwnershipBps={unitOwnershipBps}
              investors={options}
            />
          )}
        </CardBody>
      </Card>
    </div>
  )
}
