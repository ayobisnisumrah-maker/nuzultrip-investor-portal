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
        section:has(img[alt='Agen Nuzultrip']) > div > div {
          grid-template-columns: 0.2fr 0.8fr !important;
          gap: 32px !important;
        }

        section:has(img[alt='Agen Nuzultrip']) div:has(> img[alt='Agen Nuzultrip']),
        section:has(img[alt='Agen Nuzultrip']) div:has(> img[alt='Mitra Travel']),
        section:has(img[alt='Agen Nuzultrip']) div:has(> img[alt='Mitra Layanan']),
        section:has(img[alt='Agen Nuzultrip']) div:has(> img[alt='Land Arrangement']),
        section:has(img[alt='Agen Nuzultrip']) div:has(> img[alt='Mitra Strategis']) {
          min-height: 118px !important;
          overflow: visible !important;
        }

        img[alt='Agen Nuzultrip'],
        img[alt='Mitra Travel'],
        img[alt='Mitra Layanan'],
        img[alt='Land Arrangement'],
        img[alt='Mitra Strategis'] {
          width: 220px !important;
          max-width: none !important;
          height: 100px !important;
          max-height: none !important;
          object-fit: contain !important;
          transform: scale(1.22);
          transform-origin: center;
        }

        @media (max-width: 1000px) {
          section:has(img[alt='Agen Nuzultrip']) > div > div {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }

          img[alt='Agen Nuzultrip'],
          img[alt='Mitra Travel'],
          img[alt='Mitra Layanan'],
          img[alt='Land Arrangement'],
          img[alt='Mitra Strategis'] {
            width: 210px !important;
            height: 94px !important;
            transform: scale(1.18);
          }
        }

        @media (max-width: 560px) {
          img[alt='Agen Nuzultrip'],
          img[alt='Mitra Travel'],
          img[alt='Mitra Layanan'],
          img[alt='Land Arrangement'],
          img[alt='Mitra Strategis'] {
            width: 220px !important;
            height: 100px !important;
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
