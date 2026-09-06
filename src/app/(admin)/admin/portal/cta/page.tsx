import { openPortalContentEditor } from '@/features/admin/portal-content-shortcut'

export default async function PortalCtaPage() {
  return openPortalContentEditor({
    permission: 'portal.manage_cta',
    returnPath: '/admin/portal/cta',
  })
}
