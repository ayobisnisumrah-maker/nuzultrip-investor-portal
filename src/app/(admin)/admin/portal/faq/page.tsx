import { PortalModulePage } from '@/features/admin/portal-module-page'

export default async function PortalFaqPage() {
  return PortalModulePage({
    kind: 'faq',
    title: 'FAQ',
    description: 'Kelola pertanyaan dan jawaban yang ditampilkan kepada pengunjung portal publik.',
    permission: 'portal.update',
    returnPath: '/admin/portal/faq',
  })
}
