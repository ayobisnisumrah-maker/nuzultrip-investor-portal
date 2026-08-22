import type { Metadata } from 'next'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { InvestorStatusPill } from '@/ui/status'

export const metadata: Metadata = { title: 'Profil' }

export default async function InvestorProfilePage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: investor } = await supabase
    .from('investors')
    .select(
      'legal_name, investor_type, country, city, address, organization_name, organization_role, whatsapp_number, bank_name, bank_account_name, bank_account_number, ktp_original_file_name, ktp_uploaded_at',
    )
    .eq('id', principal.investorId)
    .maybeSingle()

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Akun Investor"
        title="Profil"
        description="Informasi identitas dan data rekening yang tersimpan pada akun investor Anda."
      />
      <Card>
        <CardHeader>
          <CardTitle>Identitas</CardTitle>
        </CardHeader>
        <CardBody>
          <DetailList>
            <DetailRow label="Nama legal">{investor?.legal_name ?? principal.legalName}</DetailRow>
            <DetailRow label="Kode investor">
              <span className="font-mono">{principal.referenceCode}</span>
            </DetailRow>
            <DetailRow label="Jenis investor">{investor?.investor_type ?? '—'}</DetailRow>
            <DetailRow label="Surel">{principal.email}</DetailRow>
            <DetailRow label="WhatsApp">{investor?.whatsapp_number ?? '—'}</DetailRow>
            <DetailRow label="Negara/Kota">
              {[investor?.country, investor?.city].filter(Boolean).join(' / ') || '—'}
            </DetailRow>
            <DetailRow label="Alamat">{investor?.address ?? '—'}</DetailRow>
            <DetailRow label="Organisasi">{investor?.organization_name ?? '—'}</DetailRow>
            <DetailRow label="Jabatan">{investor?.organization_role ?? '—'}</DetailRow>
            <DetailRow label="Status">
              <InvestorStatusPill status={principal.status} />
            </DetailRow>
          </DetailList>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rekening pembayaran</CardTitle>
        </CardHeader>
        <CardBody>
          <DetailList>
            <DetailRow label="Bank">{investor?.bank_name ?? '—'}</DetailRow>
            <DetailRow label="Nama rekening">{investor?.bank_account_name ?? '—'}</DetailRow>
            <DetailRow label="Nomor rekening">{investor?.bank_account_number ?? '—'}</DetailRow>
            <DetailRow label="Identitas terunggah">
              {investor?.ktp_original_file_name ?? 'Belum diunggah'}
            </DetailRow>
          </DetailList>
        </CardBody>
      </Card>
    </Stack>
  )
}
