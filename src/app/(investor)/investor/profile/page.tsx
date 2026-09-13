import type { Metadata } from 'next'

import { InvestorProfileEditor } from '@/features/investor/investor-profile-editor'
import { VerifiedProfileChangeForm } from '@/features/investor/verified-profile-change-form'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { InvestorStatusPill } from '@/ui/status'

export const metadata: Metadata = { title: 'Profil' }

export default async function InvestorProfilePage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: investor, error } = await supabase
    .from('investors')
    .select(
      'legal_name, investor_type, country, city, address, organization_name, organization_role, whatsapp_number, bank_name, bank_account_name, bank_account_number, ktp_original_file_name, ktp_uploaded_at, is_training',
    )
    .eq('id', principal.investorId)
    .maybeSingle()

  if (error || !investor) {
    throw new Error('Profil investor tidak dapat dimuat.')
  }

  const verified = ['approved', 'active', 'inactive'].includes(principal.status)
  const { data: openRequest } = verified
    ? await supabase
        .from('investor_profile_change_requests')
        .select('id,status,reason,requested_changes,requested_at,review_note')
        .eq('investor_id', principal.investorId)
        .in('status', ['pending', 'approved'])
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Akun Investor"
        title="Profil"
        description={verified ? 'Identitas legal terkunci setelah verifikasi. Kontak dan rekening berubah melalui pengajuan resmi.' : 'Lengkapi identitas, kontak, rekening pembayaran, dan dokumen identitas Anda sebelum verifikasi.'}
        actions={<InvestorStatusPill status={principal.status} />}
      />

      {investor.is_training ? (
        <Alert tone="info" title="Akun Training">
          Akun ini digunakan untuk training/demo dan tidak dapat memiliki kepemilikan atau menerima distribusi investor canonical.
        </Alert>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Data investor</CardTitle></CardHeader>
        <CardBody>
          <div className="mb-6 grid gap-1 text-body-sm text-fg-muted sm:grid-cols-2">
            <p>Kode investor: <span className="font-mono text-fg">{principal.referenceCode}</span></p>
            <p>Surel: <span className="text-fg">{principal.email}</span></p>
          </div>

          {verified ? (
            <div className="grid gap-6">
              <Alert tone="info" title="Identitas pemegang terkunci">
                Nama legal dan dokumen/nomor identitas tidak dapat diubah setelah verifikasi, termasuk oleh admin. Jika pemegang kepemilikan harus berubah, gunakan proses Pewaris atau Jual/Transfer Saham.
              </Alert>

              <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-caption text-fg-subtle">Nama legal</p>
                  <p className="font-semibold text-fg">{investor.legal_name}</p>
                  <p className="text-caption mt-1 text-fg-muted">Terkunci permanen setelah verifikasi.</p>
                </div>
                <div>
                  <p className="text-caption text-fg-subtle">Dokumen identitas</p>
                  <p className="font-semibold text-fg">{investor.ktp_original_file_name || 'Tersimpan pada verifikasi'}</p>
                  <p className="text-caption mt-1 text-fg-muted">Tidak dapat diganti melalui edit profil.</p>
                </div>
              </div>

              {openRequest ? (
                <Alert tone="info" title={openRequest.status === 'approved' ? 'Pengajuan sudah disetujui' : 'Pengajuan sedang ditinjau'}>
                  Masih ada pengajuan perubahan profil yang belum selesai. Pengajuan baru dapat dibuat setelah pengajuan ini diterapkan, ditolak, atau dibatalkan.
                </Alert>
              ) : (
                <VerifiedProfileChangeForm
                  profile={{
                    email: principal.email,
                    whatsappNumber: investor.whatsapp_number,
                    country: investor.country,
                    city: investor.city,
                    address: investor.address,
                    organizationName: investor.organization_name,
                    organizationRole: investor.organization_role,
                    bankName: investor.bank_name,
                    bankAccountName: investor.bank_account_name,
                    bankAccountNumber: investor.bank_account_number,
                  }}
                />
              )}
            </div>
          ) : (
            <InvestorProfileEditor
              investor={{
                legalName: investor.legal_name,
                whatsappNumber: investor.whatsapp_number,
                country: investor.country,
                city: investor.city,
                address: investor.address,
                organizationName: investor.organization_name,
                organizationRole: investor.organization_role,
                bankName: investor.bank_name,
                bankAccountName: investor.bank_account_name,
                bankAccountNumber: investor.bank_account_number,
                identityFileName: investor.ktp_original_file_name,
                identityUploadedAt: investor.ktp_uploaded_at,
              }}
            />
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
