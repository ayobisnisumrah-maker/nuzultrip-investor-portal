import type { Metadata } from 'next'

import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Kepemilikan Investor' }

const STATUS_LABELS: Record<string, string> = {
  reserved: 'Dicadangkan',
  active: 'Aktif',
  transferred: 'Dialihkan',
  cancelled: 'Dibatalkan',
}

function basisPoints(value: number) {
  return `${(Number(value) / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function OwnershipPage() {
  const principal = await adminWithPermission('ownership.view', '/admin/ownership')

  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat kepemilikan investor.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const { data: holdings, error } = await supabase
    .from('ownership_holdings')
    .select(
      'id, offering_id, investor_id, units, ownership_bps, acquisition_at, transfer_eligible_at, status, acquisition_reference, notes, created_at, updated_at',
    )
    .order('acquisition_at', { ascending: false })

  if (error) {
    return (
      <Stack gap={6}>
        <RealtimeRefresher topic={topics.admin()} kinds={['ownership.changed']} />
        <PageHeader
          eyebrow="Kepemilikan"
          title="Kepemilikan Investor"
          description="Pantau seluruh unit kepemilikan investor dan statusnya."
        />
        <Alert tone="danger" title="Data kepemilikan tidak dapat dimuat">
          Sistem gagal mengambil data kepemilikan. Silakan coba lagi.
        </Alert>
      </Stack>
    )
  }

  const rows = holdings ?? []
  const investorIds = [...new Set(rows.map((item) => item.investor_id))]
  const offeringIds = [...new Set(rows.map((item) => item.offering_id))]

  const [{ data: investors }, { data: offerings }] = await Promise.all([
    investorIds.length
      ? supabase.from('investors').select('id, legal_name, reference_code, status').in('id', investorIds)
      : Promise.resolve({ data: [] }),
    offeringIds.length
      ? supabase.from('ownership_offerings').select('id, name, code, status').in('id', offeringIds)
      : Promise.resolve({ data: [] }),
  ])

  const investorMap = new Map((investors ?? []).map((item) => [item.id, item]))
  const offeringMap = new Map((offerings ?? []).map((item) => [item.id, item]))
  const activeRows = rows.filter((item) => item.status === 'active')
  const activeUnits = activeRows.reduce((sum, item) => sum + Number(item.units), 0)
  const activeBps = activeRows.reduce((sum, item) => sum + Number(item.ownership_bps), 0)
  const uniqueInvestors = new Set(activeRows.map((item) => item.investor_id)).size

  return (
    <Stack gap={8}>
      <RealtimeRefresher topic={topics.admin()} kinds={['ownership.changed']} />
      <PageHeader
        eyebrow="Kepemilikan"
        title="Kepemilikan Investor"
        description="Pantau unit, persentase, penawaran asal, eligibility transfer, dan status kepemilikan setiap investor."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardBody><div className="text-caption text-fg-subtle">Investor Aktif</div><div className="text-heading-lg mt-1 font-semibold">{uniqueInvestors}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Unit Aktif</div><div className="text-heading-lg mt-1 font-semibold tabular">{activeUnits.toLocaleString('id-ID')}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Kepemilikan Aktif</div><div className="text-heading-lg mt-1 font-semibold tabular">{basisPoints(activeBps)}</div></CardBody></Card>
        <Card><CardBody><div className="text-caption text-fg-subtle">Total Catatan</div><div className="text-heading-lg mt-1 font-semibold">{rows.length}</div></CardBody></Card>
      </div>

      {!rows.length ? (
        <EmptyState
          title="Belum ada kepemilikan"
          description="Kepemilikan yang dialokasikan dari penawaran akan muncul di sini tanpa data contoh."
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((holding) => {
            const investor = investorMap.get(holding.investor_id)
            const offering = offeringMap.get(holding.offering_id)
            return (
              <Card key={holding.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{investor?.legal_name ?? 'Investor tidak ditemukan'}</CardTitle>
                      <p className="text-body-sm text-fg-muted mt-1">
                        {investor?.reference_code ?? '—'} · {offering?.name ?? 'Penawaran tidak ditemukan'}
                      </p>
                    </div>
                    <span className="border-border rounded-full border px-3 py-1 text-caption font-medium">
                      {STATUS_LABELS[holding.status] ?? holding.status}
                    </span>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div><div className="text-caption text-fg-subtle">Unit</div><div className="mt-1 font-semibold tabular">{Number(holding.units).toLocaleString('id-ID')}</div></div>
                    <div><div className="text-caption text-fg-subtle">Kepemilikan</div><div className="mt-1 font-semibold tabular">{basisPoints(Number(holding.ownership_bps))}</div></div>
                    <div><div className="text-caption text-fg-subtle">Akuisisi</div><div className="mt-1 text-body-sm font-medium">{formatDate(holding.acquisition_at)}</div></div>
                    <div><div className="text-caption text-fg-subtle">Dapat Dialihkan</div><div className="mt-1 text-body-sm font-medium">{formatDate(holding.transfer_eligible_at)}</div></div>
                    <div><div className="text-caption text-fg-subtle">Referensi</div><div className="mt-1 text-body-sm font-medium">{holding.acquisition_reference || '—'}</div></div>
                  </div>
                  {holding.notes ? <p className="text-body-sm text-fg-muted mt-4">{holding.notes}</p> : null}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </Stack>
  )
}
