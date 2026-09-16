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

  if (!portal) {
    return {
      title: 'Nuzultrip Equity Relations',
      robots: { index: false, follow: false },
    }
  }

  const seo =
    portal.page.seo && typeof portal.page.seo === 'object' && !Array.isArray(portal.page.seo)
      ? (portal.page.seo as Record<string, unknown>)
      : {}

  const title =
    typeof seo.title === 'string' && seo.title.trim() ? seo.title.trim() : portal.page.title
  const description =
    typeof seo.description === 'string' && seo.description.trim()
      ? seo.description.trim()
      : undefined

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: { title, ...(description ? { description } : {}), type: 'website' },
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
        <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            Nuzultrip Equity Relations
          </p>
          <h1 className="font-display text-fg mt-3 text-4xl font-semibold">Portal belum diterbitkan</h1>
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
          grid-template-columns: 0.24fr 0.76fr !important;
          gap: 48px !important;
        }

        section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
          position: static !important;
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 24px !important;
          align-items: stretch !important;
          padding: 0 !important;
        }

        section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child > div {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 176px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 18px !important;
          overflow: hidden !important;
          padding: 26px 18px !important;
          background: #f8f8f7 !important;
          color: #111 !important;
          font-size: 0.92rem !important;
          font-weight: 500 !important;
          text-align: center !important;
        }

        section:has(img[alt='Agen Nuzultrip']) div:has(> img[alt='Agen Nuzultrip'])::after { content: 'Agen Nuzultrip'; }
        section:has(img[alt='Mitra Travel']) div:has(> img[alt='Mitra Travel'])::after { content: 'Mitra Travel'; }
        section:has(img[alt='Mitra Layanan']) div:has(> img[alt='Mitra Layanan'])::after { content: 'Mitra Layanan'; }
        section:has(img[alt='Land Arrangement']) div:has(> img[alt='Land Arrangement'])::after { content: 'Land Arrangement'; }
        section:has(img[alt='Mitra Strategis']) div:has(> img[alt='Mitra Strategis'])::after { content: 'Mitra Strategis'; }

        section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) div:has(> img[alt])::after {
          display: block;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        img[alt='Agen Nuzultrip'],
        img[alt='Mitra Travel'],
        img[alt='Mitra Layanan'],
        img[alt='Land Arrangement'],
        img[alt='Mitra Strategis'] {
          display: block !important;
          width: 54px !important;
          height: 54px !important;
          max-width: 54px !important;
          max-height: 54px !important;
          object-fit: cover !important;
          object-position: left center !important;
          transform: none !important;
          filter: grayscale(1) !important;
        }

        @media (max-width: 1200px) {
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 20px !important;
          }
        }

        @media (max-width: 820px) {
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
          }
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 560px) {
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          section:has(img[alt='Agen Nuzultrip'], img[alt='Mitra Travel'], img[alt='Mitra Layanan'], img[alt='Land Arrangement'], img[alt='Mitra Strategis']) > div > div > div:last-child > div {
            min-height: 156px !important;
            padding: 22px 16px !important;
          }
        }
      `}</style>

      <PublicPortalExact
        page={{ title: 'Nuzultrip', seo: portal.page.seo }}
        sections={homepageSections}
        navigation={functionalNavigation}
        publicDocuments={publicDocuments}
        brandLogoUrl={brandLogoUrl}
      />
      <PublicConnectLinks navigation={functionalNavigation} />
    </PublicRealtimeSurface>
  )
}
