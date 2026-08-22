import type { Metadata } from 'next'

import { InvestorApplicationsManager } from '@/features/admin/investors/investor-applications-manager'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { PageHeader, Stack } from '@/ui/layout'

export const metadata: Metadata = {
  title: 'Pengajuan Investor',
}

export default async function InvestorApplicationsPage() {
  const principal = await requireAdminPage('/admin/investors/applications')

  if (!principal.permissions.has('investors.view')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat pengajuan investor.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()

  const { data: investors, error } = await supabase
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
        application_note,
        rejection_reason,
        applied_at,
        created_at
      `,
    )
    .in('status', ['submitted', 'under_review', 'approved', 'rejected'])
    .order('applied_at', {
      ascending: false,
      nullsFirst: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    return (
      <Stack gap={6}>
        <PageHeader
          eyebrow="Hubungan Investor"
          title="Pengajuan Investor"
          description="Kelola seluruh pengajuan investor dari submission sampai keputusan."
        />

        <Alert tone="danger" title="Pengajuan tidak dapat dimuat">
          Sistem gagal mengambil data pengajuan investor. Silakan coba lagi.
        </Alert>
      </Stack>
    )
  }

  const rows = investors ?? []

  const submitted = rows.filter((item) => item.status === 'submitted').length

  const underReview = rows.filter((item) => item.status === 'under_review').length

  const approved = rows.filter((item) => item.status === 'approved').length

  const rejected = rows.filter((item) => item.status === 'rejected').length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Hubungan Investor"
        title="Pengajuan Investor"
        description="Kelola submission investor, review, persetujuan, penolakan, dan aktivasi."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border bg-surface rounded-2xl border p-5">
          <div className="text-fg-muted text-sm">Menunggu Review</div>
          <div className="text-fg mt-2 text-3xl font-semibold">{submitted}</div>
        </div>

        <div className="border-border bg-surface rounded-2xl border p-5">
          <div className="text-fg-muted text-sm">Sedang Ditinjau</div>
          <div className="text-fg mt-2 text-3xl font-semibold">{underReview}</div>
        </div>

        <div className="border-border bg-surface rounded-2xl border p-5">
          <div className="text-fg-muted text-sm">Disetujui</div>
          <div className="text-fg mt-2 text-3xl font-semibold">{approved}</div>
        </div>

        <div className="border-border bg-surface rounded-2xl border p-5">
          <div className="text-fg-muted text-sm">Ditolak</div>
          <div className="text-fg mt-2 text-3xl font-semibold">{rejected}</div>
        </div>
      </div>

      <InvestorApplicationsManager
        investors={rows}
        permissions={Array.from(principal.permissions)}
      />
    </Stack>
  )
}
