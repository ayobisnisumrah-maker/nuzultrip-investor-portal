import type { Metadata } from 'next'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Kepemilikan' }

export default async function InvestorOwnershipPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: holdings } = await supabase
    .from('ownership_holdings')
    .select('id, offering_id, units, ownership_bps, acquisition_at, transfer_eligible_at, status, acquisition_reference')
    .eq('investor_id', principal.investorId)
    .order('acquisition_at', { ascending: false })

  const offeringIds = [...new Set((holdings ?? []).map((holding) => holding.offering_id))]
  const { data: offerings } = offeringIds.length
    ? await supabase.from('ownership_offerings').select('id, name, code, unit_price, unit_ownership_bps, status').in('id', offeringIds)
    : { data: [] }

  const offeringMap = new Map((offerings ?? []).map((offering) => [offering.id, offering]))
  const totalUnits = (holdings ?? []).reduce((sum, holding) => sum + Number(holding.units), 0)
  const totalBps = (holdings ?? []).reduce((sum, holding) => sum + Number(holding.ownership_bps), 0)

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Ownership" title="Kepemilikan" description="Ringkasan unit dan porsi kepemilikan yang tercatat atas nama Anda." />
      {!holdings?.length ? (
        <EmptyState title="Belum ada kepemilikan" description="Holding yang telah dicatat dan diaktifkan akan muncul di sini." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card><CardBody><div className="text-caption text-fg-subtle">Total unit</div><div className="mt-1 text-heading-lg font-semibold tabular">{totalUnits.toLocaleString('id-ID')}</div></CardBody></Card>
            <Card><CardBody><div className="text-caption text-fg-subtle">Total porsi</div><div className="mt-1 text-heading-lg font-semibold tabular">{(totalBps / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%</div></CardBody></Card>
          </div>
          <div className="grid gap-4">
            {holdings.map((holding) => {
              const offering = offeringMap.get(holding.offering_id)
              return (
                <Card key={holding.id}>
                  <CardHeader><CardTitle>{offering?.name ?? 'Offering'}</CardTitle></CardHeader>
                  <CardBody>
                    <div className="grid gap-4 text-body-sm sm:grid-cols-3">
                      <div><span className="text-fg-subtle">Unit</span><div className="font-semibold tabular">{Number(holding.units).toLocaleString('id-ID')}</div></div>
                      <div><span className="text-fg-subtle">Kepemilikan</span><div className="font-semibold tabular">{(Number(holding.ownership_bps) / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%</div></div>
                      <div><span className="text-fg-subtle">Status</span><div>{holding.status}</div></div>
                      <div><span className="text-fg-subtle">Akuisisi</span><div>{new Date(holding.acquisition_at).toLocaleDateString('id-ID')}</div></div>
                      <div><span className="text-fg-subtle">Transfer eligible</span><div>{new Date(holding.transfer_eligible_at).toLocaleDateString('id-ID')}</div></div>
                      <div><span className="text-fg-subtle">Referensi</span><div className="font-mono">{holding.acquisition_reference ?? '—'}</div></div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </Stack>
  )
}
