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
        section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div {
          grid-template-columns: 0.18fr 0.82fr !important;
          gap: 44px !important;
        }

        section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
          position: relative !important;
          left: 24px !important;
          width: calc(100% - 24px) !important;
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)) !important;
          column-gap: 38px !important;
          row-gap: 28px !important;
          align-items: center !important;
          justify-items: center !important;
          overflow: visible !important;
          padding: 4px 18px !important;
        }

        section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child > div {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 156px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: visible !important;
          padding-inline: 18px !important;
        }

        img[alt='Agen Nuzultrip'],
        img[alt='Mitra Travel'],
        img[alt='Mitra Layanan'],
        img[alt='Land Arrangement'],
        img[alt='Mitra Strategis'] {
          width: 248px !important;
          max-width: none !important;
          height: 118px !important;
          max-height: none !important;
          object-fit: contain !important;
          transform: scale(1.25) !important;
          transform-origin: center !important;
        }

        @media (max-width: 1200px) {
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
            left: 12px !important;
            width: calc(100% - 12px) !important;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
            column-gap: 30px !important;
            row-gap: 24px !important;
          }

          img[alt='Agen Nuzultrip'],
          img[alt='Mitra Travel'],
          img[alt='Mitra Layanan'],
          img[alt='Land Arrangement'],
          img[alt='Mitra Strategis'] {
            width: 232px !important;
            height: 112px !important;
            transform: scale(1.19) !important;
          }
        }

        @media (max-width: 820px) {
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
          }

          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
            left: 0 !important;
            width: 100% !important;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
            gap: 20px !important;
            padding-inline: 0 !important;
          }
        }

        @media (max-width: 560px) {
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          img[alt='Agen Nuzultrip'],
          img[alt='Mitra Travel'],
          img[alt='Mitra Layanan'],
          img[alt='Land Arrangement'],
          img[alt='Mitra Strategis'] {
            width: 248px !important;
            height: 116px !important;
            transform: scale(1.14) !important;
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
