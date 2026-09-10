import Link from 'next/link'
import type { Metadata } from 'next'

import { INVESTOR_STATUS_DESCRIPTIONS } from '@/core/investors/status'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { InvestorFinancialDashboard } from '@/features/investor/investor-financial-dashboard'
import { formatDateTime } from '@/lib/format'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getPublishedFinancialDashboardData } from '@/server/dashboard/financial-dashboard-service'
import {
  getInvestorMonthlyCashflowSummary,
  type MonthlyCashflowSummary,
} from '@/server/dashboard/transaction-cashflow-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'
import { InvestorStatusPill } from '@/ui/status'

export const metadata: Metadata = { title: 'Ringkasan' }

const monthFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const monthNameFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  timeZone: 'UTC',
})

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(value: string) {
  return monthFormatter.format(new Date(`${value}T00:00:00Z`))
}

function formatMonthName(month: number) {
  return monthNameFormatter.format(new Date(Date.UTC(2026, month - 1, 1)))
}

type InvestorOverviewSearchParams = {
  month?: string
  year?: string
}

export default async function InvestorOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<InvestorOverviewSearchParams>
}) {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()
  const liveTopic = topics.investor(principal.investorId)
  const filters = (await searchParams) ?? {}
  const selectedMonth = /^\d{2}$/.test(filters.month ?? '') ? filters.month ?? '' : ''
  const selectedYear = /^\d{4}$/.test(filters.year ?? '') ? filters.year ?? '' : ''

  const { data: history } = await supabase
    .from('investor_status_history')
    .select('id, from_status, to_status, reason, created_at')
    .eq('investor_id', principal.investorId)
    .order('created_at', { ascending: false })
    .limit(10)

  let holdings: Array<{
    id: string
    units: number | string
    ownership_bps: number | string
    status: string
  }> = []
  let documentCount = 0
  let financialReportCount = 0
  let payableProfit = 0
  let paidProfit = 0
  let financialDashboard = null
  let transactionCashflow: MonthlyCashflowSummary[] = []

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

    ;[financialDashboard, transactionCashflow] = await Promise.all([
      getPublishedFinancialDashboardData(supabase),
      getInvestorMonthlyCashflowSummary(supabase, 12),
    ])
  }

  const availableYears = Array.from(
    new Set(transactionCashflow.map((row) => row.monthStart.slice(0, 4))),
  ).sort((a, b) => b.localeCompare(a))

  const filteredTransactionCashflow = transactionCashflow.filter((row) => {
    const year = row.monthStart.slice(0, 4)
    const month = row.monthStart.slice(5, 7)
    if (selectedYear && year !== selectedYear) return false
    if (selectedMonth && month !== selectedMonth) return false
    return true
  })

  const totalUnits = holdings.reduce((sum, holding) => sum + Number(holding.units), 0)
  const totalOwnershipBps = holdings.reduce(
    (sum, holding) => sum + Number(holding.ownership_bps),
    0,
  )
  const activeHoldings = holdings.length

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={liveTopic}
        kinds={[
          'investor.status_changed',
          'investor.document_shared',
          'investor.document_revoked',
          'ownership.changed',
          'profit_distribution.changed',
          'message.received',
          'document.published',
        ]}
      />
      <RealtimeRefresher
        topic={topics.allInvestors()}
        kinds={['document.published', 'financial_report.published']}
      />

      <PageHeader
        eyebrow="Investor Relations"
        title={`Halo, ${principal.fullName.split(' ')[0]}`}
        description="Ringkasan akses, kepemilikan, dokumen, keuangan, dan bagi hasil yang tersedia untuk akun Anda."
      />

      {!principal.hasDataAccess ? (
        <Alert tone="info" title={`Status: ${principal.status}`}>
          {INVESTOR_STATUS_DESCRIPTIONS[principal.status]} Anda akan menerima pemberitahuan ketika
          statusnya berubah.
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Unit aktif</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {totalUnits.toLocaleString('id-ID')}
                </div>
                <div className="text-caption text-fg-subtle mt-2">
                  {activeHoldings} holding aktif
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Porsi aktif</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {(totalOwnershipBps / 100).toLocaleString('id-ID', {
                    maximumFractionDigits: 2,
                  })}
                  %
                </div>
                <Link
                  href="/investor/ownership"
                  className="text-body-sm text-link mt-2 inline-block hover:underline"
                >
                  Lihat kepemilikan →
                </Link>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Dokumen tersedia</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {documentCount.toLocaleString('id-ID')}
                </div>
                <Link
                  href="/investor/documents"
                  className="text-body-sm text-link mt-2 inline-block hover:underline"
                >
                  Buka Data Room →
                </Link>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Laporan keuangan</div>
                <div className="text-heading-lg tabular mt-1 font-semibold">
                  {financialReportCount.toLocaleString('id-ID')}
                </div>
                <Link
                  href="/investor/financials"
                  className="text-body-sm text-link mt-2 inline-block hover:underline"
                >
                  Lihat laporan →
                </Link>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-caption text-fg-subtle">Bagi hasil siap dibayar</div>
                <div className="text-heading-sm tabular mt-1 font-semibold">
                  {formatRupiah(payableProfit)}
                </div>
                <div className="text-caption text-fg-subtle mt-1">
                  Terbayar {formatRupiah(paidProfit)}
                </div>
                <Link
                  href="/investor/distributions"
                  className="text-body-sm text-link mt-2 inline-block hover:underline"
                >
                  Lihat bagi hasil →
                </Link>
              </CardBody>
            </Card>
          </div>

          {totalUnits === 0 &&
          documentCount === 0 &&
          financialReportCount === 0 &&
          payableProfit === 0 &&
          paidProfit === 0 ? (
            <Alert tone="info" title="Belum ada data investasi yang diterbitkan">
              Akun Anda sudah aktif. Kepemilikan, Data Room, laporan keuangan, dan bagi hasil akan
              muncul di sini setelah Admin menerbitkan atau memberikan akses datanya.
            </Alert>
          ) : null}
        </>
      )}

      {principal.hasDataAccess ? (
        <section className="space-y-4">
          <div>
            <p className="text-caption text-fg-subtle font-medium">Aktivitas Perusahaan</p>
            <h2 className="font-display text-heading-md text-fg mt-1">Arus transaksi bulanan</h2>
          </div>

          <Card>
            <CardBody>
              <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
                <label className="text-body-sm grid gap-1.5">
                  <span className="text-fg-subtle">Bulan</span>
                  <select
                    name="month"
                    defaultValue={selectedMonth}
                    className="border-border bg-canvas h-10 rounded-lg border px-3"
                  >
                    <option value="">Semua bulan</option>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                      const value = String(month).padStart(2, '0')
                      return <option key={value} value={value}>{formatMonthName(month)}</option>
                    })}
                  </select>
                </label>
                <label className="text-body-sm grid gap-1.5">
                  <span className="text-fg-subtle">Tahun</span>
                  <select
                    name="year"
                    defaultValue={selectedYear}
                    className="border-border bg-canvas h-10 rounded-lg border px-3"
                  >
                    <option value="">Semua tahun</option>
                    {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
                <button
                  type="submit"
                  className="border-border bg-fg text-canvas h-10 rounded-lg border px-4 text-sm font-medium"
                >
                  Terapkan
                </button>
                <Link
                  href="/investor"
                  className="border-border text-fg flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium hover:bg-canvas-subtle"
                >
                  Reset
                </Link>
              </form>

              {filteredTransactionCashflow.length === 0 ? (
                <EmptyState
                  title="Tidak ada data pada periode ini"
                  description="Ubah filter bulan atau tahun untuk melihat ringkasan arus transaksi yang tersedia."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr className="border-border text-caption text-fg-subtle border-b">
                        <th className="px-3 py-2 font-medium">Bulan</th>
                        <th className="px-3 py-2 text-right font-medium">Arus masuk</th>
                        <th className="px-3 py-2 text-right font-medium">Arus keluar</th>
                        <th className="px-3 py-2 text-right font-medium">Jumlah pax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {filteredTransactionCashflow.map((row) => (
                        <tr key={row.monthStart} className="text-body-sm">
                          <td className="px-3 py-3 font-medium">{formatMonth(row.monthStart)}</td>
                          <td className="tabular px-3 py-3 text-right font-mono">
                            {formatRupiah(row.cashIn)}
                          </td>
                          <td className="tabular px-3 py-3 text-right font-mono">
                            {formatRupiah(row.cashOut)}
                          </td>
                          <td className="tabular px-3 py-3 text-right font-mono">
                            {row.pax.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </section>
      ) : null}

      {principal.hasDataAccess && financialDashboard ? (
        <section className="space-y-4">
          <div>
            <p className="text-caption text-fg-subtle font-medium">Kinerja Perusahaan</p>
            <h2 className="font-display text-heading-md text-fg mt-1">Ringkasan Keuangan</h2>
            <p className="text-body-sm text-fg-muted mt-1">
              Data berdasarkan laporan keuangan terbaru yang telah dipublikasikan kepada investor.
            </p>
          </div>
          <InvestorFinancialDashboard data={financialDashboard} />
          <div className="flex justify-end">
            <Link
              href="/investor/financials"
              className="text-body-sm text-link font-medium hover:underline"
            >
              Lihat seluruh laporan keuangan →
            </Link>
          </div>
        </section>
      ) : null}

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
          {principal.hasDataAccess ? (
            <Link
              href="/investor/profile"
              className="text-body-sm text-link mt-4 inline-block font-medium hover:underline"
            >
              Lengkapi atau perbarui profil →
            </Link>
          ) : null}
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
