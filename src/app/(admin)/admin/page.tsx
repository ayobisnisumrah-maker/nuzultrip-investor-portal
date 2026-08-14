import type { Metadata } from 'next'
import { FileText, Inbox, UserCheck, Users } from 'lucide-react'
import { INVESTOR_STATUS_LABELS, type InvestorStatus } from '@/core/investors/status'
import { hasPermission } from '@/core/auth/principal'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatNumber } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Grid, PageHeader, Stack } from '@/ui/layout'
import { StatCard } from '@/ui/data'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { InvestorStatusPill } from '@/ui/status'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Dasbor' }

/**
 * The dashboard shows real aggregates, computed under the caller's own RLS
 * context. An admin without `investors.view` sees no investor counts — not a
 * zero, which would be a lie, but nothing at all.
 */
export default async function AdminDashboardPage() {
  const principal = await requireAdminPage()
  const supabase = await getServerSupabase()

  const canSeeInvestors = hasPermission(principal, 'investors.view')
  const canSeeInquiries = hasPermission(principal, 'inquiries.view')
  const canSeeDocuments = hasPermission(principal, 'documents.view')

  const [investorRows, inquiryCount, documentCount] = await Promise.all([
    canSeeInvestors
      ? supabase
          .from('investors')
          .select('status')
          .then((result) => result.data ?? [])
      : Promise.resolve(null),
    canSeeInquiries
      ? supabase
          .from('portal_inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new')
          .then((result) => result.count ?? 0)
      : Promise.resolve(null),
    canSeeDocuments
      ? supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .then((result) => result.count ?? 0)
      : Promise.resolve(null),
  ])

  const byStatus = new Map<InvestorStatus, number>()
  for (const row of investorRows ?? []) {
    const status = row.status
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
  }

  const pendingReview = (byStatus.get('submitted') ?? 0) + (byStatus.get('under_review') ?? 0)

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Investor Relations"
        title={`Selamat datang, ${principal.fullName.split(' ')[0]}`}
        description="Ringkasan operasional hubungan investor Nuzultrip."
      />

      <Grid min="15rem" gap={4}>
        {canSeeInvestors ? (
          <>
            <StatCard
              label="Investor aktif"
              value={formatNumber(byStatus.get('active') ?? 0)}
              context="status aktif saat ini"
              icon={<Users aria-hidden="true" className="size-4" />}
            />
            <StatCard
              label="Menunggu peninjauan"
              value={formatNumber(pendingReview)}
              context="diajukan dan sedang ditinjau"
              icon={<UserCheck aria-hidden="true" className="size-4" />}
            />
          </>
        ) : null}

        {canSeeInquiries ? (
          <StatCard
            label="Permintaan baru"
            value={formatNumber(inquiryCount ?? 0)}
            context="dari portal publik"
            icon={<Inbox aria-hidden="true" className="size-4" />}
          />
        ) : null}

        {canSeeDocuments ? (
          <StatCard
            label="Dokumen terbit"
            value={formatNumber(documentCount ?? 0)}
            context="tersedia untuk investor"
            icon={<FileText aria-hidden="true" className="size-4" />}
          />
        ) : null}
      </Grid>

      {canSeeInvestors ? (
        <Card>
          <CardHeader>
            <CardTitle>Sebaran status investor</CardTitle>
          </CardHeader>
          <CardBody>
            {byStatus.size === 0 ? (
              <EmptyState
                title="Belum ada investor terdaftar"
                description="Pengajuan yang masuk melalui portal publik akan muncul di sini setelah calon investor mengirim formulir pendaftaran."
              />
            ) : (
              <ul className="flex flex-wrap gap-3">
                {[...byStatus.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <li
                      key={status}
                      className="border-border flex items-center gap-2.5 rounded-md border px-3 py-2"
                    >
                      <InvestorStatusPill status={status} size="sm" />
                      <span className="text-body-sm tabular text-fg font-mono">
                        {formatNumber(count)}
                      </span>
                      <span className="sr-only">{INVESTOR_STATUS_LABELS[status]}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : (
        <Alert tone="info" title="Akses terbatas">
          Peran Anda tidak mencakup izin melihat data investor. Hubungi Super Admin bila Anda
          memerlukan akses tersebut.
        </Alert>
      )}
    </Stack>
  )
}
