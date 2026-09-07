import Link from 'next/link'
import type { Metadata } from 'next'
import { INVESTOR_STATUS_DESCRIPTIONS } from '@/core/investors/status'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { InvestorFinancialDashboard } from '@/features/investor/investor-financial-dashboard'
import { getPublishedFinancialDashboardData } from '@/server/dashboard/financial-dashboard-service'
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

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

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
  let payableProfit = 0
  let paidProfit = 0
  let financialDashboard = null

  if (principal.hasDataAccess) {
    const [holdingResult, documentsResult, reportsResult, allocationResult] = await Promise.all([
      supabase
        .from('ownership_holdings')
        .select('id, units, ownership_bps, status')
        .eq('investor_id', principal.investorId)
        .eq('status', 'active'),
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
      supabase
        .from('profit_distribution_allocations')
        .select('allocation_amount, status')
        .eq('investor_id', principal.investorId)
        .in('status', ['payable', 'paid']),
    ])

    holdings = holdingResult.data ?? []
    documentCount = documentsResult.count ?? 0
    financialReportCount = reportsResult.count ?? 0
    for (const allocation of allocationResult.data ?? []) {
      const amount = Number(allocation.allocation_amount)
      if (!Number.isFinite(amount)) continue
      if (allocation.status === 'payable') payableProfit += amount
      if (allocation.status === 'paid') paidProfit += amount
    }
    financialDashboard = await getPublishedFinancialDashboardData(supabase)
  }

  const totalUnits = holdings.reduce((sum, holding) => sum + Number(holding.units), 0)
  const totalOwnershipBps = holdings.reduce((sum, holding) => sum + Number(holding.ownership_bps), 0)
  const activeHoldings = holdings.length

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={liveTopic}
        kinds={[
          'investor.status_changed',
          'investor.document_shared',
          'investor.document_revoked',
          'message.received',
          'document.published',
        ]}
      />

      <PageHeader
        eyebrow="Investor Relations"
        title={`Halo, ${principal.fullName.split(' ')[0]}`}
        description="Ringkasan akses, kepemilikan, dokumen, keuangan, dan bagi hasil yang tersedia untuk akun Anda."
      />

      {!principal.hasDataAccess ? (
        <Alert tone="info" title={`Status: ${principal.status}`}>
          {INVESTOR_STATUS_DESCRIPTIONS[principal.status]} Anda akan menerima pemberitahuan ketika statusnya berubah.
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card><CardBody><div className="text-caption text-fg-subtle">Unit aktif</div><div className="text-heading-lg tabular mt-1 font-semibold">{totalUnits.toLocaleString('id-ID')}</div><div className="text-caption text-fg-subtle mt-2">{activeHoldings} holding aktif</div></CardBody></Card>
            <Card><CardBody><div className="text-caption text-fg-subtle">Porsi aktif</div><div className="text-heading-lg tabular mt-1 font-semibold">{(totalOwnershipBps / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%</div><Link href="/investor/ownership" className="text-body-sm text-link mt-2 inline-block hover:underline">Lihat kepemilikan →</Link></CardBody></Card>
            <Card><CardBody><div className="text-caption text-fg-subtle">Dokumen tersedia</div><div className="text-heading-lg tabular mt-1 font-semibold">{documentCount.toLocaleString('id-ID')}</div><Link href="/investor/documents" className="text-body-sm text-link mt-2 inline-block hover:underline">Buka Data Room →</Link></CardBody></Card>
            <Card><CardBody><div className="text-caption text-fg-subtle">Laporan keuangan</div><div className="text-heading-lg tabular mt-1 font-semibold">{financialReportCount.toLocaleString('id-ID')}</div><Link href="/investor/financials" className="text-body-sm text-link mt-2 inline-block hover:underline">Lihat laporan →</Link></CardBody></Card>
            <Card><CardBody><div className="text-caption text-fg-subtle">Bagi hasil siap dibayar</div><div className="text-heading-sm tabular mt-1 font-semibold">{formatRupiah(payableProfit)}</div><div className="text-caption text-fg-subtle mt-1">Terbayar {formatRupiah(paidProfit)}</div><Link href="/investor/distributions" className="text-body-sm text-link mt-2 inline-block hover:underline">Lihat bagi hasil →</Link></CardBody></Card>
          </div>

          {totalUnits === 0 && documentCount === 0 && financialReportCount === 0 && payableProfit === 0 && paidProfit === 0 ? (
            <Alert tone="info" title="Belum ada data investasi yang diterbitkan">
              Akun Anda sudah aktif. Kepemilikan, Data Room, laporan keuangan, dan bagi hasil akan muncul di sini setelah Admin menerbitkan atau memberikan akses datanya.
            </Alert>
          ) : null}
        </>
      )}

      {principal.hasDataAccess && financialDashboard ? (
        <section className="space-y-4">
          <div>
            <p className="text-caption text-fg-subtle font-medium">Kinerja Perusahaan</p>
            <h2 className="font-display text-heading-md text-fg mt-1">Ringkasan Keuangan</h2>
            <p className="text-body-sm text-fg-muted mt-1">Data berdasarkan laporan keuangan terbaru yang telah dipublikasikan kepada investor.</p>
          </div>
          <InvestorFinancialDashboard data={financialDashboard} />
          <div className="flex justify-end"><Link href="/investor/financials" className="text-body-sm text-link font-medium hover:underline">Lihat seluruh laporan keuangan →</Link></div>
        </section>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Profil investor</CardTitle></CardHeader>
        <CardBody>
          <DetailList>
            <DetailRow label="Kode investor"><span className="font-mono">{principal.referenceCode}</span></DetailRow>
            <DetailRow label="Nama sesuai identitas">{principal.legalName}</DetailRow>
            <DetailRow label="Surel">{principal.email}</DetailRow>
            <DetailRow label="Status"><InvestorStatusPill status={principal.status} /></DetailRow>
          </DetailList>
          {principal.hasDataAccess ? <Link href="/investor/profile" className="text-body-sm text-link mt-4 inline-block font-medium hover:underline">Lengkapi atau perbarui profil →</Link> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Riwayat status</CardTitle></CardHeader>
        <CardBody>
          {!history || history.length === 0 ? (
            <EmptyState title="Belum ada riwayat" description="Perubahan status pengajuan Anda akan tercatat di sini." />
          ) : (
            <ol className="flex flex-col gap-3">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-3">
                  <time dateTime={entry.created_at} className="text-caption tabular text-fg-subtle font-mono">{formatDateTime(entry.created_at, { timeZone: principal.timezone })}</time>
                  <InvestorStatusPill status={entry.to_status} size="sm" />
                  {entry.reason ? <span className="text-body-sm text-fg-muted">{entry.reason}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
