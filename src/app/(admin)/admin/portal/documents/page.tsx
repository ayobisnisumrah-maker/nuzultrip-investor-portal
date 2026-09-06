import { openPortalContentEditor } from '@/features/admin/portal-content-shortcut'

export default async function PortalDocumentsPage() {
  return openPortalContentEditor({
    permission: 'portal.view',
    returnPath: '/admin/portal/documents',
  })
}
