import type { Metadata } from 'next'

import { InvestorProfileEditor } from '@/features/investor/investor-profile-editor'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
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
      'legal_name, investor_type, country, city, address, organization_name, organization_role, whatsapp_number, bank_name, bank_account_name, bank_account_number, ktp_original_file_name, ktp_uploaded_at',
    )
    .eq('id', principal.investorId)
    .maybeSingle()

  if (error || !investor) {
    throw new Error('Profil investor tidak dapat dimuat.')
  }

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Akun Investor"
        title="Profil"
        description="Kelola identitas, kontak, rekening pembayaran, dan dokumen identitas Anda."
        actions={<InvestorStatusPill status={principal.status} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Data investor</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-6 grid gap-1 text-body-sm text-fg-muted sm:grid-cols-2">
            <p>
              Kode investor: <span className="font-mono text-fg">{principal.referenceCode}</span>
            </p>
            <p>
              Surel: <span className="text-fg">{principal.email}</span>
            </p>
          </div>
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
        </CardBody>
      </Card>
    </Stack>
  )
}
