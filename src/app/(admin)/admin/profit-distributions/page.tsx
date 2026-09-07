import Link from 'next/link'

import { topics } from '@/core/realtime/events'
import { ProfitDistributionManager } from '@/features/admin/profit-distribution-manager'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { adminWithPermission } from '@/server/auth/page-guards'
import {
  listProfitDistributionAllocations,
  listProfitDistributions,
} from '@/server/ownership/profit-distribution-service'
import { getServerSupabase } from '@/server/supabase/server'

export default async function ProfitDistributionsPage() {
  const principal = await adminWithPermission(
    'profit_distributions.view',
    '/admin/profit-distributions',
  )

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk melihat distribusi bagi hasil.
        </p>
        <p className="text-caption text-fg-subtle mt-3">
          Izin sistem: <code>profit_distributions.view</code>
        </p>
      </div>
    )
  }

  const supabase = await getServerSupabase()
  const distributions = await listProfitDistributions(supabase)
  const visibleDistributions = distributions.slice(0, 50)
  const allocationsEntries = await Promise.all(
    visibleDistributions.map(async (distribution) => {
      const allocations = await listProfitDistributionAllocations(supabase, distribution.id)
      return [distribution.id, allocations] as const
    }),
  )
  const allocationsByDistribution = Object.fromEntries(allocationsEntries)
  const allocationIds = allocationsEntries.flatMap(([, allocations]) =>
    allocations.map((allocation) => allocation.id),
  )

  const { data: proofRows } = allocationIds.length
    ? await supabase
        .from('profit_distribution_payment_proofs')
        .select('allocation_id')
        .in('allocation_id', allocationIds)
    : { data: [] }

  const proofAllocationIds = (proofRows ?? []).map((proof) => proof.allocation_id)

  return (
    <div className="space-y-5">
      <RealtimeRefresher topic={topics.admin()} kinds={['profit_distribution.changed']} />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {visibleDistributions.slice(0, 5).map((distribution) => (
          <Link
            key={distribution.id}
            href={`/admin/profit-distributions/${distribution.id}`}
            className="border-border text-body-sm text-fg hover:bg-surface-muted rounded-lg border px-3 py-2 font-medium"
          >
            Detail periode {new Date(distribution.period_end).toLocaleDateString('id-ID')}
          </Link>
        ))}
        {principal.permissions.has('profit_distributions.create') ? (
          <Link
            href="/admin/profit-distributions/new"
            className="bg-primary-solid text-primary-fg inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
          >
            + Distribusi Baru
          </Link>
        ) : null}
      </div>
      <ProfitDistributionManager
        distributions={visibleDistributions}
        allocationsByDistribution={allocationsByDistribution}
        proofAllocationIds={proofAllocationIds}
        permissions={{
          uploadProof: principal.permissions.has('profit_distribution_payments.upload_proof'),
          replaceProof: principal.permissions.has('profit_distribution_payments.replace_proof'),
          markPaid: principal.permissions.has('profit_distribution_payments.mark_paid'),
        }}
      />
    </div>
  )
}
