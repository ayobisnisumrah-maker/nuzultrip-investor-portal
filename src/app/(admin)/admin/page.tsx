import type { Metadata } from 'next'
import {
  ArrowUpRight,
  FileText,
  Inbox,
  UserCheck,
  Users,
} from 'lucide-react'

import {
  INVESTOR_STATUS_LABELS,
  type InvestorStatus,
} from '@/core/investors/status'
import { hasPermission } from '@/core/auth/principal'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatNumber } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Grid, PageHeader, Stack } from '@/ui/layout'
import { StatCard } from '@/ui/data'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { InvestorStatusPill } from '@/ui/status'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = {
  title: 'Dasbor',
}

export default async function AdminDashboardPage() {
  const principal = await requireAdminPage()
  const supabase = await getServerSupabase()

  const canSeeInvestors = hasPermission(
    principal,
    'investors.view',
  )

  const canSeeInquiries = hasPermission(
    principal,
    'inquiries.view',
  )

  const canSeeDocuments = hasPermission(
    principal,
    'documents.view',
  )

  const [
    investorRows,
    inquiryCount,
    documentCount,
  ] = await Promise.all([
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
  ])

  const byStatus = new Map<InvestorStatus, number>()

  for (const row of investorRows ?? []) {
    const status = row.status

    byStatus.set(
      status,
      (byStatus.get(status) ?? 0) + 1,
    )
  }

  const totalInvestors =
    investorRows?.length ?? 0

  const activeInvestors =
    byStatus.get('active') ?? 0

  const pendingReview =
    (byStatus.get('submitted') ?? 0) +
    (byStatus.get('under_review') ?? 0)

  const statusEntries = [
    ...byStatus.entries(),
  ].sort((a, b) => b[1] - a[1])

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
        eyebrow="Investor Relations"
        title={`Selamat datang, ${principal.fullName.split(' ')[0]}`}
        description="Pusat kendali operasional hubungan investor Nuzultrip."
      />

      <Grid
        min="15rem"
        gap={4}
      >
        {canSeeInvestors ? (
          <>
            <StatCard
              label="Total investor"
              testId="stat-total-investors"
              value={formatNumber(totalInvestors)}
              context="seluruh investor terdaftar"
              icon={
                <Users
                  aria-hidden="true"
                  className="size-4"
                />
              }
            />

            <StatCard
              label="Investor aktif"
              testId="stat-active-investors"
              value={formatNumber(activeInvestors)}
              context="status aktif saat ini"
              icon={
                <UserCheck
                  aria-hidden="true"
                  className="size-4"
                />
              }
            />

            <StatCard
              label="Menunggu peninjauan"
              testId="stat-pending-review"
              value={formatNumber(pendingReview)}
              context="diajukan dan sedang ditinjau"
              icon={
                <UserCheck
                  aria-hidden="true"
                  className="size-4"
                />
              }
            />
          </>
        ) : null}

        {canSeeInquiries ? (
          <StatCard
            label="Permintaan baru"
            testId="stat-new-inquiries"
            value={formatNumber(
              inquiryCount ?? 0,
            )}
            context="dari portal publik"
            icon={
              <Inbox
                aria-hidden="true"
                className="size-4"
              />
            }
          />
        ) : null}

        {canSeeDocuments ? (
          <StatCard
            label="Dokumen terbit"
            testId="stat-published-documents"
            value={formatNumber(
              documentCount ?? 0,
            )}
            context="tersedia untuk investor"
            icon={
              <FileText
                aria-hidden="true"
                className="size-4"
              />
            }
          />
        ) : null}
      </Grid>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        {canSeeInvestors ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>
                    Sebaran status investor
                  </CardTitle>

                  <p className="mt-1 text-body-sm text-fg-muted">
                    Kondisi investor berdasarkan status
                    terkini.
                  </p>
                </div>

                <div className="hidden rounded-md border border-border bg-canvas px-2.5 py-1.5 text-caption text-fg-muted sm:flex sm:items-center sm:gap-1.5">
                  <span className="size-1.5 rounded-full bg-success-solid" />
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
                  {statusEntries.map(
                    ([status, count]) => {
                      const percentage =
                        totalInvestors > 0
                          ? Math.round(
                              (count /
                                totalInvestors) *
                                100,
                            )
                          : 0

                      return (
                        <div
                          key={status}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <InvestorStatusPill
                              status={status}
                              size="sm"
                            />

                            <span className="font-mono text-body-sm tabular text-fg">
                              {formatNumber(count)}
                              <span className="ml-2 text-caption text-fg-subtle">
                                {percentage}%
                              </span>
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                            <div
                              className="h-full rounded-full bg-accent-solid transition-[width] duration-500"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>

                          <span className="sr-only">
                            {
                              INVESTOR_STATUS_LABELS[
                                status
                              ]
                            }
                          </span>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <Alert
            tone="info"
            title="Akses terbatas"
          >
            Peran Anda tidak mencakup izin melihat
            data investor. Hubungi Super Admin bila
            Anda memerlukan akses tersebut.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              Ringkasan operasional
            </CardTitle>
          </CardHeader>

          <CardBody>
            <div className="space-y-2">
              {canSeeInquiries ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-surface-muted">
                      <Inbox
                        aria-hidden="true"
                        className="size-4 text-fg-muted"
                      />
                    </div>

                    <div>
                      <p className="text-body-sm font-medium text-fg">
                        Permintaan portal
                      </p>
                      <p className="text-caption text-fg-subtle">
                        Perlu diperiksa
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-body-sm tabular text-fg">
                    {formatNumber(
                      inquiryCount ?? 0,
                    )}
                  </span>
                </div>
              ) : null}

              {canSeeDocuments ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-surface-muted">
                      <FileText
                        aria-hidden="true"
                        className="size-4 text-fg-muted"
                      />
                    </div>

                    <div>
                      <p className="text-body-sm font-medium text-fg">
                        Dokumen investor
                      </p>
                      <p className="text-caption text-fg-subtle">
                        Telah diterbitkan
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-body-sm tabular text-fg">
                    {formatNumber(
                      documentCount ?? 0,
                    )}
                  </span>
                </div>
              ) : null}

              {canSeeInvestors ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-surface-muted">
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 text-fg-muted"
                      />
                    </div>

                    <div>
                      <p className="text-body-sm font-medium text-fg">
                        Review investor
                      </p>
                      <p className="text-caption text-fg-subtle">
                        Menunggu tindakan
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-body-sm tabular text-fg">
                    {formatNumber(
                      pendingReview,
                    )}
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
