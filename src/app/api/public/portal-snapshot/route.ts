import { NextResponse } from 'next/server'

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

export async function GET() {
  const [portal, navigation, publicDocuments, brandLogoUrl] = await Promise.all([
    getPublishedHomePage(),
    getPublishedNavigation(),
    getPublicDocuments(),
    getPublicBrandLogo(),
  ])

  const functionalNavigation = navigation.filter((item) => {
    const href = item.href.trim()
    return Boolean(href && href !== '#')
  })

  return NextResponse.json(
    {
      portal: portal
        ? {
            page: { title: 'Nuzultrip', seo: portal.page.seo },
            sections: portal.sections.filter((section) => HOME_SECTION_KINDS.has(section.section_kind)),
          }
        : null,
      navigation: functionalNavigation,
      publicDocuments,
      brandLogoUrl,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
