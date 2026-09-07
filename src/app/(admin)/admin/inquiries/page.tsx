import type { Metadata } from 'next'

import { InquiryWorkbench } from '@/features/admin/inquiry-workbench'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'

export const metadata: Metadata = { title: 'Permintaan Masuk' }

export default async function InquiriesPage() {
  const principal = await requireAdminPage('/admin/inquiries')
  if (!principal.permissions.has('inquiries.view')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk melihat permintaan masuk.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const [{ data: inquiries, error }, { data: eligibleInvestors }] = await Promise.all([
    supabase
      .from('portal_inquiries')
      .select('id, name, email, phone, organization, message, status, thread_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('investors')
      .select('id')
      .in('status', ['approved', 'active'])
      .limit(500),
  ])

  if (error) {
    return (
      <Alert tone="danger" title="Permintaan tidak dapat dimuat">
        Data permintaan masuk gagal diambil. Silakan coba lagi.
      </Alert>
    )
  }

  const investorIds = (eligibleInvestors ?? []).map((row) => row.id)
  const { data: investorAccounts } = investorIds.length
    ? await supabase
        .from('user_accounts')
        .select('id, email, status')
        .in('id', investorIds)
        .eq('status', 'active')
    : { data: [] }

  const eligibleEmails = (investorAccounts ?? []).map((row) => row.email.toLocaleLowerCase('id-ID'))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
          Hubungan Investor
        </p>
        <h1 className="font-display text-heading-lg text-fg mt-1">Permintaan Masuk</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
          Kelola inquiry dari portal publik, tindak lanjutnya, dan konversinya menjadi percakapan.
        </p>
      </div>

      <InquiryWorkbench
        inquiries={inquiries ?? []}
        canHandle={principal.permissions.has('inquiries.handle')}
        eligibleEmails={eligibleEmails}
        timezone={principal.timezone}
      />
    </div>
  )
}
