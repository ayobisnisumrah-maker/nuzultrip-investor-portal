import Link from 'next/link'

import { FinancialPeriodCreateForm } from '@/features/admin/financials/financial-period-create-form'
import { adminWithPermission } from '@/server/auth/page-guards'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export default async function NewFinancialPeriodPage() {
  const principal = await adminWithPermission('financial_periods.create', '/admin/financials/periods/new')
  if (!principal) return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin membuat periode keuangan.</Alert>

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Keuangan" title="Periode Keuangan Baru" description="Buat periode pelaporan yang menjadi dasar satu laporan keuangan." actions={<Link href="/admin/financials/periods" className="text-body-sm text-link hover:underline">Kembali</Link>} />
      <Card>
        <CardHeader><CardTitle>Konfigurasi periode</CardTitle></CardHeader>
        <CardBody><FinancialPeriodCreateForm /></CardBody>
      </Card>
    </Stack>
  )
}
