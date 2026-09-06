import { PortalModulePage } from '@/features/admin/portal-module-page'

export default async function PortalDocumentsPage() {
  return PortalModulePage({
    kind: 'documents',
    title: 'Dokumen Portal',
    description: 'Kelola daftar dokumen publik beserta nama, deskripsi, dan tautan dokumennya.',
    permission: 'portal.update',
    returnPath: '/admin/portal/documents',
  })
}
