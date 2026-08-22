import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { OwnershipOfferingManager } from '@/features/admin/ownership/ownership-offering-manager'
import { listOwnershipOfferings } from '@/server/ownership/offering-service'

export default async function OwnershipOfferingsPage() {
  const principal = await adminWithPermission(
    'ownership_offerings.view',
    '/admin/ownership/offerings',
  )

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk mengakses modul ini.
        </p>

        <p className="text-caption text-fg-subtle mt-3">
          Permission: <code>ownership_offerings.view</code>
        </p>
      </div>
    )
  }

  const supabase = await getServerSupabase()
  const offerings = await listOwnershipOfferings(supabase)

  return (
    <div className="space-y-6">
      <OwnershipOfferingManager offerings={offerings} />
    </div>
  )
}
