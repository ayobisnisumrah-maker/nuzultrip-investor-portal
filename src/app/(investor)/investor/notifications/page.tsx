import type { Metadata } from 'next'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { PageHeader, Stack } from '@/ui/layout'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'
import { formatDateTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Notifikasi' }

export default async function InvestorNotificationsPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, kind, title, body, action_url, read_at, created_at')
    .eq('recipient_id', principal.userId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Activity" title="Notifikasi" description="Pemberitahuan akun, dokumen, laporan, dan komunikasi investor." />
      {!notifications?.length ? (
        <EmptyState title="Belum ada notifikasi" description="Notifikasi baru akan muncul ketika ada aktivitas penting untuk akun Anda." />
      ) : (
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle>{notification.title}</CardTitle>
                  {!notification.read_at ? <span className="rounded-full bg-surface-accent px-2 py-1 text-caption font-medium">Baru</span> : null}
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-2">
                  <p className="text-body-sm text-fg-muted">{notification.body}</p>
                  <div className="flex flex-wrap items-center gap-3 text-caption text-fg-subtle">
                    <span>{notification.kind}</span>
                    <span>•</span>
                    <time dateTime={notification.created_at}>{formatDateTime(notification.created_at, { timeZone: principal.timezone })}</time>
                  </div>
                  {notification.action_url ? <a href={notification.action_url} className="text-body-sm font-medium text-link hover:underline">Buka →</a> : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Stack>
  )
}
