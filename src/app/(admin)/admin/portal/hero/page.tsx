import { PortalModulePage } from '@/features/admin/portal-module-page'

export default async function PortalHeroPage() {
  return PortalModulePage({
    kind: 'hero_3d',
    title: 'Hero',
    description: 'Kelola judul utama, deskripsi, dan tombol ajakan pada bagian teratas portal publik.',
    permission: 'portal.manage_hero',
    returnPath: '/admin/portal/hero',
  })
}
