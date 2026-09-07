import type { Metadata } from 'next'
import Link from 'next/link'
import { FileCheck2, ShieldCheck, Users } from 'lucide-react'

import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'
import { PublicationBadge, VisibilityBadge } from '@/ui/status'

export const metadata: Metadata = { title: 'Dokumen Investor' }

export default async function InvestorDocumentsPage() {
  const principal = await adminWithPermission('investor_documents.view', '/admin/investor-documents')
  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk melihat akses dokumen investor.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const { data: grants, error } = await supabase
    .from('document_access_grants')
    .select('id, document_id, investor_id, granted_at, revoked_at, note')
    .order('granted_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <Alert tone="danger" title="Akses dokumen tidak dapat dimuat">
        Sistem gagal mengambil pemberian akses dokumen investor.
      </Alert>
    )
  }

  const documentIds = [...new Set((grants ?? []).map((item) => item.document_id))]
  const investorIds = [...new Set((grants ?? []).map((item) => item.investor_id))]
  const [{ data: documents }, { data: investors }] = await Promise.all([
    documentIds.length
      ? supabase
          .from('documents')
          .select('id, title, status, visibility')
          .in('id', documentIds)
      : Promise.resolve({ data: [] }),
    investorIds.length
      ? supabase
          .from('investors')
          .select('id, reference_code, legal_name, organization_name, investor_type, status')
          .in('id', investorIds)
      : Promise.resolve({ data: [] }),
  ])

  const documentMap = new Map((documents ?? []).map((item) => [item.id, item]))
  const investorMap = new Map((investors ?? []).map((item) => [item.id, item]))
  const rows = grants ?? []
  const active = rows.filter((item) => !item.revoked_at).length
  const uniqueInvestors = new Set(rows.filter((item) => !item.revoked_at).map((item) => item.investor_id)).size

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Hubungan Investor"
        title="Dokumen Investor"
        description="Pantau pemberian dan pencabutan akses dokumen restricted untuk setiap investor. Pemberian akses dilakukan dari detail investor atau detail dokumen sesuai permission."
        actions={
          principal.permissions.has('documents.view') ? (
            <Button asChild variant="secondary">
              <Link href="/admin/data-room">Buka Data Room</Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex items-center gap-3 py-5">
            <FileCheck2 className="text-fg-muted size-5" aria-hidden="true" />
            <div>
              <p className="text-caption text-fg-muted">Akses aktif</p>
              <p className="text-heading-sm text-fg font-semibold">{active}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3 py-5">
            <Users className="text-fg-muted size-5" aria-hidden="true" />
            <div>
              <p className="text-caption text-fg-muted">Investor memiliki akses</p>
              <p className="text-heading-sm text-fg font-semibold">{uniqueInvestors}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3 py-5">
            <ShieldCheck className="text-fg-muted size-5" aria-hidden="true" />
            <div>
              <p className="text-caption text-fg-muted">Riwayat akses</p>
              <p className="text-heading-sm text-fg font-semibold">{rows.length}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat akses dokumen</CardTitle>
        </CardHeader>
        <CardBody>
          {!rows.length ? (
            <EmptyState
              title="Belum ada akses khusus"
              description="Belum ada dokumen restricted yang diberikan kepada investor. Tidak ada data contoh yang dibuat otomatis."
            />
          ) : (
            <div className="divide-border divide-y">
              {rows.map((grant) => {
                const document = documentMap.get(grant.document_id)
                const investor = investorMap.get(grant.investor_id)
                const investorName = investor
                  ? investor.investor_type === 'institution'
                    ? investor.organization_name || investor.legal_name
                    : investor.legal_name
                  : 'Investor tidak ditemukan'

                return (
                  <div key={grant.id} className="grid gap-3 py-4 first:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-caption text-fg-subtle">Investor</p>
                      {investor ? (
                        <Link href={`/admin/investors/${investor.id}`} className="text-fg font-semibold hover:underline">
                          {investorName}
                        </Link>
                      ) : (
                        <p className="text-fg font-semibold">{investorName}</p>
                      )}
                      {investor ? <p className="text-caption text-fg-muted font-mono">{investor.reference_code}</p> : null}
                    </div>

                    <div className="min-w-0">
                      <p className="text-caption text-fg-subtle">Dokumen</p>
                      {document ? (
                        <div>
                          <Link href={`/admin/documents/${document.id}`} className="text-fg font-semibold hover:underline">
                            {document.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <PublicationBadge status={document.status} />
                            <VisibilityBadge visibility={document.visibility} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-fg-muted">Dokumen tidak ditemukan</p>
                      )}
                    </div>

                    <div className="lg:text-right">
                      <span className={grant.revoked_at ? 'text-caption text-danger' : 'text-caption text-success'}>
                        {grant.revoked_at ? 'Dicabut' : 'Aktif'}
                      </span>
                      <p className="text-caption text-fg-subtle mt-1">Diberikan {formatDateTime(grant.granted_at)}</p>
                      {grant.revoked_at ? (
                        <p className="text-caption text-fg-subtle">Dicabut {formatDateTime(grant.revoked_at)}</p>
                      ) : null}
                      {grant.note ? <p className="text-caption text-fg-muted mt-1 max-w-xs">{grant.note}</p> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
