import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProfitDistributionLifecycleActions } from '@/features/admin/profit-distribution-lifecycle-actions'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { EmptyState } from '@/ui/states'
import { PageHeader, Stack } from '@/ui/layout'

function money(value: number | string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value))
}

function pct(bps: number) {
  return `${(bps / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
}

export default async function ProfitDistributionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const principal = await adminWithPermission('profit_distributions.view', `/admin/profit-distributions/${id}`)
  if (!principal) return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin melihat distribusi bagi hasil.</Alert>

  const supabase = await getServerSupabase()
  const { data: distribution, error } = await supabase
    .from('profit_distributions')
    .select('id, offering_id, period_start, period_end, revenue_amount, opex_amount, profit_amount, company_share_bps, investor_pool_bps, investor_pool_amount, status, approved_at, paid_at, notes, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return <Alert tone="danger" title="Distribusi tidak dapat dimuat">Sistem gagal membaca distribusi bagi hasil.</Alert>
  if (!distribution) notFound()

  const [{ data: offering }, { data: allocations }] = await Promise.all([
    supabase.from('ownership_offerings').select('name, code, status').eq('id', distribution.offering_id).maybeSingle(),
    supabase.from('profit_distribution_allocations').select('id, investor_id, ownership_bps, investor_pool_share_bps, allocation_amount, status, paid_at, payment_reference').eq('distribution_id', distribution.id).order('created_at'),
  ])

  const totalAllocated = (allocations ?? []).reduce((sum, item) => sum + Number(item.allocation_amount), 0)
  const payable = (allocations ?? []).filter((item) => item.status === 'payable').length
  const paid = (allocations ?? []).filter((item) => item.status === 'paid').length

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Kepemilikan / Bagi Hasil"
        title={`${distribution.period_start} — ${distribution.period_end}`}
        description={offering ? `${offering.name} · ${offering.code}` : 'Distribusi bagi hasil'}
        actions={<div className="flex flex-wrap gap-2"><Link href="/admin/profit-distributions" className="border-border rounded-lg border px-3 py-2 text-sm">Kembali</Link><Link href="/admin/profit-distributions" className="text-body-sm text-link self-center hover:underline">Pembayaran</Link></div>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardBody><p className="text-caption text-fg-subtle">Status</p><p className="mt-1 font-semibold">{distribution.status}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Pendapatan</p><p className="mt-1 font-semibold tabular">{money(distribution.revenue_amount)}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">OPEX</p><p className="mt-1 font-semibold tabular">{money(distribution.opex_amount)}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Profit</p><p className="mt-1 font-semibold tabular">{money(distribution.profit_amount)}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-fg-subtle">Pool investor</p><p className="mt-1 font-semibold tabular">{money(distribution.investor_pool_amount)}</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Lifecycle distribusi</CardTitle></CardHeader>
        <CardBody className="grid gap-4">
          <div className="grid gap-3 text-body-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Porsi perusahaan: <strong>{pct(distribution.company_share_bps)}</strong></p>
            <p>Pool investor: <strong>{pct(distribution.investor_pool_bps)}</strong></p>
            <p>Allocation: <strong>{allocations?.length ?? 0}</strong></p>
            <p>Payable / Paid: <strong>{payable} / {paid}</strong></p>
          </div>
          <ProfitDistributionLifecycleActions distributionId={distribution.id} status={distribution.status} permissions={[...principal.permissions]} />
          {distribution.notes ? <p className="text-body-sm text-fg-muted whitespace-pre-wrap">{distribution.notes}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Allocation Investor</CardTitle></CardHeader>
        <CardBody>
          {!allocations?.length ? (
            <EmptyState title="Allocation belum dihitung" description="Gunakan tombol Hitung ulang allocation sebelum mengirim distribusi untuk review." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-body-sm">
                <thead><tr className="border-border border-b text-left"><th className="p-3">Investor</th><th className="p-3">Kepemilikan</th><th className="p-3">Porsi pool</th><th className="p-3 text-right">Allocation</th><th className="p-3">Status</th></tr></thead>
                <tbody>{allocations.map((item) => <tr key={item.id} className="border-border border-b last:border-0"><td className="p-3 font-mono text-xs">{item.investor_id}</td><td className="p-3">{pct(item.ownership_bps)}</td><td className="p-3">{pct(item.investor_pool_share_bps)}</td><td className="p-3 text-right tabular">{money(item.allocation_amount)}</td><td className="p-3">{item.status}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {allocations?.length ? <p className="text-caption text-fg-subtle mt-3 text-right">Total allocation: {money(totalAllocated)}</p> : null}
        </CardBody>
      </Card>
    </Stack>
  )
}
