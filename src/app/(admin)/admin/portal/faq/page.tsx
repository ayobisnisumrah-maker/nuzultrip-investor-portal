import { openPortalContentEditor } from '@/features/admin/portal-content-shortcut'

export default async function PortalFaqPage() {
  return openPortalContentEditor({
    permission: 'portal.view',
    returnPath: '/admin/portal/faq',
  })
}
