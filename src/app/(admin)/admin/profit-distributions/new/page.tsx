import Link from 'next/link'

import { ProfitDistributionCreateForm } from '@/features/admin/profit-distribution-create-form'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export default async function NewProfitDistributionPage() {
  const principal = await adminWithPermission('profit_distributions.create', '/admin/profit-distributions/new')
  if (!principal) return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin membuat distribusi bagi hasil.</Alert>

  const supabase = await getServerSupabase()
  const { data: offerings, error } = await supabase
    .from('ownership_offerings')
    .select('id, name, code, status')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  return (
    <Stack gap={8}>
      <PageHeader eyebrow="Kepemilikan" title="Distribusi Bagi Hasil Baru" description="Hitung profit setelah OPEX dan siapkan pool investor dari satu penawaran kepemilikan." actions={<Link href="/admin/profit-distributions" className="text-body-sm text-link hover:underline">Kembali</Link>} />
      {error ? <Alert tone="danger" title="Penawaran tidak dapat dimuat">Sistem gagal mengambil penawaran kepemilikan.</Alert> : null}
      <Card><CardHeader><CardTitle>Parameter distribusi</CardTitle></CardHeader><CardBody><ProfitDistributionCreateForm offerings={offerings ?? []} /></CardBody></Card>
    </Stack>
  )
}
