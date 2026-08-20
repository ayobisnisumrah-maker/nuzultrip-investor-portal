import { AdminModulePage } from '@/features/admin/admin-module-page'
import { OwnershipOfferingCreateForm } from '@/features/admin/ownership/ownership-offering-create-form'
import { adminWithPermission } from '@/server/auth/page-guards'

export default async function NewOwnershipOfferingPage() {
  const principal = await adminWithPermission(
    'ownership_offerings.create',
    '/admin/ownership/offerings/new',
  )

  return (
    <AdminModulePage
      eyebrow="Kepemilikan"
      title="Buat Penawaran Kepemilikan"
      description="Buat konfigurasi penawaran kepemilikan baru yang akan tersimpan sebagai draft."
      permission="ownership_offerings.create"
      allowed={principal !== null}
    >
      <OwnershipOfferingCreateForm />
    </AdminModulePage>
  )
}
