import type { Metadata } from 'next'
import Link from 'next/link'

import { InvestorProfileChangeActions } from '@/features/admin/investors/profile-change-actions'
import { formatDateTime } from '@/lib/format'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Perubahan Data Investor' }

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  whatsapp_number: 'WhatsApp',
  country: 'Negara',
  city: 'Kota',
  address: 'Alamat',
  organization_name: 'Organisasi',
  organization_role: 'Jabatan',
  bank_name: 'Bank',
  bank_account_name: 'Nama Pemilik Rekening',
  bank_account_number: 'Nomor Rekening',
}

export default async function InvestorProfileChangesPage() {
  const principal = await adminWithPermission('investors.update', '/admin/investors/profile-changes')
  if (!principal) {
    return <Alert tone="info" title="Akses terbatas">Anda tidak memiliki izin meninjau perubahan data investor.</Alert>
  }

  const supabase = await getServerSupabase()
  const { data: requests, error } = await supabase
    .from('investor_profile_change_requests')
    .select('id,investor_id,requested_changes,reason,status,requested_at,reviewed_at,review_note,applied_at')
    .order('requested_at', { ascending: false })

  if (error) {
    return <Alert tone="danger" title="Data tidak dapat dimuat">Daftar pengajuan perubahan profil gagal dibaca.</Alert>
  }

  const investorIds = [...new Set((requests ?? []).map((item) => item.investor_id))]
  const { data: investors } = investorIds.length
    ? await supabase.from('investors').select('id,reference_code,legal_name,status,is_training').in('id', investorIds)
    : { data: [] }
  const investorMap = new Map((investors ?? []).map((item) => [item.id, item]))

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Investor / Verifikasi"
        title="Pengajuan Perubahan Data"
        description="Data investor terverifikasi tidak diedit langsung. Review setiap pengajuan, lalu terapkan perubahan yang disetujui dengan audit trail. Nama legal dan identitas tidak tersedia sebagai field perubahan."
        actions={<Button asChild variant="secondary"><Link href="/admin/investors">Kembali ke Investor</Link></Button>}
      />

      <Alert tone="info" title="Identitas pemegang terkunci">
        Nama legal dan identitas tidak dapat diubah oleh investor maupun admin setelah verifikasi. Jika pemegang saham berubah, gunakan alur Pewaris atau Jual/Transfer Saham.
      </Alert>

      <Card>
        <CardHeader><CardTitle>Antrean perubahan</CardTitle></CardHeader>
        <CardBody>
          {!requests?.length ? (
            <EmptyState title="Belum ada pengajuan" description="Pengajuan perubahan kontak, email, alamat, atau rekening akan muncul di sini." />
          ) : (
            <div className="divide-border divide-y">
              {requests.map((request) => {
                const investor = investorMap.get(request.investor_id)
                const changes = (request.requested_changes ?? {}) as Record<string, unknown>
                return (
                  <article key={request.id} className="grid gap-5 py-6 first:pt-0 xl:grid-cols-[1fr_1.2fr_20rem]">
                    <div>
                      <p className="text-caption text-fg-subtle">Investor</p>
                      <Link href={`/admin/investors/${request.investor_id}`} className="font-semibold hover:underline">
                        {investor?.legal_name ?? 'Investor'}
                      </Link>
                      <p className="text-caption font-mono text-fg-muted">{investor?.reference_code ?? request.investor_id}</p>
                      <p className="text-caption mt-2 text-fg-subtle">Diajukan {formatDateTime(request.requested_at)}</p>
                      {investor?.is_training ? <p className="text-caption mt-2 font-semibold">AKUN TRAINING</p> : null}
                    </div>

                    <div>
                      <p className="text-caption text-fg-subtle">Perubahan diminta</p>
                      <dl className="mt-2 grid gap-2 text-body-sm">
                        {Object.entries(changes).map(([key, value]) => (
                          <div key={key}>
                            <dt className="font-medium">{FIELD_LABELS[key] ?? key}</dt>
                            <dd className="text-fg-muted break-words">{value === null || value === '' ? 'Dikosongkan' : String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-body-sm mt-3"><span className="font-medium">Alasan:</span> {request.reason}</p>
                      <div className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-caption font-medium">{request.status}</div>
                      {request.review_note ? <p className="text-caption mt-2 text-fg-muted">Catatan: {request.review_note}</p> : null}
                    </div>

                    <InvestorProfileChangeActions requestId={request.id} status={request.status} />
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
