import type { Metadata } from 'next'

import { PublicRealtimeSurface } from '@/features/realtime/public-realtime-surface'
import { getPublicBrandLogo } from '@/server/portal/public-branding'
import { getPublicDocuments, getPublishedHomePage, getPublishedNavigation } from '@/server/portal/public-queries'

const HOME_SECTION_KINDS = new Set(['hero_3d','intro','vision_mission','business_overview','growth_story','ecosystem','investment_info','milestones','strategic_direction','financial_highlights','investor_updates','documents','legal_notice','rich_content','stat_grid','logo_wall','faq'])

export async function generateMetadata(): Promise<Metadata> {
  const portal = await getPublishedHomePage()
  if (!portal) return { title: 'Nuzultrip Equity Relations', robots: { index: false, follow: false } }

  const seo = portal.page.seo && typeof portal.page.seo === 'object' && !Array.isArray(portal.page.seo)
    ? (portal.page.seo as Record<string, unknown>) : {}
  const title = typeof seo.title === 'string' && seo.title.trim() ? seo.title.trim() : portal.page.title
  const description = typeof seo.description === 'string' && seo.description.trim() ? seo.description.trim() : undefined
  return { title, description, robots: { index: true, follow: true }, openGraph: { title, ...(description ? { description } : {}), type: 'website' } }
}

export default async function Home() {
  const [portal, navigation, publicDocuments, brandLogoUrl] = await Promise.all([
    getPublishedHomePage(), getPublishedNavigation(), getPublicDocuments(), getPublicBrandLogo(),
  ])
  const homepageSections = portal?.sections.filter((section) => HOME_SECTION_KINDS.has(section.section_kind)) ?? []
  const functionalNavigation = navigation.filter((item) => {
    const href = item.href.trim()
    return Boolean(href && href !== '#')
  })

  return <PublicRealtimeSurface initialSnapshot={{
    portal: portal ? { page: { title: 'Nuzultrip', seo: portal.page.seo }, sections: homepageSections } : null,
    navigation: functionalNavigation,
    publicDocuments,
    brandLogoUrl,
  }} />
}
