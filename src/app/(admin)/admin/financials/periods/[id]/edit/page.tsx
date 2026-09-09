import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { FinancialPeriodType } from '@/core/financials/periods'
import { FinancialPeriodEditForm } from '@/features/admin/financials/financial-period-edit-form'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export default async function EditFinancialPeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('financial_periods.update', `/admin/financials/periods/${id}/edit`)

  if (!principal) {
    return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin mengubah periode keuangan.</Alert>
  }

  const supabase = await getServerSupabase()
  const { data: period, error } = await supabase
    .from('financial_periods')
    .select('id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return <Alert tone="danger" title="Periode tidak dapat dimuat">Sistem gagal membaca periode keuangan.</Alert>
  }

  if (!period) notFound()

  if (period.status !== 'open') {
    return (
      <Stack gap={8}>
        <PageHeader
          eyebrow="Keuangan / Periode"
          title="Periode tidak dapat diedit"
          description="Hanya periode berstatus terbuka yang dapat diubah."
          actions={<Link href={`/admin/financials/periods/${period.id}`} className="text-body-sm text-link hover:underline">Kembali ke detail</Link>}
        />
        <Alert tone="info" title="Periode sudah tidak terbuka">
          Metadata periode tidak dapat diubah setelah periode ditutup atau dikunci.
        </Alert>
      </Stack>
    )
  }

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan / Periode"
        title="Edit Periode Keuangan"
        description="Perbarui metadata periode pelaporan yang masih terbuka."
        actions={<Link href={`/admin/financials/periods/${period.id}`} className="text-body-sm text-link hover:underline">Batal</Link>}
      />
      <Card>
        <CardHeader><CardTitle>Konfigurasi periode</CardTitle></CardHeader>
        <CardBody>
          <FinancialPeriodEditForm
            period={{
              id: period.id,
              period_type: period.period_type as FinancialPeriodType,
              fiscal_year: period.fiscal_year,
              period_index: period.period_index,
              starts_on: period.starts_on,
              ends_on: period.ends_on,
              currency: period.currency,
            }}
          />
        </CardBody>
      </Card>
    </Stack>
  )
}
