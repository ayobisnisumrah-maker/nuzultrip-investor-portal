import { PortalModulePage } from '@/features/admin/portal-module-page'

export default async function PortalCtaPage() {
  return PortalModulePage({
    kind: 'contact_cta',
    title: 'CTA',
    description: 'Kelola ajakan tindakan dan kanal komunikasi yang ditampilkan pada portal publik.',
    permission: 'portal.manage_cta',
    returnPath: '/admin/portal/cta',
  })
}
