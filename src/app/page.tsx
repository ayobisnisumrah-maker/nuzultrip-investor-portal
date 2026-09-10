import type { Metadata } from 'next'

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

  if (!portal) {
    return {
      title: 'Nuzultrip Equity Relations',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const seo =
    portal.page.seo &&
    typeof portal.page.seo === 'object' &&
    !Array.isArray(portal.page.seo)
      ? (portal.page.seo as Record<string, unknown>)
      : {}

  const title =
    typeof seo.title === 'string' && seo.title.trim()
      ? seo.title.trim()
      : portal.page.title

  const description =
    typeof seo.description === 'string' && seo.description.trim()
      ? seo.description.trim()
      : undefined

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      type: 'website',
    },
  }
}

export default async function Home() {
  const [portal, navigation, publicDocuments, brandLogoUrl] = await Promise.all([
    getPublishedHomePage(),
    getPublishedNavigation(),
    getPublicDocuments(),
    getPublicBrandLogo(),
  ])

  if (!portal) {
    return (
      <PublicRealtimeSurface>
        <main
          id="main"
          className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16"
        >
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            Nuzultrip Equity Relations
          </p>

          <h1 className="font-display text-fg mt-3 text-4xl font-semibold">
            Portal belum diterbitkan
          </h1>

          <p className="text-fg-muted mt-4 max-w-2xl text-lg leading-8">
            Halaman publik belum tersedia. Konten akan ditampilkan setelah diterbitkan melalui dasbor admin.
          </p>
        </main>
      </PublicRealtimeSurface>
    )
  }

  const homepageSections = portal.sections.filter((section) =>
    HOME_SECTION_KINDS.has(section.section_kind),
  )

  const functionalNavigation = navigation.filter((item) => {
    const href = item.href.trim()
    return Boolean(href && href !== '#')
  })

  return (
    <PublicRealtimeSurface>
      <style>{`
        img[alt='Agen Nuzultrip'],
        img[alt='Mitra Travel'],
        img[alt='Mitra Layanan'],
        img[alt='Land Arrangement'],
        img[alt='Mitra Strategis'] {
          width: 200px !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 82px !important;
          object-fit: contain !important;
          transform: scale(1.18);
          transform-origin: center;
        }

        @media (max-width: 820px) {
          img[alt='Agen Nuzultrip'],
          img[alt='Mitra Travel'],
          img[alt='Mitra Layanan'],
          img[alt='Land Arrangement'],
          img[alt='Mitra Strategis'] {
            width: 170px !important;
            max-height: 72px !important;
            transform: scale(1.12);
          }
        }

        @media (max-width: 560px) {
          img[alt='Agen Nuzultrip'],
          img[alt='Mitra Travel'],
          img[alt='Mitra Layanan'],
          img[alt='Land Arrangement'],
          img[alt='Mitra Strategis'] {
            width: 180px !important;
            max-height: 74px !important;
            transform: none;
          }
        }
      `}</style>

      <PublicPortalExact
        page={{
          title: 'Nuzultrip',
          seo: portal.page.seo,
        }}
        sections={homepageSections}
        navigation={functionalNavigation}
        publicDocuments={publicDocuments}
        brandLogoUrl={brandLogoUrl}
      />
    </PublicRealtimeSurface>
  )
}
