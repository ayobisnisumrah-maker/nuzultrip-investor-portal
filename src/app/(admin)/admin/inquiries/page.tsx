import type { Metadata } from 'next'

import { topics } from '@/core/realtime/events'
import { InquiryWorkbench } from '@/features/admin/inquiry-workbench'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
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
  const { data: inquiries, error } = await supabase
    .from('portal_inquiries')
    .select(
      'id, name, email, phone, organization, message, status, handled_by, handled_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <Alert tone="danger" title="Permintaan tidak dapat dimuat">
        Data permintaan masuk gagal diambil. Silakan coba lagi.
      </Alert>
    )
  }

  const handlerLabels: Record<string, string> = {}
  const handlerIds = Array.from(
    new Set((inquiries ?? []).map((inquiry) => inquiry.handled_by).filter(Boolean)),
  ) as string[]

  // Nama PIC hanya dibuka kepada admin yang memang boleh melihat direktori admin.
  // Admin Hubungan Investor tanpa admins.view tetap mendapat konteks penanganan
  // tanpa memperluas hak akses identitas staf.
  if (handlerIds.length > 0 && principal.permissions.has('admins.view')) {
    const { data: handlers } = await supabase
      .from('user_accounts')
      .select('id, full_name')
      .eq('account_type', 'admin')
      .in('id', handlerIds)

    for (const handler of handlers ?? []) {
      handlerLabels[handler.id] = handler.full_name
    }
  }

  return (
    <div className="space-y-6">
      <RealtimeRefresher
        topic={topics.admin()}
        kinds={['inquiry.received', 'inquiry.changed']}
      />

      <div>
        <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
          Hubungan Investor
        </p>
        <h1 className="font-display text-heading-lg text-fg mt-1">Permintaan Masuk</h1>
        <p className="text-body-sm text-fg-muted mt-2 max-w-3xl">
          Tinjau permintaan informasi atau dokumen dari portal publik dan catat status tindak lanjutnya. Pengirim tidak perlu mendaftar sebagai investor.
        </p>
      </div>

      <InquiryWorkbench
        inquiries={inquiries ?? []}
        canHandle={principal.permissions.has('inquiries.handle')}
        currentAdminId={principal.userId}
        handlerLabels={handlerLabels}
        timezone={principal.timezone}
      />
    </div>
  )
}
