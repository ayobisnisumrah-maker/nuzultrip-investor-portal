import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import {
  listProfitDistributionAllocations,
  listProfitDistributions,
} from '@/server/ownership/profit-distribution-service'
import { ProfitDistributionManager } from '@/features/admin/profit-distribution-manager'

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
          Permission: <code>profit_distributions.view</code>
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

  return (
    <ProfitDistributionManager
      distributions={visibleDistributions}
      allocationsByDistribution={allocationsByDistribution}
      permissions={{
        uploadProof: principal.permissions.has('profit_distribution_payments.upload_proof'),
        replaceProof: principal.permissions.has('profit_distribution_payments.replace_proof'),
        markPaid: principal.permissions.has('profit_distribution_payments.mark_paid'),
      }}
    />
  )
}
