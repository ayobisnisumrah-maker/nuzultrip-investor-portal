import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { FinancialPeriodStatus, FinancialPeriodType } from '@/core/financials/periods'
import { FINANCIAL_PERIOD_STATUS_LABELS, FINANCIAL_PERIOD_TYPE_LABELS } from '@/core/financials/periods'
import { FinancialPeriodStatusActions } from '@/features/admin/financials/financial-period-status-actions'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default async function FinancialPeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('financial_periods.view', `/admin/financials/periods/${id}`)

  if (!principal) {
    return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin melihat periode keuangan.</Alert>
  }

  const supabase = await getServerSupabase()
  const { data: period, error } = await supabase
    .from('financial_periods')
    .select('id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return <Alert tone="danger" title="Periode tidak dapat dimuat">Sistem gagal membaca periode keuangan.</Alert>
  }

  if (!period) notFound()

  const periodType = period.period_type as FinancialPeriodType
  const status = period.status as FinancialPeriodStatus
  const title = `${FINANCIAL_PERIOD_TYPE_LABELS[periodType]} ${periodType === 'yearly' ? period.fiscal_year : `${period.period_index} / ${period.fiscal_year}`}`

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan / Periode"
        title={title}
        description="Detail periode pelaporan keuangan dan lifecycle penutupannya."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/financials/periods" className="border-border rounded-lg border px-3 py-2 text-sm">
              Kembali
            </Link>
            {status === 'open' && principal.permissions.has('financial_periods.update') ? (
              <Link href={`/admin/financials/periods/${period.id}/edit`} className="border-border rounded-lg border px-3 py-2 text-sm">
                Edit
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardBody><p className="text-caption text-fg-subtle">Status</p><p className="mt-1 font-semibold">{FINANCIAL_PERIOD_STATUS_LABELS[status]}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Jenis</p><p className="mt-1 font-semibold">{FINANCIAL_PERIOD_TYPE_LABELS[periodType]}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Tahun fiskal</p><p className="mt-1 font-semibold">{period.fiscal_year}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Mata uang</p><p className="mt-1 font-semibold">{period.currency}</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Rentang periode</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-4 text-body-sm sm:grid-cols-2">
            <div><p className="text-fg-subtle">Mulai</p><p className="mt-1 font-semibold">{formatDate(period.starts_on)}</p></div>
            <div><p className="text-fg-subtle">Selesai</p><p className="mt-1 font-semibold">{formatDate(period.ends_on)}</p></div>
            <div><p className="text-fg-subtle">Dibuat</p><p className="mt-1 font-semibold">{new Date(period.created_at).toLocaleString('id-ID')}</p></div>
            <div><p className="text-fg-subtle">Diperbarui</p><p className="mt-1 font-semibold">{new Date(period.updated_at).toLocaleString('id-ID')}</p></div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lifecycle periode</CardTitle></CardHeader>
        <CardBody>
          <FinancialPeriodStatusActions
            periodId={period.id}
            status={status}
            canClose={principal.permissions.has('financial_periods.close')}
          />
          {!principal.permissions.has('financial_periods.close') || status === 'locked' ? (
            <p className="text-body-sm text-fg-subtle">
              {status === 'locked' ? 'Periode sudah terkunci dan tidak dapat diubah melalui workflow normal.' : 'Tidak ada aksi lifecycle yang tersedia untuk peran Anda.'}
            </p>
          ) : null}
        </CardBody>
      </Card>
    </Stack>
  )
}
