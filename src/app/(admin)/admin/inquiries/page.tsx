import type { Metadata } from 'next'

import { CommunicationWorkbench } from '@/features/admin/communication-workbench'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'

export const metadata: Metadata = { title: 'Permintaan Masuk' }

export default async function InquiriesPage() {
  const principal = await requireAdminPage('/admin/inquiries')
  if (!principal.permissions.has('inquiries.view')) {
    return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin untuk melihat permintaan masuk.</Alert>
  }

  const supabase = await getServerSupabase()
  const { data: inquiries, error } = await supabase
    .from('portal_inquiries')
    .select('id, name, email, phone, organization, message, status, thread_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return <Alert tone="danger" title="Permintaan tidak dapat dimuat">Data permintaan masuk gagal diambil. Silakan coba lagi.</Alert>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">Hubungan Investor</p>
        <h1 className="mt-1 font-display text-heading-lg text-fg">Permintaan Masuk</h1>
        <p className="mt-2 max-w-3xl text-body-sm text-fg-muted">Kelola inquiry dari portal publik, tindak lanjutnya, dan konversinya menjadi percakapan.</p>
      </div>
      <CommunicationWorkbench
        threads={[]}
        selectedThread={null}
        messages={[]}
        inquiries={inquiries ?? []}
        canSend={false}
        canHandle={principal.permissions.has('inquiries.handle')}
      />
    </div>
  )
}
