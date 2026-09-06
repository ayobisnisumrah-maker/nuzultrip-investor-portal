import { openPortalContentEditor } from '@/features/admin/portal-content-shortcut'

export default async function PortalHeroPage() {
  return openPortalContentEditor({
    permission: 'portal.manage_hero',
    returnPath: '/admin/portal/hero',
  })
}
