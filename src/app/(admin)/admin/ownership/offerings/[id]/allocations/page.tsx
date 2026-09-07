import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'

import { OwnershipAllocationPanel } from '@/features/admin/ownership/ownership-allocation-panel'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getOwnershipOffering } from '@/server/ownership/offering-service'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { PageHeader, Stack } from '@/ui/layout'

const uuidSchema = z.uuid()

export default async function OwnershipOfferingAllocationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()

  const principal = await adminWithPermission('ownership.view', `/admin/ownership/offerings/${id}/allocations`)
  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk melihat alokasi kepemilikan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const offering = await getOwnershipOffering(supabase, id)
  if (!offering) notFound()

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Kepemilikan / Penawaran"
        title={`Alokasi · ${offering.name}`}
        description="Alokasikan unit penawaran kepada investor dan pantau seluruh holding yang berasal dari penawaran ini."
        actions={
          <Button asChild variant="secondary">
            <Link href={`/admin/ownership/offerings/${id}`}>Kembali ke Penawaran</Link>
          </Button>
        }
      />

      <OwnershipAllocationPanel
        offeringId={offering.id}
        offeringStatus={offering.status}
        totalUnits={Number(offering.total_units)}
        unitOwnershipBps={Number(offering.unit_ownership_bps)}
        canCreate={principal.permissions.has('ownership.create')}
      />
    </Stack>
  )
}
