import type { Metadata } from 'next'
import Link from 'next/link'

import { topics } from '@/core/realtime/events'
import { OwnershipInheritanceActions } from '@/features/admin/ownership/ownership-inheritance-actions'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { formatDateTime } from '@/lib/format'
import { adminWithPermission } from '@/server/auth/page-guards'
import {
  listAdminInheritance,
  type OwnershipInheritanceStatus,
} from '@/server/ownership/inheritance-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Pewarisan Kepemilikan' }

const STATUS_LABELS: Record<OwnershipInheritanceStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default async function OwnershipInheritancePage() {
  const principal = await adminWithPermission(
    'ownership_inheritance.view',
    '/admin/ownership/inheritance',
  )

  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk melihat proses pewarisan kepemilikan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const requests = await listAdminInheritance(supabase)

  const investorIds = [
    ...new Set(requests.map((item) => item.current_investor_id)),
  ]
  const holdingIds = [...new Set(requests.map((item) => item.holding_id))]

  const [
    { data: requestInvestors },
    { data: holdings },
    { data: beneficiaryInvestors },
  ] = await Promise.all([
    investorIds.length
      ? supabase
          .from('investors')
          .select('id, reference_code, legal_name, organization_name, investor_type')
          .in('id', investorIds)
      : Promise.resolve({ data: [] }),
    holdingIds.length
      ? supabase
          .from('ownership_holdings')
          .select('id, units, ownership_bps, status, acquisition_reference')
          .in('id', holdingIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('investors')
      .select('id, legal_name, reference_code, status')
      .in('status', ['approved', 'active'])
      .order('legal_name', { ascending: true }),
  ])

  const investorMap = new Map(
    (requestInvestors ?? []).map((item) => [item.id, item]),
  )
  const holdingMap = new Map((holdings ?? []).map((item) => [item.id, item]))
  const beneficiaryOptions = (beneficiaryInvestors ?? []).map((item) => ({
    id: item.id,
    legalName: item.legal_name,
    referenceCode: item.reference_code,
  }))

  const permissions = Array.from(principal.permissions)
  const pendingCount = requests.filter((item) => item.status === 'pending').length
  const approvedCount = requests.filter((item) => item.status === 'approved').length
  const completedCount = requests.filter((item) => item.status === 'completed').length

  return (
    <Stack gap={8}>
      <RealtimeRefresher topic={topics.admin()} kinds={['ownership.changed']} />

      <PageHeader
        eyebrow="Kepemilikan"
        title="Pewarisan Kepemilikan"
        description="Tinjau, setujui, tolak, dan selesaikan pengajuan pewarisan hingga unit resmi berpindah pada cap table."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/ownership">Kembali ke Kepemilikan</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody><p className="text-caption text-fg-subtle">Menunggu Persetujuan</p><p className="text-heading-lg mt-1 font-semibold">{pendingCount.toLocaleString('id-ID')}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Disetujui</p><p className="text-heading-lg mt-1 font-semibold">{approvedCount.toLocaleString('id-ID')}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Selesai</p><p className="text-heading-lg mt-1 font-semibold">{completedCount.toLocaleString('id-ID')}</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Pewarisan</CardTitle>
        </CardHeader>
        <CardBody>
          {!requests.length ? (
            <EmptyState
              title="Belum ada pengajuan pewarisan"
              description="Pengajuan pewarisan dari investor akan muncul di sini."
            />
          ) : (
            <div className="divide-border divide-y">
              {requests.map((request) => {
                const investor = investorMap.get(request.current_investor_id)
                const holding = holdingMap.get(request.holding_id)
                const investorName = investor
                  ? investor.investor_type === 'institution'
                    ? investor.organization_name || investor.legal_name
                    : investor.legal_name
                  : 'Investor tidak ditemukan'

                return (
                  <article
                    key={request.id}
                    className="grid gap-5 py-6 first:pt-0 xl:grid-cols-[1fr_1fr_20rem]"
                  >
                    <div>
                      <p className="text-caption text-fg-subtle">Investor asal</p>
                      {investor ? (
                        <Link
                          href={`/admin/investors/${investor.id}`}
                          className="font-semibold hover:underline"
                        >
                          {investorName}
                        </Link>
                      ) : (
                        <p className="font-semibold">{investorName}</p>
                      )}
                      {investor ? (
                        <p className="text-caption font-mono text-fg-muted">
                          {investor.reference_code}
                        </p>
                      ) : null}
                      <p className="text-body-sm mt-2 text-fg-muted">
                        {Number(request.units).toLocaleString('id-ID')} unit diajukan
                        {holding
                          ? ` dari ${Number(holding.units).toLocaleString('id-ID')} unit kepemilikan saat ini`
                          : ''}
                      </p>
                      {holding?.acquisition_reference ? (
                        <p className="text-caption mt-1 text-fg-subtle">
                          Referensi {holding.acquisition_reference}
                        </p>
                      ) : null}
                      <p className="text-caption mt-2 text-fg-subtle">
                        Diajukan {formatDateTime(request.requested_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-caption text-fg-subtle">Calon pewaris</p>
                      <p className="font-semibold">{request.beneficiary_name}</p>
                      <p className="text-body-sm text-fg-muted">
                        {request.beneficiary_email || 'Email belum diisi'}
                      </p>
                      <p className="text-body-sm text-fg-muted">
                        {request.beneficiary_phone || 'Nomor telepon belum diisi'}
                      </p>
                      <div className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-caption font-medium">
                        {STATUS_LABELS[request.status]}
                      </div>
                      {request.rejection_reason ? (
                        <p className="text-caption text-danger mt-2">
                          Alasan penolakan: {request.rejection_reason}
                        </p>
                      ) : null}
                      {request.completed_at ? (
                        <p className="text-caption mt-2 text-fg-subtle">
                          Selesai {formatDateTime(request.completed_at)}
                        </p>
                      ) : null}
                    </div>

                    <OwnershipInheritanceActions
                      request={request}
                      permissions={permissions}
                      investors={beneficiaryOptions}
                    />
                  </article>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
