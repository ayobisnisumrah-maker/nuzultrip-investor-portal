import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, ChevronLeft, ChevronRight, Search, UserCheck, Users } from 'lucide-react'

import {
  INVESTOR_STATUS_LABELS,
  INVESTOR_STATUSES,
  type InvestorStatus,
} from '@/core/investors/status'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatNumber } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { Grid, PageHeader, Stack } from '@/ui/layout'
import { StatCard } from '@/ui/data'
import { InvestorStatusPill } from '@/ui/status'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = {
  title: 'Investor',
}

const PAGE_SIZE = 20

type InvestorType = 'individual' | 'institution'

type SearchParams = {
  q?: string
  status?: string
  type?: string
  page?: string
}

function parseStatus(value: string | undefined): InvestorStatus | undefined {
  if (!value) return undefined

  return (INVESTOR_STATUSES as readonly string[]).includes(value)
    ? (value as InvestorStatus)
    : undefined
}

function parseInvestorType(value: string | undefined): InvestorType | undefined {
  if (value === 'individual' || value === 'institution') {
    return value
  }

  return undefined
}

function buildQuery(params: SearchParams) {
  const query = new URLSearchParams()

  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.type) query.set('type', params.type)
  if (params.page && params.page !== '1') {
    query.set('page', params.page)
  }

  const value = query.toString()

  return value ? `?${value}` : ''
}

export default async function AdminInvestorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const principal = await requireAdminPage('/admin/investors')

  if (!principal.permissions.has('investors.view')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat data investor.
      </Alert>
    )
  }

  const params = await searchParams
  const supabase = await getServerSupabase()

  const q = params.q?.trim() ?? ''
  const status = parseStatus(params.status)
  const investorType = parseInvestorType(params.type)

  const requestedPage = Number.parseInt(params.page ?? '1', 10)

  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

  let query = supabase
    .from('investors')
    .select(
      `
        id,
        reference_code,
        status,
        investor_type,
        legal_name,
        organization_name,
        country,
        city,
        applied_at,
        created_at
      `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')

    query = query.or(`legal_name.ilike.%${escaped}%,reference_code.ilike.%${escaped}%`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (investorType) {
    query = query.eq('investor_type', investorType)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: investors, count, error } = await query.range(from, to)

  if (error) {
    return (
      <Stack gap={6}>
        <PageHeader
          eyebrow="Investor Relations"
          title="Investor"
          description="Kelola seluruh calon investor dan investor aktif."
        />

        <Alert tone="danger" title="Data investor tidak dapat dimuat">
          Sistem gagal mengambil data investor. Silakan coba lagi.
        </Alert>
      </Stack>
    )
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const { data: statusRows } = await supabase.from('investors').select('status')

  const statusCounts = new Map<InvestorStatus, number>()

  for (const row of statusRows ?? []) {
    const value = row.status

    statusCounts.set(value, (statusCounts.get(value) ?? 0) + 1)
  }

  const activeCount = statusCounts.get('active') ?? 0

  const submittedCount = statusCounts.get('submitted') ?? 0

  const reviewCount = statusCounts.get('under_review') ?? 0

  const approvedCount = statusCounts.get('approved') ?? 0

  const previousQuery =
    page > 1
      ? buildQuery({
          q,
          status,
          type: investorType,
          page: String(page - 1),
        })
      : ''

  const nextQuery =
    page < totalPages
      ? buildQuery({
          q,
          status,
          type: investorType,
          page: String(page + 1),
        })
      : ''

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={topics.admin()}
        kinds={['investor.applied', 'investor.status_changed']}
      />

      <PageHeader
        eyebrow="Investor Relations"
        title="Investor"
        description="Kelola pengajuan, proses peninjauan, dan investor aktif dari satu tempat."
      />

      <Grid min="15rem" gap={4}>
        <StatCard
          label="Total investor"
          value={formatNumber(total)}
          context="hasil sesuai filter"
          icon={<Users aria-hidden="true" className="size-4" />}
        />

        <StatCard
          label="Pengajuan baru"
          value={formatNumber(submittedCount)}
          context="status diajukan"
          icon={<UserCheck aria-hidden="true" className="size-4" />}
        />

        <StatCard
          label="Dalam peninjauan"
          value={formatNumber(reviewCount)}
          context="sedang ditinjau"
          icon={<Search aria-hidden="true" className="size-4" />}
        />

        <StatCard
          label="Disetujui"
          value={formatNumber(approvedCount)}
          context="belum atau sudah aktif"
          icon={<UserCheck aria-hidden="true" className="size-4" />}
        />

        <StatCard
          label="Aktif"
          value={formatNumber(activeCount)}
          context="akses investor aktif"
          icon={<Building2 aria-hidden="true" className="size-4" />}
        />
      </Grid>

      <Card>
        <CardHeader>
          <CardTitle>Daftar investor</CardTitle>

          <p className="text-body-sm text-fg-muted">
            Data berasal langsung dari database investor dan mengikuti permission akun Anda.
          </p>
        </CardHeader>

        <CardBody>
          <form
            method="get"
            className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]"
          >
            <label className="relative">
              <span className="sr-only">Cari investor</span>

              <Search
                aria-hidden="true"
                className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />

              <input
                name="q"
                defaultValue={q}
                placeholder="Cari nama atau reference code..."
                className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid focus:ring-accent-solid/20 h-10 w-full rounded-lg border pr-3 pl-9 transition outline-none focus:ring-2"
              />
            </label>

            <select
              name="status"
              defaultValue={status ?? ''}
              className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-10 rounded-lg border px-3 outline-none"
            >
              <option value="">Semua status</option>

              {INVESTOR_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {INVESTOR_STATUS_LABELS[value]}
                </option>
              ))}
            </select>

            <select
              name="type"
              defaultValue={investorType ?? ''}
              className="border-border bg-canvas text-body-sm text-fg focus:border-accent-solid h-10 rounded-lg border px-3 outline-none"
            >
              <option value="">Semua tipe</option>

              <option value="individual">Individu</option>

              <option value="institution">Institusi</option>
            </select>

            <button
              type="submit"
              className="bg-accent-solid text-body-sm text-accent-contrast h-10 rounded-lg px-4 font-medium transition hover:opacity-90"
            >
              Terapkan
            </button>
          </form>

          {investors && investors.length > 0 ? (
            <>
              <div className="border-border overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-border bg-surface-muted border-b">
                    <tr className="text-caption text-fg-subtle">
                      <th className="px-4 py-3 font-medium">Investor</th>

                      <th className="px-4 py-3 font-medium">Tipe</th>

                      <th className="px-4 py-3 font-medium">Lokasi</th>

                      <th className="px-4 py-3 font-medium">Status</th>

                      <th className="px-4 py-3 font-medium">Pengajuan</th>

                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-border divide-y">
                    {investors.map((investor) => {
                      const label =
                        investor.investor_type === 'institution'
                          ? investor.organization_name || 'Institusi'
                          : investor.legal_name

                      return (
                        <tr key={investor.id} className="hover:bg-surface-muted/60 transition">
                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <p className="text-body-sm text-fg font-medium">{label}</p>

                              <p className="text-caption text-fg-subtle mt-0.5 font-mono">
                                {investor.reference_code}
                              </p>
                            </div>
                          </td>

                          <td className="text-body-sm text-fg-muted px-4 py-4">
                            {investor.investor_type === 'institution' ? 'Institusi' : 'Individu'}
                          </td>

                          <td className="text-body-sm text-fg-muted px-4 py-4">
                            {[investor.city, investor.country].filter(Boolean).join(', ') || '—'}
                          </td>

                          <td className="px-4 py-4">
                            <InvestorStatusPill status={investor.status} size="sm" />
                          </td>

                          <td className="text-caption text-fg-muted px-4 py-4 font-mono">
                            {investor.applied_at
                              ? new Intl.DateTimeFormat('id-ID', {
                                  dateStyle: 'medium',
                                }).format(new Date(investor.applied_at))
                              : '—'}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <Link
                              href={`/admin/investors/${investor.id}`}
                              className="border-border text-body-sm text-fg hover:bg-surface-muted inline-flex h-9 items-center rounded-lg border px-3 font-medium transition"
                            >
                              Detail
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-caption text-fg-subtle">
                  Menampilkan {from + 1}–{Math.min(from + PAGE_SIZE, total)} dari {total} investor
                </p>

                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={`/admin/investors${previousQuery}`}
                      className="border-border text-body-sm text-fg hover:bg-surface-muted inline-flex h-9 items-center gap-1 rounded-lg border px-3 transition"
                    >
                      <ChevronLeft aria-hidden="true" className="size-4" />
                      Sebelumnya
                    </Link>
                  ) : null}

                  {page < totalPages ? (
                    <Link
                      href={`/admin/investors${nextQuery}`}
                      className="border-border text-body-sm text-fg hover:bg-surface-muted inline-flex h-9 items-center gap-1 rounded-lg border px-3 transition"
                    >
                      Berikutnya
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Tidak ada investor"
              description={
                q || status || investorType
                  ? 'Tidak ada investor yang cocok dengan filter saat ini.'
                  : 'Belum ada investor yang terdaftar di sistem.'
              }
            />
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
