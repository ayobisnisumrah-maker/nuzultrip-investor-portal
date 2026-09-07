import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CreditCard, FileText, History, MapPin, ShieldCheck, UserRound } from 'lucide-react'
import { z } from 'zod'

import { INVESTOR_STATUS_LABELS } from '@/core/investors/status'
import { topics } from '@/core/realtime/events'
import { InvestorReviewActions } from '@/features/admin/investor-review-actions'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { formatDateTime } from '@/lib/format'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'
import { InvestorStatusPill } from '@/ui/status'

export const metadata: Metadata = { title: 'Detail investor' }

const uuidSchema = z.string().uuid()

type InvestorDocumentResult = {
  id: string
  title: string
  kind: string
  visibility: string
  status: string
}

type InvestorDocumentGrantResult = {
  id: string
  granted_at: string
  note: string | null
  document_id: string
  documents: InvestorDocumentResult | InvestorDocumentResult[] | null
}

function date(value: string | null) {
  return value ? formatDateTime(value) : '—'
}

function value(value: string | null) {
  return value?.trim() || '—'
}

function formatBytes(value: number | null) {
  if (!value) return '—'
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default async function AdminInvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()

  const principal = await requireAdminPage(`/admin/investors/${id}`)
  if (!principal.permissions.has('investors.view')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat data investor.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const { data: investor, error } = await supabase
    .from('investors')
    .select(
      'id, reference_code, status, investor_type, legal_name, organization_name, organization_role, country, city, address, whatsapp_number, bank_name, bank_account_name, bank_account_number, ktp_original_file_name, ktp_mime_type, ktp_file_size_bytes, ktp_uploaded_at, application_note, rejection_reason, applied_at, reviewed_at, approved_at, activated_at, deactivated_at, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return (
      <Alert tone="danger" title="Data investor tidak dapat dimuat">
        Sistem gagal mengambil data investor. Silakan coba lagi.
      </Alert>
    )
  }
  if (!investor) notFound()

  const [historyResult, auditResult, grantsResult] = await Promise.all([
    supabase
      .from('investor_status_history')
      .select('id, from_status, to_status, changed_by_label, reason, created_at')
      .eq('investor_id', id)
      .order('created_at', { ascending: false }),
    principal.permissions.has('audit_logs.view')
      ? supabase
          .from('audit_logs')
          .select('id, action, actor_label, summary, created_at')
          .eq('entity_type', 'investor')
          .eq('entity_id', id)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null, error: null }),
    principal.permissions.has('investor_documents.view')
      ? supabase
          .from('document_access_grants')
          .select('id, granted_at, note, document_id, documents(id, title, kind, visibility, status)')
          .eq('investor_id', id)
          .is('revoked_at', null)
          .order('granted_at', { ascending: false })
          .overrideTypes<InvestorDocumentGrantResult[]>()
      : Promise.resolve({ data: null, error: null }),
  ])

  const name =
    investor.investor_type === 'institution'
      ? investor.organization_name || investor.legal_name
      : investor.legal_name
  const location = [investor.city, investor.country].filter(Boolean).join(', ') || '—'
  const permissions = [...principal.permissions]

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={topics.investor(id)}
        kinds={['investor.status_changed', 'investor.document_shared', 'investor.document_revoked']}
      />
      <PageHeader
        className="motion-safe:animate-rise"
        eyebrow="Investor Relations"
        title={name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-caption font-mono">{investor.reference_code}</span>
            <span>{investor.investor_type === 'institution' ? 'Institusi' : 'Individu'}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {location}
            </span>
          </span>
        }
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/investors">
              <ArrowLeft aria-hidden="true" />
              Kembali ke Investor
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Stack gap={6}>
          <Card className="motion-safe:animate-rise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5" aria-hidden="true" />
                Profil investor
              </CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label="Nama legal">{investor.legal_name}</DetailRow>
                <DetailRow label="WhatsApp">{value(investor.whatsapp_number)}</DetailRow>
                {investor.organization_name ? (
                  <DetailRow label="Nama organisasi">{investor.organization_name}</DetailRow>
                ) : null}
                <DetailRow label="Tipe investor">
                  {investor.investor_type === 'institution' ? 'Institusi' : 'Individu'}
                </DetailRow>
                {investor.organization_role ? (
                  <DetailRow label="Posisi organisasi">{investor.organization_role}</DetailRow>
                ) : null}
                <DetailRow label="Negara">{investor.country}</DetailRow>
                <DetailRow label="Kota">{value(investor.city)}</DetailRow>
                <DetailRow label="Alamat">
                  <span className="whitespace-pre-wrap">{value(investor.address)}</span>
                </DetailRow>
                {investor.application_note ? (
                  <DetailRow label="Catatan pengajuan">
                    <span className="whitespace-pre-wrap">{investor.application_note}</span>
                  </DetailRow>
                ) : null}
                {investor.rejection_reason ? (
                  <DetailRow label="Alasan penolakan">
                    <span className="whitespace-pre-wrap">{investor.rejection_reason}</span>
                  </DetailRow>
                ) : null}
                <DetailRow label="Tanggal pengajuan">{date(investor.applied_at)}</DetailRow>
                <DetailRow label="Dibuat">{date(investor.created_at)}</DetailRow>
                <DetailRow label="Diperbarui">{date(investor.updated_at)}</DetailRow>
                <DetailRow label="Ditinjau">{date(investor.reviewed_at)}</DetailRow>
                <DetailRow label="Disetujui">{date(investor.approved_at)}</DetailRow>
                <DetailRow label="Diaktifkan">{date(investor.activated_at)}</DetailRow>
                {investor.deactivated_at ? (
                  <DetailRow label="Dinonaktifkan">{date(investor.deactivated_at)}</DetailRow>
                ) : null}
              </DetailList>
            </CardBody>
          </Card>

          <Card className="motion-safe:animate-rise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" aria-hidden="true" />
                Rekening pembayaran
              </CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label="Bank">{value(investor.bank_name)}</DetailRow>
                <DetailRow label="Nama pemilik rekening">{value(investor.bank_account_name)}</DetailRow>
                <DetailRow label="Nomor rekening">
                  <span className="font-mono">{value(investor.bank_account_number)}</span>
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card className="motion-safe:animate-rise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" aria-hidden="true" />
                Dokumen identitas investor
              </CardTitle>
            </CardHeader>
            <CardBody>
              {investor.ktp_original_file_name ? (
                <div className="grid gap-4">
                  <DetailList>
                    <DetailRow label="Nama file">{investor.ktp_original_file_name}</DetailRow>
                    <DetailRow label="Format">{value(investor.ktp_mime_type)}</DetailRow>
                    <DetailRow label="Ukuran">{formatBytes(investor.ktp_file_size_bytes)}</DetailRow>
                    <DetailRow label="Diunggah">{date(investor.ktp_uploaded_at)}</DetailRow>
                  </DetailList>
                  <div>
                    <Button asChild variant="secondary">
                      <a
                        href={`/api/admin/investors/${id}/identity-document`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Buka dokumen identitas
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Belum ada dokumen identitas"
                  description="Investor belum mengunggah dokumen identitas pada profilnya."
                />
              )}
            </CardBody>
          </Card>

          <Card className="motion-safe:animate-rise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" aria-hidden="true" />
                Riwayat Status
              </CardTitle>
            </CardHeader>
            <CardBody>
              {historyResult.error ? (
                <Alert tone="warning" title="Riwayat tidak dapat dimuat">
                  Riwayat status sedang tidak tersedia.
                </Alert>
              ) : historyResult.data?.length ? (
                <ol className="divide-border divide-y">
                  {historyResult.data.map((entry) => (
                    <li key={entry.id} className="py-3 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <InvestorStatusPill status={entry.to_status} size="sm" />
                        <span className="text-body-sm text-fg-muted">
                          dari{' '}
                          {entry.from_status
                            ? INVESTOR_STATUS_LABELS[entry.from_status].toLowerCase()
                            : 'status awal'}
                        </span>
                      </div>
                      <p className="text-caption text-fg-subtle mt-1">
                        {date(entry.created_at)}
                        {entry.changed_by_label ? ` · ${entry.changed_by_label}` : ''}
                      </p>
                      {entry.reason ? (
                        <p className="text-body-sm text-fg-muted mt-1">{entry.reason}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="Belum ada riwayat" description="Perubahan lifecycle investor akan tampil di sini." />
              )}
            </CardBody>
          </Card>

          {principal.permissions.has('investor_documents.view') ? (
            <Card className="motion-safe:animate-rise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5" aria-hidden="true" />
                  Dokumen yang dibagikan ke Investor
                </CardTitle>
              </CardHeader>
              <CardBody>
                {grantsResult.error ? (
                  <Alert tone="warning" title="Dokumen tidak dapat dimuat">
                    Dokumen investor sedang tidak tersedia.
                  </Alert>
                ) : grantsResult.data?.length ? (
                  <ul className="divide-border divide-y">
                    {grantsResult.data.map((grant) => {
                      const document = Array.isArray(grant.documents) ? grant.documents[0] : grant.documents
                      return (
                        <li key={grant.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                          <div>
                            <p className="text-fg font-medium">{document?.title ?? 'Dokumen tidak tersedia'}</p>
                            <p className="text-caption text-fg-subtle mt-1">Diberikan {date(grant.granted_at)}</p>
                            {grant.note ? <p className="text-body-sm text-fg-muted mt-1">{grant.note}</p> : null}
                          </div>
                          {document ? (
                            <Link
                              href={`/admin/documents/${document.id}`}
                              className="border-border text-body-sm text-fg hover:bg-surface-muted rounded-lg border px-3 py-2 font-medium transition"
                            >
                              Kelola dokumen
                            </Link>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <EmptyState title="Belum ada dokumen" description="Belum ada dokumen yang diberikan secara khusus kepada investor ini." />
                )}
              </CardBody>
            </Card>
          ) : null}

          {principal.permissions.has('audit_logs.view') ? (
            <Card className="motion-safe:animate-rise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                  Aktivitas
                </CardTitle>
              </CardHeader>
              <CardBody>
                {auditResult.error ? (
                  <Alert tone="warning" title="Aktivitas tidak dapat dimuat">
                    Aktivitas investor sedang tidak tersedia.
                  </Alert>
                ) : auditResult.data?.length ? (
                  <ol className="divide-border divide-y">
                    {auditResult.data.map((entry) => (
                      <li key={entry.id} className="py-3 first:pt-0">
                        <p className="text-body-sm text-fg">{entry.summary || entry.action}</p>
                        <p className="text-caption text-fg-subtle mt-1">
                          {date(entry.created_at)}
                          {entry.actor_label ? ` · ${entry.actor_label}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState title="Belum ada aktivitas" description="Aktivitas terkait investor ini akan tampil di sini." />
                )}
              </CardBody>
            </Card>
          ) : null}
        </Stack>

        <aside className="h-fit xl:sticky xl:top-6">
          <Card variant="raised" className="motion-safe:animate-rise">
            <CardHeader>
              <CardTitle>Lifecycle investor</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-4">
                <InvestorStatusPill status={investor.status} />
                <p className="text-body-sm text-fg-muted">{INVESTOR_STATUS_LABELS[investor.status]}</p>
                <InvestorReviewActions
                  investorId={id}
                  investorName={name}
                  status={investor.status}
                  permissions={permissions}
                />
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </Stack>
  )
}
