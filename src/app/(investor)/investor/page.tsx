import type { Metadata } from 'next'
import { INVESTOR_STATUS_DESCRIPTIONS } from '@/core/investors/status'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { PageHeader, Stack } from '@/ui/layout'
import { InvestorStatusPill } from '@/ui/status'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Ringkasan' }

export default async function InvestorOverviewPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  // An approval performed by an admin in another browser must land here without
  // the investor touching anything. The event says only "look again"; the
  // refresh re-renders on the server, where authorisation is applied afresh.
  const liveTopic = topics.investor(principal.investorId)

  // An investor can always read their own history, whatever their status —
  // seeing where an application stands is not a data leak, it is the point.
  const { data: history } = await supabase
    .from('investor_status_history')
    .select('id, from_status, to_status, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <Stack gap={8}>
      <RealtimeRefresher
        topic={liveTopic}
        kinds={[
          'investor.status_changed',
          'investor.document_shared',
          'investor.document_revoked',
          'message.received',
        ]}
      />

      <PageHeader
        eyebrow="Investor Relations"
        title={`Halo, ${principal.fullName.split(' ')[0]}`}
        description="Ringkasan status dan riwayat pengajuan Anda."
      />

      {!principal.hasDataAccess ? (
        <Alert tone="info" title={`Status: ${principal.status}`}>
          {INVESTOR_STATUS_DESCRIPTIONS[principal.status]} Anda akan menerima pemberitahuan ketika
          statusnya berubah.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Profil investor</CardTitle>
        </CardHeader>
        <CardBody>
          <DetailList>
            <DetailRow label="Kode investor">
              <span className="font-mono">{principal.referenceCode}</span>
            </DetailRow>
            <DetailRow label="Nama sesuai identitas">{principal.legalName}</DetailRow>
            <DetailRow label="Surel">{principal.email}</DetailRow>
            <DetailRow label="Status">
              <InvestorStatusPill status={principal.status} />
            </DetailRow>
          </DetailList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat status</CardTitle>
        </CardHeader>
        <CardBody>
          {!history || history.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat"
              description="Perubahan status pengajuan Anda akan tercatat di sini."
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-3">
                  <time
                    dateTime={entry.created_at}
                    className="text-caption tabular text-fg-subtle font-mono"
                  >
                    {formatDateTime(entry.created_at, { timeZone: principal.timezone })}
                  </time>
                  <InvestorStatusPill status={entry.to_status} size="sm" />
                  {entry.reason ? (
                    <span className="text-body-sm text-fg-muted">{entry.reason}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </Stack>
  )
}
