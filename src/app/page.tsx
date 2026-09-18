import type { Metadata } from 'next'

import { PublicConnectLinks } from '@/features/portal/public-connect-links'
import { PublicPortalExact } from '@/features/portal/public-portal-exact'
import { PublicRealtimeSurface } from '@/features/realtime/public-realtime-surface'
import { getPublicBrandLogo } from '@/server/portal/public-branding'
import {
  getPublicDocuments,
  getPublishedHomePage,
  getPublishedNavigation,
} from '@/server/portal/public-queries'

const HOME_SECTION_KINDS = new Set([
  'hero_3d',
  'intro',
  'vision_mission',
  'business_overview',
  'growth_story',
  'ecosystem',
  'investment_info',
  'milestones',
  'strategic_direction',
  'financial_highlights',
  'investor_updates',
  'documents',
  'legal_notice',
  'rich_content',
  'stat_grid',
  'logo_wall',
  'faq',
])

export async function generateMetadata(): Promise<Metadata> {
  const portal = await getPublishedHomePage()

  const homepageSections = portal.sections.filter((section) =>
    HOME_SECTION_KINDS.has(section.section_kind),
  )

  const functionalNavigation = navigation.filter((item) => {
    const href = item.href.trim()
    return Boolean(href && href !== '#')
  })

  return (
    <PublicRealtimeSurface
      initialSnapshot={{
        portal: portal
          ? { page: { title: 'Nuzultrip', seo: portal.page.seo }, sections: homepageSections }
          : null,
        navigation: functionalNavigation,
        publicDocuments,
        brandLogoUrl,
      }}
    />
  )
}
