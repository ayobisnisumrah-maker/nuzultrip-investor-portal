import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock3, GitBranch, Users } from 'lucide-react'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Pewarisan Kepemilikan' }

const STATUS_LABEL: Record<string, string> = {
  requested: 'Diajukan',
  under_review: 'Ditinjau',
  approved: 'Disetujui',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
}

export default async function OwnershipInheritancePage() {
  const principal = await adminWithPermission('ownership_inheritance.view', '/admin/ownership/inheritance')
  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk melihat proses pewarisan kepemilikan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const { data: requests, error } = await supabase
    .from('ownership_inheritance')
    .select('id, holding_id, current_investor_id, beneficiary_name, beneficiary_email, beneficiary_phone, units, status, requested_at, approved_at, completed_at, rejection_reason, notes, updated_at')
    .order('requested_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <Alert tone="danger" title="Pewarisan tidak dapat dimuat">
        Sistem gagal mengambil data proses pewarisan kepemilikan.
      </Alert>
    )
  }

  const investorIds = [...new Set((requests ?? []).map((item) => item.current_investor_id))]
  const holdingIds = [...new Set((requests ?? []).map((item) => item.holding_id))]
  const [{ data: investors }, { data: holdings }] = await Promise.all([
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
  ])

  const investorMap = new Map((investors ?? []).map((item) => [item.id, item]))
  const holdingMap = new Map((holdings ?? []).map((item) => [item.id, item]))
  const rows = requests ?? []
  const pending = rows.filter((item) => !['completed', 'rejected', 'cancelled'].includes(item.status)).length
  const completed = rows.filter((item) => item.status === 'completed').length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Kepemilikan"
        title="Pewarisan Kepemilikan"
        description="Pantau pengajuan pewarisan unit kepemilikan, investor asal, calon penerima, serta status penyelesaiannya."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/ownership">Kembali ke Kepemilikan</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody className="flex items-center gap-3 py-5"><GitBranch className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Total pengajuan</p><p className="text-heading-sm text-fg font-semibold">{rows.length}</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3 py-5"><Clock3 className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Dalam proses</p><p className="text-heading-sm text-fg font-semibold">{pending}</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3 py-5"><Users className="text-fg-muted size-5" aria-hidden="true" /><div><p className="text-caption text-fg-muted">Selesai</p><p className="text-heading-sm text-fg font-semibold">{completed}</p></div></CardBody></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar proses pewarisan</CardTitle></CardHeader>
        <CardBody>
          {!rows.length ? (
            <EmptyState
              title="Belum ada pengajuan pewarisan"
              description="Pengajuan pewarisan yang dibuat melalui workflow kepemilikan akan muncul di sini. Tidak ada pengajuan contoh yang dibuat otomatis."
            />
          ) : (
            <div className="divide-border divide-y">
              {rows.map((request) => {
                const investor = investorMap.get(request.current_investor_id)
                const holding = holdingMap.get(request.holding_id)
                const investorName = investor
                  ? investor.investor_type === 'institution'
                    ? investor.organization_name || investor.legal_name
                    : investor.legal_name
                  : 'Investor tidak ditemukan'
                return (
                  <article key={request.id} className="grid gap-4 py-5 first:pt-0 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
                    <div>
                      <p className="text-caption text-fg-subtle">Investor asal</p>
                      {investor ? (
                        <Link href={`/admin/investors/${investor.id}`} className="text-fg font-semibold hover:underline">{investorName}</Link>
                      ) : (
                        <p className="text-fg font-semibold">{investorName}</p>
                      )}
                      {investor ? <p className="text-caption text-fg-muted font-mono">{investor.reference_code}</p> : null}
                      <p className="text-body-sm text-fg-muted mt-2">
                        {request.units} unit diajukan
                        {holding ? ` dari ${holding.units} unit pada holding` : ''}
                      </p>
                      {holding?.acquisition_reference ? <p className="text-caption text-fg-subtle mt-1">Ref. {holding.acquisition_reference}</p> : null}
                    </div>

                    <div>
                      <p className="text-caption text-fg-subtle">Calon penerima</p>
                      <p className="text-fg font-semibold">{request.beneficiary_name}</p>
                      <p className="text-body-sm text-fg-muted">{request.beneficiary_email || 'Email belum diisi'}</p>
                      <p className="text-body-sm text-fg-muted">{request.beneficiary_phone || 'Telepon belum diisi'}</p>
                      {request.notes ? <p className="text-caption text-fg-muted mt-2 whitespace-pre-wrap">{request.notes}</p> : null}
                      {request.rejection_reason ? <p className="text-caption text-danger mt-2">Alasan: {request.rejection_reason}</p> : null}
                    </div>

                    <div className="lg:min-w-44 lg:text-right">
                      <span className="border-border bg-surface-muted text-caption text-fg inline-flex rounded-full border px-2.5 py-1 font-medium">
                        {STATUS_LABEL[request.status] ?? request.status}
                      </span>
                      <p className="text-caption text-fg-subtle mt-2">Diajukan {formatDateTime(request.requested_at)}</p>
                      {request.approved_at ? <p className="text-caption text-fg-subtle">Disetujui {formatDateTime(request.approved_at)}</p> : null}
                      {request.completed_at ? <p className="text-caption text-fg-subtle">Selesai {formatDateTime(request.completed_at)}</p> : null}
                    </div>
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
