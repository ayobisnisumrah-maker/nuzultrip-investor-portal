import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PUBLICATION_STATUS_LABELS } from '@/core/documents/publication'
import { hasPermission } from '@/core/auth/principal'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { Stack } from '@/ui/layout'
import { PublicationBadge, VisibilityBadge } from '@/ui/status'
import { DocumentActions } from '@/features/admin/document-actions'
import {
  DocumentAccessManager,
  type GrantView,
  type InvestorOption,
} from '@/features/admin/document-access-manager'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type GrantRow = {
  id: string
  granted_at: string
  note: string | null
  investor_id: string
  investors:
    | { id: string; legal_name: string; organization_name: string | null; reference_code: string }
    | Array<{ id: string; legal_name: string; organization_name: string | null; reference_code: string }>
    | null
}

const kinds: Record<string, string> = {
  investment_proposal: 'Proposal investasi',
  pitch_deck: 'Pitch deck',
  investor_report: 'Laporan investor',
  business_update: 'Pembaruan bisnis',
  supporting: 'Pendukung',
}

export default async function AdminDocumentDetailPage({ params }: PageProps) {
  const principal = await requireAdminPage('/admin/documents')

  if (!hasPermission(principal, 'documents.view')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat dokumen.
      </Alert>
    )
  }

  const { id } = await params
  const supabase = await getServerSupabase()

  const [{ data: document, error: documentError }, { data: versions, error: versionsError }] =
    await Promise.all([
      supabase
        .from('documents')
        .select(
          'id, title, slug, kind, summary, status, visibility, owner_admin_id, current_version_id, published_version_id, archived_at, created_at, updated_at',
        )
        .eq('id', id)
        .maybeSingle(),

      supabase
        .from('document_versions')
        .select(
          'id, document_id, version_number, title, status, change_note, file_asset_id, approved_at, published_at, created_at',
        )
        .eq('document_id', id)
        .order('version_number', { ascending: false }),
    ])

  if (documentError) {
    return (
      <Alert tone="danger" title="Dokumen tidak dapat dimuat">
        Sistem gagal mengambil data dokumen.
      </Alert>
    )
  }

  if (!document) notFound()

  if (versionsError) {
    return (
      <Alert tone="danger" title="Versi dokumen tidak dapat dimuat">
        Sistem gagal mengambil riwayat versi dokumen.
      </Alert>
    )
  }

  const permissions = Array.from(principal.permissions)
  const canViewInvestorDocuments = hasPermission(principal, 'investor_documents.view')
  const canAssignInvestorDocuments = hasPermission(principal, 'investor_documents.assign')
  const canRevokeInvestorDocuments = hasPermission(principal, 'investor_documents.revoke')
  const canViewInvestors = hasPermission(principal, 'investors.view')

  let grants: GrantView[] = []
  let investorOptions: InvestorOption[] = []
  let accessError = false

  if (document.visibility === 'restricted' && canViewInvestorDocuments) {
    const [grantsResult, investorsResult] = await Promise.all([
      supabase
        .from('document_access_grants')
        .select(
          'id, granted_at, note, investor_id, investors(id, legal_name, organization_name, reference_code)',
        )
        .eq('document_id', document.id)
        .is('revoked_at', null)
        .order('granted_at', { ascending: false }),
      canAssignInvestorDocuments && canViewInvestors
        ? supabase
            .from('investors')
            .select('id, legal_name, organization_name, reference_code, status')
            .in('status', ['approved', 'active'])
            .order('legal_name', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ])

    if (grantsResult.error || investorsResult.error) {
      accessError = true
    } else {
      grants = ((grantsResult.data ?? []) as unknown as GrantRow[]).flatMap((grant) => {
        const investor = Array.isArray(grant.investors) ? grant.investors[0] : grant.investors
        if (!investor) return []
        return [
          {
            id: grant.id,
            grantedAt: grant.granted_at,
            note: grant.note,
            investorName: investor.organization_name || investor.legal_name,
            referenceCode: investor.reference_code,
          },
        ]
      })

      const grantedInvestorIds = new Set(
        ((grantsResult.data ?? []) as unknown as GrantRow[]).map((grant) => grant.investor_id),
      )

      investorOptions = (investorsResult.data ?? [])
        .filter((investor) => !grantedInvestorIds.has(investor.id))
        .map((investor) => ({
          id: investor.id,
          label: investor.organization_name || investor.legal_name,
          referenceCode: investor.reference_code,
        }))
    }
  }

  const currentVersion = (versions ?? []).find(
    (version) => version.id === document.current_version_id,
  )
  const publishedVersion = (versions ?? []).find(
    (version) => version.id === document.published_version_id,
  )
  const status = document.status

  return (
    <Stack gap={8}>
      <header>
        <Link href="/admin/documents" className="text-body-sm text-fg-muted hover:underline">
          ← Kembali ke Dokumen
        </Link>
        <div className="mt-4">
          <p className="text-caption text-fg-subtle font-medium tracking-[0.18em] uppercase">
            Investor Relations / Dokumen
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-fg text-2xl font-semibold tracking-tight">{document.title}</h1>
              {document.summary ? (
                <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">{document.summary}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PublicationBadge status={status} />
              <VisibilityBadge visibility={document.visibility} />
            </div>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Lifecycle Dokumen</CardTitle></CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-fg-muted">
              Perubahan status mengikuti workflow dan permission yang ditetapkan oleh sistem.
            </p>
            <div className="flex flex-wrap gap-3">
              <DocumentActions
                documentId={document.id}
                title={document.title}
                status={status}
                permissions={permissions}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {document.visibility === 'restricted' ? (
        <Card>
          <CardHeader><CardTitle>Akses Investor Terpilih</CardTitle></CardHeader>
          <CardBody>
            {!canViewInvestorDocuments ? (
              <Alert tone="info" title="Akses terbatas">
                Peran Anda tidak memiliki izin untuk melihat daftar investor yang menerima dokumen ini.
              </Alert>
            ) : accessError ? (
              <Alert tone="warning" title="Akses dokumen tidak dapat dimuat">
                Daftar akses investor sedang tidak tersedia. Silakan coba lagi.
              </Alert>
            ) : (
              <DocumentAccessManager
                documentId={document.id}
                documentTitle={document.title}
                grants={grants}
                investors={investorOptions}
                canAssign={canAssignInvestorDocuments && canViewInvestors}
                canRevoke={canRevokeInvestorDocuments}
              />
            )}
          </CardBody>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardBody><p className="text-caption text-fg-subtle">Tipe</p><p className="text-body-sm mt-2 font-medium">{kinds[document.kind] ?? document.kind}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Visibilitas</p><div className="mt-2"><VisibilityBadge visibility={document.visibility} /></div></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Versi aktif</p><p className="text-body-sm mt-2 font-medium">{currentVersion ? `v${currentVersion.version_number}` : 'Belum tersedia'}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Versi terbit</p><p className="text-body-sm mt-2 font-medium">{publishedVersion ? `v${publishedVersion.version_number}` : 'Belum diterbitkan'}</p></CardBody></Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Informasi Dokumen</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-5 md:grid-cols-2">
            <div><p className="text-caption text-fg-subtle">Slug</p><p className="text-body-sm mt-1 break-all">{document.slug}</p></div>
            <div><p className="text-caption text-fg-subtle">Status</p><p className="text-body-sm mt-1">{PUBLICATION_STATUS_LABELS[status]}</p></div>
            <div><p className="text-caption text-fg-subtle">Dibuat</p><p className="text-body-sm mt-1">{formatDateTime(document.created_at)}</p></div>
            <div><p className="text-caption text-fg-subtle">Diperbarui</p><p className="text-body-sm mt-1">{formatDateTime(document.updated_at)}</p></div>
            <div><p className="text-caption text-fg-subtle">Diarsipkan</p><p className="text-body-sm mt-1">{document.archived_at ? formatDateTime(document.archived_at) : '-'}</p></div>
            <div><p className="text-caption text-fg-subtle">Owner Admin</p><p className="text-body-sm mt-1 break-all">{document.owner_admin_id ?? '-'}</p></div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Riwayat Versi</CardTitle></CardHeader>
        <CardBody>
          {(versions ?? []).length === 0 ? (
            <p className="text-body-sm text-fg-muted">Belum ada versi dokumen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-body-sm w-full text-left">
                <thead>
                  <tr className="border-border border-b">
                    <th className="px-3 py-3 font-medium">Versi</th><th className="px-3 py-3 font-medium">Judul</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Catatan Perubahan</th><th className="px-3 py-3 font-medium">Dibuat</th><th className="px-3 py-3 font-medium">Disetujui</th><th className="px-3 py-3 font-medium">Diterbitkan</th>
                  </tr>
                </thead>
                <tbody>
                  {(versions ?? []).map((version) => (
                    <tr key={version.id} className="border-border border-b last:border-0">
                      <td className="px-3 py-3 font-medium">v{version.version_number}{version.id === document.current_version_id ? <span className="text-caption text-fg-muted ml-2">Aktif</span> : null}</td>
                      <td className="px-3 py-3">{version.title}</td>
                      <td className="px-3 py-3"><PublicationBadge status={version.status} /></td>
                      <td className="text-fg-muted max-w-xs px-3 py-3">{version.change_note ?? '-'}</td>
                      <td className="text-fg-muted px-3 py-3">{formatDateTime(version.created_at)}</td>
                      <td className="text-fg-muted px-3 py-3">{version.approved_at ? formatDateTime(version.approved_at) : '-'}</td>
                      <td className="text-fg-muted px-3 py-3">{version.published_at ? formatDateTime(version.published_at) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
