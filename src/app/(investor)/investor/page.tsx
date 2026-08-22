import Link from 'next/link'
import type { Metadata } from 'next'
import { INVESTOR_STATUS_DESCRIPTIONS } from '@/core/investors/status'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { PageHeader, Stack } from '@/ui/layout'
import { InvestorStatusPill } from '@/ui/status'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Ringkasan' }

export default async function InvestorOverviewPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const liveTopic = topics.investor(principal.investorId)

  const { data: history } = await supabase
    .from('investor_status_history')
    .select('id, from_status, to_status, reason, created_at')
    .eq('investor_id', principal.investorId)
    .order('created_at', { ascending: false })
    .limit(10)

  let holdings: Array<{ id: string; units: number | string; ownership_bps: number | string; status: string }> = []
  let documentCount = 0
  let financialReportCount = 0

  if (principal.hasDataAccess) {
    const [{ data: holdingRows }, { count: documentsCount }, { count: reportsCount }] = await Promise.all([
      supabase
        .from('ownership_holdings')
        .select('id, units, ownership_bps, status')
        .eq('investor_id', principal.investorId),
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .in('visibility', ['investors', 'restricted']),
      supabase
        .from('financial_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('visibility', 'investors'),
    ])

    holdings = holdingRows ?? []
    documentCount = documentsCount ?? 0
    financialReportCount = reportsCount ?? 0
  }

  const totalUnits = holdings.reduce((sum, holding) => sum + Number(holding.units), 0)
  const totalOwnershipBps = holdings.reduce((sum, holding) => sum + Number(holding.ownership_bps), 0)
  const activeHoldings = holdings.filter((holding) => holding.status === 'active').length

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={liveTopic}
        kinds={[
          'investor.status_changed',
          'investor.document_shared',
          'investor.document_revoked',
          'message.received',
        ]}
      />

      <PageHeader
        eyebrow="Investor Relations"
        title={`Halo, ${principal.fullName.split(' ')[0]}`}
        description="Ringkasan akses, kepemilikan, dokumen, dan informasi investasi yang telah dipublikasikan Admin."
      />

      {!principal.hasDataAccess ? (
        <Alert tone="info" title={`Status: ${principal.status}`}>
          {INVESTOR_STATUS_DESCRIPTIONS[principal.status]} Anda akan menerima pemberitahuan ketika
          statusnya berubah.
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody>
              <div className="text-caption text-fg-subtle">Total unit</div>
              <div className="mt-1 text-heading-lg font-semibold tabular">{totalUnits.toLocaleString('id-ID')}</div>
              <Link href="/investor/ownership" className="mt-2 inline-block text-body-sm text-link hover:underline">
                Lihat kepemilikan →
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-caption text-fg-subtle">Total porsi</div>
              <div className="mt-1 text-heading-lg font-semibold tabular">
                {(totalOwnershipBps / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%
              </div>
              <div className="mt-2 text-caption text-fg-subtle">{activeHoldings} holding aktif</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-caption text-fg-subtle">Dokumen tersedia</div>
              <div className="mt-1 text-heading-lg font-semibold tabular">{documentCount.toLocaleString('id-ID')}</div>
              <Link href="/investor/documents" className="mt-2 inline-block text-body-sm text-link hover:underline">
                Buka Data Room →
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-caption text-fg-subtle">Laporan keuangan</div>
              <div className="mt-1 text-heading-lg font-semibold tabular">{financialReportCount.toLocaleString('id-ID')}</div>
              <Link href="/investor/financials" className="mt-2 inline-block text-body-sm text-link hover:underline">
                Lihat laporan →
              </Link>
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profil investor</CardTitle>
        </CardHeader>
        <CardBody>
          <DetailList>
            <DetailRow label="Kode investor">
              <span className="font-mono">{principal.referenceCode}</span>
            </DetailRow>
            <DetailRow label="Nama sesuai identitas">{principal.legalName}</DetailRow>
            <DetailRow label="Surel">{principal.email}</DetailRow>
            <DetailRow label="Status">
              <InvestorStatusPill status={principal.status} />
            </DetailRow>
          </DetailList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat status</CardTitle>
        </CardHeader>
        <CardBody>
          {!history || history.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat"
              description="Perubahan status pengajuan Anda akan tercatat di sini."
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-3">
                  <time
                    dateTime={entry.created_at}
                    className="text-caption tabular text-fg-subtle font-mono"
                  >
                    {formatDateTime(entry.created_at, { timeZone: principal.timezone })}
                  </time>
                  <InvestorStatusPill status={entry.to_status} size="sm" />
                  {entry.reason ? (
                    <span className="text-body-sm text-fg-muted">{entry.reason}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
