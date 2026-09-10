import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Inbox,
  UserCheck,
  Users,
} from 'lucide-react'

import { hasPermission } from '@/core/auth/principal'
import { INVESTOR_STATUS_LABELS, type InvestorStatus } from '@/core/investors/status'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { formatNumber } from '@/lib/format'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getAdminCashflowDashboardData } from '@/server/dashboard/transaction-cashflow-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { StatCard } from '@/ui/data'
import { Grid, PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'
import { InvestorStatusPill } from '@/ui/status'

export const metadata: Metadata = {
  title: 'Dasbor',
}

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const monthFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatMonth(value: string) {
  return monthFormatter.format(new Date(`${value}T00:00:00Z`))
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export default async function AdminDashboardPage() {
  const principal = await requireAdminPage()
  const supabase = await getServerSupabase()

  const canSeeInvestors = hasPermission(principal, 'investors.view')
  const canSeeInquiries = hasPermission(principal, 'inquiries.view')
  const canSeeDocuments = hasPermission(principal, 'documents.view')
  const canSeeFinancials = hasPermission(principal, 'financial_reports.view')

  const [investorRows, inquiryCount, documentCount, cashflow] = await Promise.all([
    canSeeInvestors
      ? supabase
          .from('investors')
          .select('status')
          .then((result) => result.data ?? [])
      : Promise.resolve(null),
    canSeeInquiries
      ? supabase
          .from('portal_inquiries')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('status', 'new')
          .then((result) => result.count ?? 0)
      : Promise.resolve(null),
    canSeeDocuments
      ? supabase
          .from('documents')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('status', 'published')
          .then((result) => result.count ?? 0)
      : Promise.resolve(null),
    canSeeFinancials
      ? getAdminCashflowDashboardData(supabase, 6)
      : Promise.resolve({ months: [], activity: [] }),
  ])

  const byStatus = new Map<InvestorStatus, number>()

  for (const row of investorRows ?? []) {
    const status = row.status
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
  }

  const totalInvestors = investorRows?.length ?? 0
  const activeInvestors = byStatus.get('active') ?? 0
  const pendingReview = (byStatus.get('submitted') ?? 0) + (byStatus.get('under_review') ?? 0)
  const statusEntries = [...byStatus.entries()].sort((a, b) => b[1] - a[1])
  const currentMonth = cashflow.months[0] ?? null

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={topics.admin()}
        kinds={[
          'investor.applied',
          'investor.status_changed',
          'inquiry.received',
          'document.state_changed',
        ]}
      />

      <PageHeader
        eyebrow="Hubungan Investor"
        title={`Selamat datang, ${principal.fullName.split(' ')[0]}`}
        description="Pusat kendali operasional hubungan investor Nuzultrip."
      />

      <Grid min="15rem" gap={4}>
        {canSeeInvestors ? (
          <>
            <StatCard
              label="Total investor"
              testId="stat-total-investors"
              value={formatNumber(totalInvestors)}
              context="seluruh investor terdaftar"
              icon={<Users aria-hidden="true" className="size-4" />}
            />
            <StatCard
              label="Investor aktif"
              testId="stat-active-investors"
              value={formatNumber(activeInvestors)}
              context="status aktif saat ini"
              icon={<UserCheck aria-hidden="true" className="size-4" />}
            />
            <StatCard
              label="Menunggu peninjauan"
              testId="stat-pending-review"
              value={formatNumber(pendingReview)}
              context="diajukan dan sedang ditinjau"
              icon={<UserCheck aria-hidden="true" className="size-4" />}
            />
          </>
        ) : null}

        {canSeeInquiries ? (
          <StatCard
            label="Permintaan baru"
            testId="stat-new-inquiries"
            value={formatNumber(inquiryCount ?? 0)}
            context="dari portal publik"
            icon={<Inbox aria-hidden="true" className="size-4" />}
          />
        ) : null}

        {canSeeDocuments ? (
          <StatCard
            label="Dokumen terbit"
            testId="stat-published-documents"
            value={formatNumber(documentCount ?? 0)}
            context="tersedia untuk investor"
            icon={<FileText aria-hidden="true" className="size-4" />}
          />
        ) : null}
      </Grid>

      {canSeeFinancials ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
                Arus Transaksi
              </p>
              <h2 className="font-display text-heading-md text-fg mt-1">Arus masuk & keluar</h2>
              <p className="text-body-sm text-fg-muted mt-1">
                Ringkasan kas transaksi dan jumlah pax enam bulan terakhir. Admin dapat melihat rincian transaksi di bawah.
              </p>
            </div>
            <Link
              href="/admin/financials/operations"
              className="text-body-sm text-link font-medium hover:underline"
            >
              Buka Kasir & Invoice →
            </Link>
          </div>

          {currentMonth ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardBody>
                  <div className="text-caption text-fg-subtle">Arus masuk bulan ini</div>
                  <div className="text-heading-sm tabular mt-1 font-semibold">
                    {rupiah.format(currentMonth.cashIn)}
                  </div>
                  <div className="text-caption text-fg-subtle mt-2">{formatMonth(currentMonth.monthStart)}</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-caption text-fg-subtle">Arus keluar bulan ini</div>
                  <div className="text-heading-sm tabular mt-1 font-semibold">
                    {rupiah.format(currentMonth.cashOut)}
                  </div>
                  <div className="text-caption text-fg-subtle mt-2">refund + pengeluaran tercatat</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-caption text-fg-subtle">Arus bersih bulan ini</div>
                  <div className="text-heading-sm tabular mt-1 font-semibold">
                    {rupiah.format(currentMonth.netCashflow)}
                  </div>
                  <div className="text-caption text-fg-subtle mt-2">masuk dikurangi keluar</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-caption text-fg-subtle">Pax bulan ini</div>
                  <div className="text-heading-lg tabular mt-1 font-semibold">
                    {formatNumber(currentMonth.pax)}
                  </div>
                  <div className="text-caption text-fg-subtle mt-2">invoice terbit berunit pax/jamaah/orang</div>
                </CardBody>
              </Card>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan transaksi bulanan</CardTitle>
            </CardHeader>
            <CardBody>
              {cashflow.months.length === 0 ? (
                <EmptyState
                  title="Belum ada transaksi keuangan"
                  description="Pembayaran, refund, dan pengeluaran yang tercatat di Kasir & Invoice akan diringkas per bulan di sini."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="border-border text-caption text-fg-subtle border-b">
                        <th className="px-3 py-2 font-medium">Bulan</th>
                        <th className="px-3 py-2 text-right font-medium">Arus masuk</th>
                        <th className="px-3 py-2 text-right font-medium">Arus keluar</th>
                        <th className="px-3 py-2 text-right font-medium">Arus bersih</th>
                        <th className="px-3 py-2 text-right font-medium">Pax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {cashflow.months.map((row) => (
                        <tr key={row.monthStart} className="text-body-sm">
                          <td className="px-3 py-3 font-medium">{formatMonth(row.monthStart)}</td>
                          <td className="tabular px-3 py-3 text-right font-mono">{rupiah.format(row.cashIn)}</td>
                          <td className="tabular px-3 py-3 text-right font-mono">{rupiah.format(row.cashOut)}</td>
                          <td className="tabular px-3 py-3 text-right font-mono">{rupiah.format(row.netCashflow)}</td>
                          <td className="tabular px-3 py-3 text-right font-mono">{formatNumber(row.pax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Detail transaksi terbaru</CardTitle>
                  <p className="text-body-sm text-fg-muted mt-1">
                    Rincian ini hanya tampil untuk Admin yang memiliki izin melihat laporan keuangan.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {cashflow.activity.length === 0 ? (
                <EmptyState
                  title="Belum ada detail transaksi"
                  description="Transaksi masuk dan keluar akan muncul di sini setelah dicatat pada modul keuangan."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left">
                    <thead>
                      <tr className="border-border text-caption text-fg-subtle border-b">
                        <th className="px-3 py-2 font-medium">Tanggal</th>
                        <th className="px-3 py-2 font-medium">Arus</th>
                        <th className="px-3 py-2 font-medium">Referensi</th>
                        <th className="px-3 py-2 font-medium">Pelanggan / Vendor</th>
                        <th className="px-3 py-2 font-medium">Keterangan</th>
                        <th className="px-3 py-2 text-right font-medium">Nominal</th>
                        <th className="px-3 py-2 text-right font-medium">Pax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {cashflow.activity.map((row) => (
                        <tr key={row.id} className="text-body-sm align-top">
                          <td className="whitespace-nowrap px-3 py-3">{formatDate(row.occurredAt)}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              {row.direction === 'in' ? (
                                <ArrowDownLeft aria-hidden="true" className="size-4" />
                              ) : (
                                <ArrowUpRight aria-hidden="true" className="size-4" />
                              )}
                              {row.direction === 'in' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-mono">{row.reference}</div>
                            {row.sourceReference ? (
                              <div className="text-caption text-fg-subtle mt-1 font-mono">
                                {row.sourceReference}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">{row.counterparty ?? '—'}</td>
                          <td className="text-fg-muted px-3 py-3">{row.detail}</td>
                          <td className="tabular px-3 py-3 text-right font-mono">
                            {row.currency === 'IDR'
                              ? rupiah.format(row.amount)
                              : `${row.currency} ${formatNumber(row.amount)}`}
                          </td>
                          <td className="tabular px-3 py-3 text-right font-mono">
                            {row.pax === null ? '—' : formatNumber(row.pax)}
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

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        {canSeeInvestors ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Sebaran status investor</CardTitle>
                  <p className="text-body-sm text-fg-muted mt-1">
                    Kondisi investor berdasarkan status terkini.
                  </p>
                </div>
                <div className="border-border bg-canvas text-caption text-fg-muted hidden rounded-md border px-2.5 py-1.5 sm:flex sm:items-center sm:gap-1.5">
                  <span className="bg-success-solid size-1.5 rounded-full" />
                  Data realtime
                </div>
              </div>
            </CardHeader>

            <CardBody>
              {statusEntries.length === 0 ? (
                <EmptyState
                  title="Belum ada investor terdaftar"
                  description="Pengajuan yang masuk melalui portal publik akan muncul di sini setelah calon investor mengirim formulir pendaftaran."
                />
              ) : (
                <div className="space-y-3">
                  {statusEntries.map(([status, count]) => {
                    const percentage = totalInvestors > 0 ? Math.round((count / totalInvestors) * 100) : 0

                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <InvestorStatusPill status={status} size="sm" />
                          <span className="text-body-sm tabular text-fg font-mono">
                            {formatNumber(count)}
                            <span className="text-caption text-fg-subtle ml-2">{percentage}%</span>
                          </span>
                        </div>
                        <div className="bg-surface-muted h-1.5 overflow-hidden rounded-full">
                          <div
                            className="bg-accent-solid h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="sr-only">{INVESTOR_STATUS_LABELS[status]}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <Alert tone="info" title="Akses terbatas">
            Peran Anda tidak mencakup izin melihat data investor. Hubungi Super Admin bila Anda
            memerlukan akses tersebut.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan operasional</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {canSeeInquiries ? (
                <div className="border-border bg-canvas flex items-center justify-between rounded-lg border px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-surface-muted flex size-9 items-center justify-center rounded-lg">
                      <Inbox aria-hidden="true" className="text-fg-muted size-4" />
                    </div>
                    <div>
                      <p className="text-body-sm text-fg font-medium">Permintaan portal</p>
                      <p className="text-caption text-fg-subtle">Perlu diperiksa</p>
                    </div>
                  </div>
                  <span className="text-body-sm tabular text-fg font-mono">
                    {formatNumber(inquiryCount ?? 0)}
                  </span>
                </div>
              ) : null}

              {canSeeDocuments ? (
                <div className="border-border bg-canvas flex items-center justify-between rounded-lg border px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-surface-muted flex size-9 items-center justify-center rounded-lg">
                      <FileText aria-hidden="true" className="text-fg-muted size-4" />
                    </div>
                    <div>
                      <p className="text-body-sm text-fg font-medium">Dokumen investor</p>
                      <p className="text-caption text-fg-subtle">Telah diterbitkan</p>
                    </div>
                  </div>
                  <span className="text-body-sm tabular text-fg font-mono">
                    {formatNumber(documentCount ?? 0)}
                  </span>
                </div>
              ) : null}

              {canSeeInvestors ? (
                <div className="border-border bg-canvas flex items-center justify-between rounded-lg border px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-surface-muted flex size-9 items-center justify-center rounded-lg">
                      <ArrowUpRight aria-hidden="true" className="text-fg-muted size-4" />
                    </div>
                    <div>
                      <p className="text-body-sm text-fg font-medium">Peninjauan investor</p>
                      <p className="text-caption text-fg-subtle">Menunggu tindakan</p>
                    </div>
                  </div>
                  <span className="text-body-sm tabular text-fg font-mono">
                    {formatNumber(pendingReview)}
                  </span>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
    </Stack>
  )
}
