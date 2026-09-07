import type { Metadata } from 'next'

import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { formatDateTime } from '@/lib/format'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { markAllNotificationsRead } from '@/server/notifications/read-actions'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Notifikasi' }

const KIND_LABELS: Record<string, string> = {
  investor_application_received: 'Pengajuan investor',
  investor_approved: 'Persetujuan akun',
  investor_rejected: 'Status pengajuan',
  investor_deactivated: 'Status akun',
  document_published: 'Dokumen',
  document_shared: 'Dokumen khusus',
  financial_report_published: 'Laporan keuangan',
  investor_report_published: 'Laporan investor',
  company_update: 'Pembaruan perusahaan',
  message_received: 'Pesan',
  inquiry_received: 'Permintaan informasi',
  account_invited: 'Undangan akun',
}

function notificationKindLabel(kind: string) {
  return KIND_LABELS[kind] ?? kind.replaceAll('_', ' ')
}

export default async function InvestorNotificationsPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, kind, title, body, action_url, read_at, created_at')
    .eq('recipient_id', principal.userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <Alert tone="danger" title="Notifikasi tidak dapat dimuat">
        Sistem gagal mengambil notifikasi akun Anda. Silakan coba lagi.
      </Alert>
    )
  }

  const rows = notifications ?? []
  const unreadCount = rows.filter((notification) => !notification.read_at).length

  return (
    <Stack gap={8}>
      <RealtimeRefresher topic={topics.user(principal.userId)} kinds={['notification.created']} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="Aktivitas"
          title="Notifikasi"
          description="Pemberitahuan akun, dokumen, laporan, kepemilikan, dan komunikasi investor."
        />

        {unreadCount > 0 ? (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="border-border text-fg hover:bg-muted inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium transition"
            >
              Tandai semua dibaca ({unreadCount})
            </button>
          </form>
        ) : null}
      </div>

      {!rows.length ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Notifikasi baru akan muncul otomatis ketika ada aktivitas penting untuk akun Anda."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((notification) => (
            <Card key={notification.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle>{notification.title}</CardTitle>
                  {!notification.read_at ? (
                    <span className="bg-surface-accent text-caption rounded-full px-2 py-1 font-medium">
                      Baru
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-2">
                  <p className="text-body-sm text-fg-muted">{notification.body}</p>
                  <div className="text-caption text-fg-subtle flex flex-wrap items-center gap-3">
                    <span>{notificationKindLabel(notification.kind)}</span>
                    <span>•</span>
                    <time dateTime={notification.created_at}>
                      {formatDateTime(notification.created_at, { timeZone: principal.timezone })}
                    </time>
                  </div>
                  {notification.action_url ? (
                    <a
                      href={notification.action_url}
                      className="text-body-sm text-link font-medium hover:underline"
                    >
                      Buka →
                    </a>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Stack>
  )
}
